package profile

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidGender              = errors.New("invalid gender")
	ErrInvalidDOB                 = errors.New("invalid date of birth")
	ErrTooYoung                   = errors.New("must be 18 or older")
	ErrInvalidKinkLevel           = errors.New("invalid kink level")
	ErrProfileRequired            = errors.New("profile required")
	ErrInvalidPhotoType           = errors.New("invalid photo type, must be jpeg, png, gif, or webp")
	ErrPhotoTooLarge              = errors.New("photo too large, max 10MB")
	ErrVerificationUnavailable    = errors.New("verification requires quarterly or annual subscription")
	ErrAlreadyVerified            = errors.New("profile is already verified")
	ErrVerificationAlreadyPending = errors.New("verification already submitted and pending review")
)

type Repository interface {
	Create(ctx context.Context, p *Profile) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*Profile, error)
	Update(ctx context.Context, p *Profile) error
	UpdateLastActive(ctx context.Context, userID uuid.UUID) error
	GetPhotos(ctx context.Context, userID uuid.UUID) ([]Photo, error)
	AddPhoto(ctx context.Context, photo *Photo) error
	DeletePhoto(ctx context.Context, userID, photoID uuid.UUID) error
	ReorderPhotos(ctx context.Context, userID uuid.UUID, photoIDs []uuid.UUID) error
	CreatePreferences(ctx context.Context, p *Preferences) error
	GetPreferences(ctx context.Context, userID uuid.UUID) (*Preferences, error)
	UpdatePreferences(ctx context.Context, p *Preferences) error
	SetVerified(ctx context.Context, userID uuid.UUID, verified bool) error
	// Photo verification
	SetVerificationPhoto(ctx context.Context, userID uuid.UUID, photoURL, status string) error
	GetVerificationStatus(ctx context.Context, userID uuid.UUID) (string, error)
	GetPendingVerifications(ctx context.Context, limit int) ([]VerificationRequest, error)
	ApproveVerification(ctx context.Context, userID, adminID uuid.UUID) error
	RejectVerification(ctx context.Context, userID, adminID uuid.UUID) error
	// Share codes
	GetByShareCode(ctx context.Context, code string) (*Profile, error)
	GetOrCreateShareCode(ctx context.Context, userID uuid.UUID) (string, error)
}

// SubscriptionChecker checks if a user has a qualifying subscription for verification
type SubscriptionChecker interface {
	HasQualifyingSubscription(ctx context.Context, userID uuid.UUID) (bool, error)
}

type Storage interface {
	UploadPhoto(ctx context.Context, userID uuid.UUID, reader io.Reader, size int64, contentType string) (string, error)
	DeletePhoto(ctx context.Context, url string) error
}

type Service struct {
	repo        Repository
	storage     Storage
	subChecker  SubscriptionChecker
}

func NewService(repo Repository, storage Storage) *Service {
	return &Service{
		repo:    repo,
		storage: storage,
	}
}

// SetSubscriptionChecker sets the subscription checker for verification
func (s *Service) SetSubscriptionChecker(checker SubscriptionChecker) {
	s.subChecker = checker
}

func (s *Service) CreateProfile(ctx context.Context, userID uuid.UUID, req *CreateProfileRequest) (*Profile, error) {
	if !IsValidGender(req.Gender) {
		return nil, ErrInvalidGender
	}

	dob, err := time.Parse("2006-01-02", req.DOB)
	if err != nil {
		return nil, ErrInvalidDOB
	}

	age := calculateAge(dob)
	if age < 18 {
		return nil, ErrTooYoung
	}

	if req.KinkLevel != nil && !IsValidKinkLevel(*req.KinkLevel) {
		return nil, ErrInvalidKinkLevel
	}

	now := time.Now()
	prompts := Prompts{}
	if req.Prompts != nil {
		prompts = req.Prompts
	}

	profile := &Profile{
		UserID:       userID,
		Name:         req.Name,
		DOB:          dob,
		Gender:       req.Gender,
		ZipCode:      req.ZipCode,
		Neighborhood: req.Neighborhood,
		Bio:          req.Bio,
		Prompts:      prompts,
		KinkLevel:    req.KinkLevel,
		LookingFor:   req.LookingFor,
		Zodiac:       req.Zodiac,
		Religion:     req.Religion,
		HasKids:      req.HasKids,
		WantsKids:    req.WantsKids,
		Alcohol:      req.Alcohol,
		Weed:         req.Weed,
		Lat:          req.Lat,
		Lng:          req.Lng,
		IsVerified:   false,
		LastActive:   now,
		CreatedAt:    now,
		Photos:       []Photo{},
	}

	if err := s.repo.Create(ctx, profile); err != nil {
		return nil, err
	}

	// Create default preferences
	prefs := &Preferences{
		UserID:           userID,
		GendersSeeking:   []string{"woman", "man"},
		AgeMin:           18,
		AgeMax:           99,
		DistanceMiles:    25,
		IncludeTrans:     true,
		VisibleToGenders: []string{"woman", "man"},
		HardBlockGenders: []string{},
	}
	if err := s.repo.CreatePreferences(ctx, prefs); err != nil {
		return nil, err
	}

	return profile, nil
}

func (s *Service) GetProfile(ctx context.Context, userID uuid.UUID) (*ProfileResponse, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	prefs, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &ProfileResponse{
		Profile:     profile,
		Preferences: prefs,
		Age:         calculateAge(profile.DOB),
	}, nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID uuid.UUID, req *UpdateProfileRequest) (*Profile, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		profile.Name = *req.Name
	}
	if req.ZipCode != nil {
		profile.ZipCode = *req.ZipCode
	}
	if req.Neighborhood != nil {
		profile.Neighborhood = req.Neighborhood
	}
	if req.Bio != nil {
		profile.Bio = *req.Bio
	}
	if req.Prompts != nil {
		profile.Prompts = req.Prompts
	}
	if req.KinkLevel != nil {
		if !IsValidKinkLevel(*req.KinkLevel) {
			return nil, ErrInvalidKinkLevel
		}
		profile.KinkLevel = req.KinkLevel
	}
	if req.LookingFor != nil && len(req.LookingFor) > 0 {
		profile.LookingFor = req.LookingFor
	}
	if req.Zodiac != nil {
		profile.Zodiac = req.Zodiac
	}
	if req.Religion != nil {
		profile.Religion = req.Religion
	}
	if req.HasKids != nil {
		profile.HasKids = req.HasKids
	}
	if req.WantsKids != nil {
		profile.WantsKids = req.WantsKids
	}
	if req.Alcohol != nil {
		profile.Alcohol = req.Alcohol
	}
	if req.Weed != nil {
		profile.Weed = req.Weed
	}
	// Skip Android emulator default coords (Mountain View, CA ~37.42, -122.08)
	// This prevents emulator GPS from overwriting real user locations
	isMountainView := req.Lat != nil && req.Lng != nil &&
		*req.Lat > 37.4 && *req.Lat < 37.5 &&
		*req.Lng > -122.1 && *req.Lng < -122.0
	if !isMountainView {
		if req.Lat != nil {
			profile.Lat = req.Lat
		}
		if req.Lng != nil {
			profile.Lng = req.Lng
		}
	}

	if err := s.repo.Update(ctx, profile); err != nil {
		return nil, err
	}

	return profile, nil
}

func (s *Service) UpdatePreferences(ctx context.Context, userID uuid.UUID, req *UpdatePreferencesRequest) (*Preferences, error) {
	prefs, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.GendersSeeking != nil {
		prefs.GendersSeeking = req.GendersSeeking
	}
	if req.AgeMin != nil {
		prefs.AgeMin = *req.AgeMin
	}
	if req.AgeMax != nil {
		prefs.AgeMax = *req.AgeMax
	}
	if req.DistanceMiles != nil {
		prefs.DistanceMiles = *req.DistanceMiles
	}
	if req.IncludeTrans != nil {
		prefs.IncludeTrans = *req.IncludeTrans
	}
	if req.VisibleToGenders != nil {
		prefs.VisibleToGenders = req.VisibleToGenders
	}
	if req.HardBlockGenders != nil {
		prefs.HardBlockGenders = req.HardBlockGenders
	}
	if req.HardBlockAgeMin != nil {
		prefs.HardBlockAgeMin = req.HardBlockAgeMin
	}
	if req.HardBlockAgeMax != nil {
		prefs.HardBlockAgeMax = req.HardBlockAgeMax
	}

	if err := s.repo.UpdatePreferences(ctx, prefs); err != nil {
		return nil, err
	}

	return prefs, nil
}

func (s *Service) AddPhoto(ctx context.Context, userID uuid.UUID, reader io.Reader, size int64, contentType string) (*Photo, error) {
	url, err := s.storage.UploadPhoto(ctx, userID, reader, size, contentType)
	if err != nil {
		return nil, err
	}

	photo := &Photo{
		ID:        uuid.New(),
		UserID:    userID,
		URL:       url,
		CreatedAt: time.Now(),
	}

	if err := s.repo.AddPhoto(ctx, photo); err != nil {
		// Try to clean up uploaded photo
		s.storage.DeletePhoto(ctx, url)
		return nil, err
	}

	return photo, nil
}

func (s *Service) DeletePhoto(ctx context.Context, userID, photoID uuid.UUID) error {
	photos, err := s.repo.GetPhotos(ctx, userID)
	if err != nil {
		return err
	}

	var photoURL string
	for _, p := range photos {
		if p.ID == photoID {
			photoURL = p.URL
			break
		}
	}

	if err := s.repo.DeletePhoto(ctx, userID, photoID); err != nil {
		return err
	}

	if photoURL != "" {
		s.storage.DeletePhoto(ctx, photoURL)
	}

	return nil
}

// ReorderPhotos reorders the user's photos based on the provided photo IDs
func (s *Service) ReorderPhotos(ctx context.Context, userID uuid.UUID, photoIDs []uuid.UUID) error {
	return s.repo.ReorderPhotos(ctx, userID, photoIDs)
}

// VerifyProfile sets the verified badge on a user's profile if they have a qualifying subscription
func (s *Service) VerifyProfile(ctx context.Context, userID uuid.UUID) error {
	if s.subChecker == nil {
		return ErrVerificationUnavailable
	}

	// Check if already verified
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if profile.IsVerified {
		return ErrAlreadyVerified
	}

	// Check subscription eligibility (quarterly or annual)
	eligible, err := s.subChecker.HasQualifyingSubscription(ctx, userID)
	if err != nil {
		return err
	}
	if !eligible {
		return ErrVerificationUnavailable
	}

	return s.repo.SetVerified(ctx, userID, true)
}

// SubmitVerification submits a verification photo for review
func (s *Service) SubmitVerification(ctx context.Context, userID uuid.UUID, reader io.Reader, size int64, contentType string) error {
	// Check current verification status
	status, err := s.repo.GetVerificationStatus(ctx, userID)
	if err == nil && status == "pending" {
		return ErrVerificationAlreadyPending
	}

	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if profile.IsVerified {
		return ErrAlreadyVerified
	}

	// Upload the verification photo
	url, err := s.storage.UploadPhoto(ctx, userID, reader, size, contentType)
	if err != nil {
		return err
	}

	// Set verification status to pending
	return s.repo.SetVerificationPhoto(ctx, userID, url, "pending")
}

// GetVerificationStatus returns the user's verification status
func (s *Service) GetVerificationStatus(ctx context.Context, userID uuid.UUID) (string, error) {
	return s.repo.GetVerificationStatus(ctx, userID)
}

func calculateAge(dob time.Time) int {
	now := time.Now()
	years := now.Year() - dob.Year()
	if now.YearDay() < dob.YearDay() {
		years--
	}
	return years
}

// GetShareLink returns the user's shareable profile link
func (s *Service) GetShareLink(ctx context.Context, userID uuid.UUID, baseURL string) (string, error) {
	code, err := s.repo.GetOrCreateShareCode(ctx, userID)
	if err != nil {
		return "", err
	}
	return baseURL + "/p/" + code, nil
}

// GetPublicProfile returns a limited public view of a profile by share code
func (s *Service) GetPublicProfile(ctx context.Context, code string) (*PublicProfile, error) {
	profile, err := s.repo.GetByShareCode(ctx, code)
	if err != nil {
		return nil, err
	}

	return &PublicProfile{
		Name:         profile.Name,
		Age:          calculateAge(profile.DOB),
		Neighborhood: profile.Neighborhood,
		Bio:          profile.Bio,
		Prompts:      profile.Prompts,
		LookingFor:   profile.LookingFor,
		IsVerified:   profile.IsVerified,
		Photos:       profile.Photos,
		ShareCode:    code,
	}, nil
}
