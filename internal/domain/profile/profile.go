package profile

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Prompt represents a single profile prompt with question and answer
type Prompt struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// Prompts is a slice of Prompt that implements sql.Scanner and driver.Valuer
type Prompts []Prompt

// Scan implements the sql.Scanner interface for JSONB
func (p *Prompts) Scan(value interface{}) error {
	if value == nil {
		*p = []Prompt{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		*p = []Prompt{}
		return nil
	}
	return json.Unmarshal(bytes, p)
}

type Profile struct {
	UserID       uuid.UUID  `json:"user_id"`
	Name         string     `json:"name"`
	DOB          time.Time  `json:"dob"`
	Gender       string     `json:"gender"`
	ZipCode      string     `json:"zip_code"`
	Neighborhood *string    `json:"neighborhood,omitempty"`
	Bio          string     `json:"bio"`
	Prompts      Prompts    `json:"prompts"`
	KinkLevel    *string    `json:"kink_level,omitempty"`
	LookingFor   []string   `json:"looking_for,omitempty"`
	Zodiac       *string    `json:"zodiac,omitempty"`
	Religion     *string    `json:"religion,omitempty"`
	HasKids      *bool      `json:"has_kids,omitempty"`
	WantsKids    *string    `json:"wants_kids,omitempty"`
	Alcohol      *string    `json:"alcohol,omitempty"`
	Weed         *string    `json:"weed,omitempty"`
	Lat          *float64   `json:"lat,omitempty"`
	Lng          *float64   `json:"lng,omitempty"`
	IsVerified   bool       `json:"is_verified"`
	LastActive   time.Time  `json:"last_active"`
	CreatedAt    time.Time  `json:"created_at"`
	Photos       []Photo    `json:"photos"`
	ShareCode    *string    `json:"share_code,omitempty"`
}

// PublicProfile is a limited view of a profile for sharing on social media
type PublicProfile struct {
	Name         string    `json:"name"`
	Age          int       `json:"age"`
	Neighborhood *string   `json:"neighborhood,omitempty"`
	Bio          string    `json:"bio"`
	Prompts      Prompts   `json:"prompts"`
	LookingFor   []string  `json:"looking_for,omitempty"`
	IsVerified   bool      `json:"is_verified"`
	Photos       []Photo   `json:"photos"`
	ShareCode    string    `json:"share_code"`
}

type Photo struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	URL       string    `json:"url"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}

type Preferences struct {
	UserID           uuid.UUID `json:"user_id"`
	GendersSeeking   []string  `json:"genders_seeking"`
	AgeMin           int       `json:"age_min"`
	AgeMax           int       `json:"age_max"`
	DistanceMiles    int       `json:"distance_miles"`
	IncludeTrans     bool      `json:"include_trans"`
	VisibleToGenders []string  `json:"visible_to_genders"`
	HardBlockGenders []string  `json:"hard_block_genders,omitempty"`
	HardBlockAgeMin  *int      `json:"hard_block_age_min,omitempty"`
	HardBlockAgeMax  *int      `json:"hard_block_age_max,omitempty"`
}

type CreateProfileRequest struct {
	Name         string   `json:"name"`
	DOB          string   `json:"dob"` // YYYY-MM-DD
	Gender       string   `json:"gender"`
	ZipCode      string   `json:"zip_code"`
	Neighborhood *string  `json:"neighborhood,omitempty"`
	Bio          string   `json:"bio"`
	Prompts      []Prompt `json:"prompts,omitempty"`
	KinkLevel    *string  `json:"kink_level,omitempty"`
	LookingFor   []string `json:"looking_for,omitempty"`
	Zodiac       *string  `json:"zodiac,omitempty"`
	Religion     *string  `json:"religion,omitempty"`
	HasKids      *bool    `json:"has_kids,omitempty"`
	WantsKids    *string  `json:"wants_kids,omitempty"`
	Alcohol      *string  `json:"alcohol,omitempty"`
	Weed         *string  `json:"weed,omitempty"`
	Lat          *float64 `json:"lat,omitempty"`
	Lng          *float64 `json:"lng,omitempty"`
}

type UpdateProfileRequest struct {
	Name         *string  `json:"name,omitempty"`
	Neighborhood *string  `json:"neighborhood,omitempty"`
	Bio          *string  `json:"bio,omitempty"`
	Prompts      []Prompt `json:"prompts,omitempty"`
	KinkLevel    *string  `json:"kink_level,omitempty"`
	LookingFor   []string `json:"looking_for,omitempty"`
	Zodiac       *string  `json:"zodiac,omitempty"`
	Religion     *string  `json:"religion,omitempty"`
	HasKids      *bool    `json:"has_kids,omitempty"`
	WantsKids    *string  `json:"wants_kids,omitempty"`
	Alcohol      *string  `json:"alcohol,omitempty"`
	Weed         *string  `json:"weed,omitempty"`
	Lat          *float64 `json:"lat,omitempty"`
	Lng          *float64 `json:"lng,omitempty"`
}

type UpdatePreferencesRequest struct {
	GendersSeeking   []string `json:"genders_seeking,omitempty"`
	AgeMin           *int     `json:"age_min,omitempty"`
	AgeMax           *int     `json:"age_max,omitempty"`
	DistanceMiles    *int     `json:"distance_miles,omitempty"`
	IncludeTrans     *bool    `json:"include_trans,omitempty"`
	VisibleToGenders []string `json:"visible_to_genders,omitempty"`
	HardBlockGenders []string `json:"hard_block_genders,omitempty"`
	HardBlockAgeMin  *int     `json:"hard_block_age_min,omitempty"`
	HardBlockAgeMax  *int     `json:"hard_block_age_max,omitempty"`
}

type ProfileResponse struct {
	Profile     *Profile     `json:"profile"`
	Preferences *Preferences `json:"preferences,omitempty"`
}

// VerificationRequest represents a pending photo verification
type VerificationRequest struct {
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	PhotoURL    string    `json:"photo_url"`
	VerifyURL   string    `json:"verify_url"`
	SubmittedAt time.Time `json:"submitted_at"`
}

// Valid values
var (
	ValidGenders    = []string{"man", "woman", "trans", "non_binary"}
	ValidKinkLevels = []string{"vanilla", "curious", "sensual", "experienced", "kinky"}
	ValidWantsKids  = []string{"yes", "no", "maybe"}
	ValidAlcohol    = []string{"never", "socially", "often"}
	ValidWeed       = []string{"never", "socially", "often", "420_friendly"}
)

func IsValidGender(g string) bool {
	for _, v := range ValidGenders {
		if v == g {
			return true
		}
	}
	return false
}

func IsValidKinkLevel(k string) bool {
	if k == "" {
		return true
	}
	for _, v := range ValidKinkLevels {
		if v == k {
			return true
		}
	}
	return false
}
