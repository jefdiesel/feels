package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/referral"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReferralRepository struct {
	db *pgxpool.Pool
}

func NewReferralRepository(db *pgxpool.Pool) *ReferralRepository {
	return &ReferralRepository{db: db}
}

func (r *ReferralRepository) GetCodeByUserID(ctx context.Context, userID uuid.UUID) (*referral.ReferralCode, error) {
	query := `SELECT id, user_id, code, created_at FROM referral_codes WHERE user_id = $1`
	var code referral.ReferralCode
	err := r.db.QueryRow(ctx, query, userID).Scan(&code.ID, &code.UserID, &code.Code, &code.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("code not found")
		}
		return nil, err
	}
	return &code, nil
}

func (r *ReferralRepository) GetCodeByCode(ctx context.Context, code string) (*referral.ReferralCode, error) {
	query := `SELECT id, user_id, code, created_at FROM referral_codes WHERE code = $1`
	var rc referral.ReferralCode
	err := r.db.QueryRow(ctx, query, code).Scan(&rc.ID, &rc.UserID, &rc.Code, &rc.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("code not found")
		}
		return nil, err
	}
	return &rc, nil
}

func (r *ReferralRepository) CreateCode(ctx context.Context, code *referral.ReferralCode) error {
	query := `INSERT INTO referral_codes (id, user_id, code, created_at) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(ctx, query, code.ID, code.UserID, code.Code, code.CreatedAt)
	return err
}

func (r *ReferralRepository) CreateReferral(ctx context.Context, ref *referral.Referral) error {
	query := `
		INSERT INTO referrals (id, referrer_id, referred_id, code, referrer_reward_days, referred_reward_days, referrer_rewarded, referred_rewarded, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(ctx, query,
		ref.ID, ref.ReferrerID, ref.ReferredID, ref.Code,
		ref.ReferrerRewardDays, ref.ReferredRewardDays,
		ref.ReferrerRewarded, ref.ReferredRewarded, ref.CreatedAt,
	)
	return err
}

func (r *ReferralRepository) GetReferralByReferredID(ctx context.Context, referredID uuid.UUID) (*referral.Referral, error) {
	query := `
		SELECT id, referrer_id, referred_id, code, referrer_reward_days, referred_reward_days, referrer_rewarded, referred_rewarded, created_at
		FROM referrals WHERE referred_id = $1
	`
	var ref referral.Referral
	err := r.db.QueryRow(ctx, query, referredID).Scan(
		&ref.ID, &ref.ReferrerID, &ref.ReferredID, &ref.Code,
		&ref.ReferrerRewardDays, &ref.ReferredRewardDays,
		&ref.ReferrerRewarded, &ref.ReferredRewarded, &ref.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &ref, nil
}

func (r *ReferralRepository) GetReferralsByReferrerID(ctx context.Context, referrerID uuid.UUID) ([]referral.Referral, error) {
	query := `
		SELECT id, referrer_id, referred_id, code, referrer_reward_days, referred_reward_days, referrer_rewarded, referred_rewarded, created_at
		FROM referrals WHERE referrer_id = $1 ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, referrerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var refs []referral.Referral
	for rows.Next() {
		var ref referral.Referral
		if err := rows.Scan(
			&ref.ID, &ref.ReferrerID, &ref.ReferredID, &ref.Code,
			&ref.ReferrerRewardDays, &ref.ReferredRewardDays,
			&ref.ReferrerRewarded, &ref.ReferredRewarded, &ref.CreatedAt,
		); err != nil {
			return nil, err
		}
		refs = append(refs, ref)
	}
	return refs, rows.Err()
}

func (r *ReferralRepository) GetReferralStats(ctx context.Context, userID uuid.UUID) (*referral.ReferralStats, error) {
	// Get the user's code
	codeQuery := `SELECT code FROM referral_codes WHERE user_id = $1`
	var code string
	err := r.db.QueryRow(ctx, codeQuery, userID).Scan(&code)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// Get referral stats
	statsQuery := `
		SELECT
			COUNT(*) as total,
			COALESCE(SUM(CASE WHEN referrer_rewarded THEN referrer_reward_days ELSE 0 END), 0) as days_earned
		FROM referrals
		WHERE referrer_id = $1
	`
	var total int
	var daysEarned int
	err = r.db.QueryRow(ctx, statsQuery, userID).Scan(&total, &daysEarned)
	if err != nil {
		return nil, err
	}

	return &referral.ReferralStats{
		Code:              code,
		TotalReferrals:    total,
		PremiumDaysEarned: daysEarned,
	}, nil
}

func (r *ReferralRepository) MarkReferrerRewarded(ctx context.Context, referralID uuid.UUID) error {
	query := `UPDATE referrals SET referrer_rewarded = true WHERE id = $1`
	_, err := r.db.Exec(ctx, query, referralID)
	return err
}

func (r *ReferralRepository) MarkReferredRewarded(ctx context.Context, referralID uuid.UUID) error {
	query := `UPDATE referrals SET referred_rewarded = true WHERE id = $1`
	_, err := r.db.Exec(ctx, query, referralID)
	return err
}
