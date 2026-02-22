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
	"github.com/feels/feels/internal/domain/profile"
	"github.com/feels/feels/internal/domain/user"
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

	// Ensure passes table exists
	if err := feedRepo.EnsurePassesTable(context.Background()); err != nil {
		log.Printf("Warning: Failed to ensure passes table: %v", err)
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
	creditService := credit.NewService(creditRepo)
	feedService := feed.NewService(feedRepo, profileRepo, matchRepo, 100)
	feedService.SetCreditService(creditService)
	matchService := match.NewService(matchRepo, blockRepo)
	messageService := message.NewService(messageRepo, matchRepo, hub)

	// Initialize middleware
	authMw := middleware.NewAuthMiddleware(userService)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db, redisClient)
	authHandler := handlers.NewAuthHandler(userService)
	profileHandler := handlers.NewProfileHandler(profileService)
	feedHandler := handlers.NewFeedHandler(feedService)
	matchHandler := handlers.NewMatchHandler(matchService)
	messageHandler := handlers.NewMessageHandler(messageService, hub)
	creditHandler := handlers.NewCreditHandler(creditService)

	r := &Router{
		mux:    chi.NewRouter(),
		config: cfg,
		db:     db,
		redis:  redisClient,
		authMw: authMw,
		hub:    hub,
	}

	r.setupMiddleware()
	r.setupRoutes(healthHandler, authHandler, profileHandler, feedHandler, matchHandler, messageHandler, creditHandler)

	return r
}

func (r *Router) setupMiddleware() {
	r.mux.Use(chimiddleware.RequestID)
	r.mux.Use(chimiddleware.RealIP)
	r.mux.Use(chimiddleware.Logger)
	r.mux.Use(chimiddleware.Recoverer)
	r.mux.Use(chimiddleware.Timeout(30 * time.Second))

	r.mux.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:8082", "http://localhost:8081", "http://localhost:19006", "http://127.0.0.1:*", "https://*.feels.app"},
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
				p.Post("/verify", notImplemented)
			})

			// Feed routes
			protected.Route("/feed", func(f chi.Router) {
				f.Get("/", feedHandler.GetFeed)
				f.Post("/like/{id}", feedHandler.Like)
				f.Post("/superlike/{id}", feedHandler.Superlike)
				f.Post("/pass/{id}", feedHandler.Pass)
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
		})
	})
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.mux.ServeHTTP(w, req)
}

func notImplemented(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
