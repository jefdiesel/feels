package api

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/feels/feels/internal/api/handlers"
	"github.com/feels/feels/internal/api/middleware"
	"github.com/feels/feels/internal/config"
	"github.com/feels/feels/internal/domain/credit"
	"github.com/feels/feels/internal/domain/feed"
	"github.com/feels/feels/internal/domain/match"
	"github.com/feels/feels/internal/domain/message"
	"github.com/feels/feels/internal/domain/moderation"
	"github.com/feels/feels/internal/domain/notification"
	"github.com/feels/feels/internal/domain/payment"
	"github.com/google/uuid"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/feels/feels/internal/domain/settings"
	"github.com/feels/feels/internal/domain/user"
	"github.com/feels/feels/internal/email"
	"github.com/feels/feels/internal/repository"
	"github.com/feels/feels/internal/storage"
	"github.com/feels/feels/internal/websocket"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Router struct {
	mux    *chi.Mux
	config *config.Config
	db     *pgxpool.Pool
	redis  *redis.Client
	authMw *middleware.AuthMiddleware
	hub    *websocket.Hub
}

// moderationAdapter adapts the moderation.Service to the message.ModerationService interface
type moderationAdapter struct {
	svc *moderation.Service
}

func (a *moderationAdapter) CheckContent(ctx context.Context, userID uuid.UUID, messageID *uuid.UUID, content string) error {
	_, err := a.svc.CheckContent(ctx, userID, messageID, content)
	return err
}

func NewRouter(cfg *config.Config, db *pgxpool.Pool, redisClient *redis.Client) *Router {
	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	profileRepo := repository.NewProfileRepository(db)
	feedRepo := repository.NewFeedRepository(db)
	matchRepo := repository.NewMatchRepository(db)
	blockRepo := repository.NewBlockRepository(db)
	messageRepo := repository.NewMessageRepository(db)
	creditRepo := repository.NewCreditRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	notificationSettingsRepo := repository.NewNotificationSettingsRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	analyticsRepo := repository.NewAnalyticsRepository(db)
	moderationRepo := repository.NewModerationRepository(db)
	adminRepo := repository.NewAdminRepository(db)

	// Ensure passes table exists
	if err := feedRepo.EnsurePassesTable(context.Background()); err != nil {
		log.Printf("Warning: Failed to ensure passes table: %v", err)
	}

	// Ensure settings tables exist
	if err := settingsRepo.EnsureTables(context.Background()); err != nil {
		log.Printf("Warning: Failed to ensure settings tables: %v", err)
	}

	// Ensure notification tables exist
	if err := notificationRepo.EnsureTables(context.Background()); err != nil {
		log.Printf("Warning: Failed to ensure notification tables: %v", err)
	}

	// Ensure payment tables exist
	if err := paymentRepo.EnsureTables(context.Background()); err != nil {
		log.Printf("Warning: Failed to ensure payment tables: %v", err)
	}

	// Initialize S3 storage
	s3Client, err := storage.NewS3Client(storage.S3Config{
		Endpoint:  cfg.S3.Endpoint,
		AccessKey: cfg.S3.AccessKey,
		SecretKey: cfg.S3.SecretKey,
		Bucket:    cfg.S3.Bucket,
		UseSSL:    cfg.S3.UseSSL,
	})
	if err != nil {
		log.Printf("Warning: Failed to initialize S3 client: %v", err)
	} else {
		if err := s3Client.EnsureBucket(context.Background()); err != nil {
			log.Printf("Warning: Failed to ensure S3 bucket: %v", err)
		}
	}

	// Initialize services
	userService := user.NewService(
		userRepo,
		cfg.JWT.Secret,
		cfg.JWT.AccessExpiry,
		cfg.JWT.RefreshExpiry,
	)

	profileService := profile.NewService(profileRepo, s3Client)
	// Payment service is initialized later and will be set on profile service
	creditService := credit.NewService(creditRepo)
	notificationService := notification.NewService(notificationRepo, notificationSettingsRepo)

	feedService := feed.NewService(feedRepo, profileRepo, matchRepo, 100)
	feedService.SetCreditService(creditService)
	feedService.SetHub(hub)
	feedService.SetNotificationService(notificationService)
	feedService.SetAnalyticsRepository(analyticsRepo)
	matchService := match.NewService(matchRepo, blockRepo)
	matchService.SetMessageRepository(messageRepo)
	matchService.SetHub(hub)
	messageService := message.NewService(messageRepo, matchRepo, hub)
	messageService.SetNotificationService(notificationService)
	messageService.SetProfileRepository(profileRepo)

	// Initialize moderation service
	moderationService := moderation.NewService(moderationRepo, moderation.Config{
		Enabled:         cfg.Moderation.Enabled,
		APIKey:          cfg.OpenAI.APIKey,
		BlockThreshold:  cfg.Moderation.BlockThreshold,
		ReviewThreshold: cfg.Moderation.ReviewThreshold,
	})
	messageService.SetModerationService(&moderationAdapter{svc: moderationService})
	settingsService := settings.NewService(settingsRepo)
	paymentService := payment.NewService(paymentRepo, userRepo, payment.Config{
		SecretKey:        cfg.Stripe.SecretKey,
		WebhookSecret:    cfg.Stripe.WebhookSecret,
		MonthlyPriceID:   cfg.Stripe.MonthlyPriceID,
		QuarterlyPriceID: cfg.Stripe.QuarterlyPriceID,
		AnnualPriceID:    cfg.Stripe.AnnualPriceID,
	})

	// Set payment service as subscription checker for profile verification
	profileService.SetSubscriptionChecker(paymentService)

	// Initialize email service
	emailService := email.NewService(email.Config{
		APIKey:    cfg.Email.APIKey,
		FromEmail: cfg.Email.FromEmail,
		FromName:  cfg.Email.FromName,
	})

	// Initialize middleware
	authMw := middleware.NewAuthMiddleware(userService)
	adminMw := middleware.NewAdminMiddleware(userRepo)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db, redisClient)
	authHandler := handlers.NewAuthHandler(userService, emailService, cfg.IsDevelopment())
	profileHandler := handlers.NewProfileHandler(profileService)
	feedHandler := handlers.NewFeedHandler(feedService)
	feedHandler.SetSubscriptionChecker(paymentService)
	matchHandler := handlers.NewMatchHandler(matchService)
	messageHandler := handlers.NewMessageHandler(messageService, hub, s3Client)
	creditHandler := handlers.NewCreditHandler(creditService)
	settingsHandler := handlers.NewSettingsHandler(settingsService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	paymentHandler := handlers.NewPaymentHandler(paymentService, cfg.Stripe.WebhookSecret)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsRepo, paymentService)
	adminHandler := handlers.NewAdminHandler(adminRepo, userRepo)

	r := &Router{
		mux:    chi.NewRouter(),
		config: cfg,
		db:     db,
		redis:  redisClient,
		authMw: authMw,
		hub:    hub,
	}

	r.setupMiddleware()
	r.setupRoutes(healthHandler, authHandler, profileHandler, feedHandler, matchHandler, messageHandler, creditHandler, settingsHandler, notificationHandler, paymentHandler, analyticsHandler, adminHandler, adminMw)

	return r
}

func (r *Router) setupMiddleware() {
	r.mux.Use(chimiddleware.RequestID)
	r.mux.Use(chimiddleware.RealIP)
	r.mux.Use(chimiddleware.Logger)
	r.mux.Use(chimiddleware.Recoverer)
	r.mux.Use(chimiddleware.Timeout(30 * time.Second))

	r.mux.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*", "https://*.feels.app"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
}

func (r *Router) setupRoutes(
	healthHandler *handlers.HealthHandler,
	authHandler *handlers.AuthHandler,
	profileHandler *handlers.ProfileHandler,
	feedHandler *handlers.FeedHandler,
	matchHandler *handlers.MatchHandler,
	messageHandler *handlers.MessageHandler,
	creditHandler *handlers.CreditHandler,
	settingsHandler *handlers.SettingsHandler,
	notificationHandler *handlers.NotificationHandler,
	paymentHandler *handlers.PaymentHandler,
	analyticsHandler *handlers.AnalyticsHandler,
	adminHandler *handlers.AdminHandler,
	adminMw *middleware.AdminMiddleware,
) {
	// Health check routes (no auth required)
	r.mux.Get("/health", healthHandler.Health)
	r.mux.Get("/ready", healthHandler.Ready)
	r.mux.Get("/live", healthHandler.Live)

	// API v1 routes
	r.mux.Route("/api/v1", func(router chi.Router) {
		// Auth routes (public)
		router.Route("/auth", func(auth chi.Router) {
			auth.Post("/register", authHandler.Register)
			auth.Post("/login", authHandler.Login)
			auth.Post("/refresh", authHandler.Refresh)
			auth.Post("/logout", authHandler.Logout)

			// Magic link (passwordless) auth
			auth.Post("/magic/send", authHandler.SendMagicLink)
			auth.Post("/magic/verify", authHandler.VerifyMagicLink)
		})

		// Payment webhook (public - called by Stripe)
		router.Post("/payments/webhook", paymentHandler.Webhook)

		// Public payment routes (plans list)
		router.Get("/payments/plans", paymentHandler.GetPlans)

		// Protected routes
		router.Group(func(protected chi.Router) {
			protected.Use(r.authMw.Authenticate)

			// Profile routes
			protected.Route("/profile", func(p chi.Router) {
				p.Get("/", profileHandler.GetProfile)
				p.Post("/", profileHandler.CreateProfile)
				p.Put("/", profileHandler.UpdateProfile)
				p.Get("/preferences", profileHandler.GetPreferences)
				p.Put("/preferences", profileHandler.UpdatePreferences)
				p.Post("/photos", profileHandler.UploadPhoto)
				p.Delete("/photos/{id}", profileHandler.DeletePhoto)
				p.Put("/photos/reorder", profileHandler.ReorderPhotos)
				p.Post("/verify", profileHandler.VerifyProfile)
				p.Post("/verify/submit", profileHandler.SubmitVerification)
				p.Get("/analytics", analyticsHandler.GetProfileAnalytics)
			})

			// Feed routes
			protected.Route("/feed", func(f chi.Router) {
				f.Get("/", feedHandler.GetFeed)
				f.Get("/daily-picks", feedHandler.GetDailyPicks)
				f.Post("/like/{id}", feedHandler.Like)
				f.Post("/superlike/{id}", feedHandler.Superlike)
				f.Post("/superlike/{id}/message", feedHandler.SuperlikeWithMessage)
				f.Post("/pass/{id}", feedHandler.Pass)
				f.Post("/rewind", feedHandler.Rewind)
			})

			// Match routes
			protected.Route("/matches", func(m chi.Router) {
				m.Get("/", matchHandler.GetMatches)
				m.Get("/{id}", matchHandler.GetMatch)
				m.Delete("/{id}", matchHandler.Unmatch)
				m.Get("/{id}/messages", messageHandler.GetMessages)
				m.Post("/{id}/messages", messageHandler.SendMessage)
				m.Post("/{id}/images/enable", messageHandler.EnableImages)
				m.Post("/{id}/images/disable", messageHandler.DisableImages)
				m.Post("/{id}/images/upload", messageHandler.UploadImage)
				m.Post("/{id}/typing", messageHandler.Typing)
			})

			// Safety routes
			protected.Post("/block/{id}", matchHandler.Block)
			protected.Delete("/block/{id}", matchHandler.Unblock)
			protected.Post("/report/{id}", matchHandler.Report)

			// WebSocket
			protected.Get("/ws", messageHandler.HandleWebSocket)

			// Credits routes
			protected.Get("/credits", creditHandler.GetCredits)
			protected.Get("/subscription", creditHandler.GetSubscription)

			// Public key management for E2E encryption
			protected.Post("/keys/public", authHandler.SetPublicKey)
			protected.Get("/keys/public", authHandler.GetPublicKey)

			// Settings routes
			protected.Route("/settings", func(s chi.Router) {
				s.Get("/notifications", settingsHandler.GetNotificationSettings)
				s.Put("/notifications", settingsHandler.UpdateNotificationSettings)
				s.Get("/privacy", settingsHandler.GetPrivacySettings)
				s.Put("/privacy", settingsHandler.UpdatePrivacySettings)
			})

			// Push notification routes
			protected.Post("/push/register", notificationHandler.RegisterToken)
			protected.Delete("/push/register", notificationHandler.UnregisterToken)

			// Payment routes (protected)
			protected.Route("/payments", func(pay chi.Router) {
				pay.Post("/checkout", paymentHandler.CreateCheckout)
				pay.Post("/portal", paymentHandler.CreatePortal)
				pay.Get("/subscription", paymentHandler.GetSubscription)
				pay.Delete("/subscription", paymentHandler.CancelSubscription)
			})

			// Admin routes (protected + admin check)
			protected.Route("/admin", func(admin chi.Router) {
				admin.Use(adminMw.RequireAdmin)

				// Reports management
				admin.Get("/reports", adminHandler.GetPendingReports)
				admin.Post("/reports/{id}", adminHandler.ActionOnReport)

				// User management
				admin.Get("/users/{id}", adminHandler.GetUserDetails)
				admin.Post("/users/{id}/moderate", adminHandler.ModerateUser)

				// Verification queue
				admin.Get("/verification-queue", adminHandler.GetVerificationQueue)
				admin.Post("/verification/{id}", adminHandler.ActionOnVerification)

				// Content moderation queue
				admin.Get("/moderation-queue", adminHandler.GetModerationQueue)
				admin.Post("/moderation/{id}", adminHandler.ActionOnModeration)
			})
		})
	})
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.mux.ServeHTTP(w, req)
}

func notImplemented(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
