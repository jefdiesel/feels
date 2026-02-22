package profile

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidGender    = errors.New("invalid gender")
	ErrInvalidDOB       = errors.New("invalid date of birth")
	ErrTooYoung         = errors.New("must be 18 or older")
	ErrInvalidKinkLevel = errors.New("invalid kink level")
	ErrProfileRequired  = errors.New("profile required")
	ErrInvalidPhotoType = errors.New("invalid photo type, must be jpeg, png, gif, or webp")
	ErrPhotoTooLarge    = errors.New("photo too large, max 10MB")
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
}

type Storage interface {
	UploadPhoto(ctx context.Context, userID uuid.UUID, reader io.Reader, size int64, contentType string) (string, error)
	DeletePhoto(ctx context.Context, url string) error
}

type Service struct {
	repo    Repository
	storage Storage
}

func NewService(repo Repository, storage Storage) *Service {
	return &Service{
		repo:    repo,
		storage: storage,
	}
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
	if req.LookingFor != nil {
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
	if req.Lat != nil {
		profile.Lat = req.Lat
	}
	if req.Lng != nil {
		profile.Lng = req.Lng
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

func calculateAge(dob time.Time) int {
	now := time.Now()
	years := now.Year() - dob.Year()
	if now.YearDay() < dob.YearDay() {
		years--
	}
	return years
}
