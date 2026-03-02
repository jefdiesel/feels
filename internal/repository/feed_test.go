package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/feels/feels/internal/domain/feed"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/feels/feels/internal/repository"
	"github.com/feels/feels/internal/testutil"
	"github.com/google/uuid"
)

func TestFeedRepository_CreateLikeAtomic_MutualLikeCreatesMatch(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	// Create two users who can match (opposite genders, within age range)
	alice := db.CreateTestUserWithPrefs(t, "Alice", "woman", 25, []string{"man"}, 20, 35)
	bob := db.CreateTestUserWithPrefs(t, "Bob", "man", 28, []string{"woman"}, 20, 35)

	// Bob likes Alice first
	bobLike := &feed.Like{
		ID:          uuid.New(),
		LikerID:     bob.ID,
		LikedID:     alice.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(bob.ID, alice.ID)
	result1, err := repo.CreateLikeAtomic(ctx, bobLike, user1, user2)
	if err != nil {
		t.Fatalf("Bob's like failed: %v", err)
	}
	if result1.MatchCreated {
		t.Error("Expected no match on first like")
	}
	if result1.MatchID != nil {
		t.Error("Expected nil match ID on first like")
	}

	// Alice likes Bob back - should create match
	aliceLike := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 = orderedUserIDs(alice.ID, bob.ID)
	result2, err := repo.CreateLikeAtomic(ctx, aliceLike, user1, user2)
	if err != nil {
		t.Fatalf("Alice's like failed: %v", err)
	}
	if !result2.MatchCreated {
		t.Error("Expected match to be created on mutual like")
	}
	if result2.MatchID == nil {
		t.Error("Expected match ID to be returned")
	}

	// Verify match exists in database
	if !db.MatchExists(t, alice.ID, bob.ID) {
		t.Error("Match should exist in database")
	}

	// Verify likes were deleted after match
	if db.GetLikeCount(t, alice.ID) != 0 {
		t.Error("Alice's likes should be deleted after match")
	}
	if db.GetLikeCount(t, bob.ID) != 0 {
		t.Error("Bob's likes should be deleted after match")
	}
}

func TestFeedRepository_CreateLikeAtomic_NoMatchWithoutMutual(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	// Alice likes Bob (no prior like from Bob)
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	result, err := repo.CreateLikeAtomic(ctx, like, user1, user2)
	if err != nil {
		t.Fatalf("Like failed: %v", err)
	}

	if result.MatchCreated {
		t.Error("Should not create match without mutual like")
	}
	if result.MatchID != nil {
		t.Error("Match ID should be nil without mutual like")
	}
	if !result.LikeCreated {
		t.Error("Like should be created")
	}

	// Verify no match in database
	if db.MatchExists(t, alice.ID, bob.ID) {
		t.Error("No match should exist")
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_DeductsCreditsForSuperlike(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	initialBalance, _ := db.GetCredits(t, alice.ID)

	// Alice superlikes Bob
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: true,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	superlikeCost := 10
	result, creditResult, err := repo.CreateLikeWithCreditAtomic(ctx, like, true, 10, superlikeCost, user1, user2)
	if err != nil {
		t.Fatalf("Superlike failed: %v", err)
	}

	if !result.LikeCreated {
		t.Error("Like should be created")
	}

	// Credit result should be empty for superlikes (they use balance, not subscription/bonus/daily)
	if creditResult.UsedSubscription || creditResult.UsedBonusLike || creditResult.UsedDailyLike {
		t.Error("Superlike should not set credit result flags")
	}

	// Verify credits were deducted
	newBalance, _ := db.GetCredits(t, alice.ID)
	if newBalance != initialBalance-superlikeCost {
		t.Errorf("Credits should be deducted: expected %d, got %d", initialBalance-superlikeCost, newBalance)
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_UsesSubscription(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	// Give Alice a subscription
	db.CreateSubscription(t, alice.ID)

	initialBalance, initialBonus := db.GetCredits(t, alice.ID)

	// Alice likes Bob (regular like, not superlike)
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	result, creditResult, err := repo.CreateLikeWithCreditAtomic(ctx, like, false, 10, 10, user1, user2)
	if err != nil {
		t.Fatalf("Like failed: %v", err)
	}

	if !result.LikeCreated {
		t.Error("Like should be created")
	}

	if !creditResult.UsedSubscription {
		t.Error("Should use subscription for subscriber")
	}
	if creditResult.UsedBonusLike || creditResult.UsedDailyLike {
		t.Error("Should not use bonus or daily likes for subscriber")
	}

	// Verify credits were NOT deducted
	newBalance, newBonus := db.GetCredits(t, alice.ID)
	if newBalance != initialBalance {
		t.Errorf("Balance should not change for subscriber: expected %d, got %d", initialBalance, newBalance)
	}
	if newBonus != initialBonus {
		t.Errorf("Bonus likes should not change for subscriber: expected %d, got %d", initialBonus, newBonus)
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_UsesBonusLikes(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	_, initialBonus := db.GetCredits(t, alice.ID)
	if initialBonus == 0 {
		t.Skip("Test user has no bonus likes")
	}

	// Alice likes Bob (regular like)
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	result, creditResult, err := repo.CreateLikeWithCreditAtomic(ctx, like, false, 10, 10, user1, user2)
	if err != nil {
		t.Fatalf("Like failed: %v", err)
	}

	if !result.LikeCreated {
		t.Error("Like should be created")
	}

	if !creditResult.UsedBonusLike {
		t.Error("Should use bonus like")
	}
	if creditResult.UsedSubscription || creditResult.UsedDailyLike {
		t.Error("Should not use subscription or daily likes when bonus available")
	}

	// Verify bonus likes were deducted
	_, newBonus := db.GetCredits(t, alice.ID)
	if newBonus != initialBonus-1 {
		t.Errorf("Bonus likes should be deducted: expected %d, got %d", initialBonus-1, newBonus)
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_UsesDailyLikes(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	// Remove Alice's bonus likes
	_, err := db.Pool.Exec(ctx, "UPDATE credits SET bonus_likes = 0 WHERE user_id = $1", alice.ID)
	if err != nil {
		t.Fatalf("Failed to remove bonus likes: %v", err)
	}

	initialDaily := db.GetDailyLikeCount(t, alice.ID)

	// Alice likes Bob (regular like)
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	result, creditResult, err := repo.CreateLikeWithCreditAtomic(ctx, like, false, 10, 10, user1, user2)
	if err != nil {
		t.Fatalf("Like failed: %v", err)
	}

	if !result.LikeCreated {
		t.Error("Like should be created")
	}

	if !creditResult.UsedDailyLike {
		t.Error("Should use daily like")
	}
	if creditResult.UsedSubscription || creditResult.UsedBonusLike {
		t.Error("Should not use subscription or bonus likes")
	}

	// Verify daily likes were incremented
	newDaily := db.GetDailyLikeCount(t, alice.ID)
	if newDaily != initialDaily+1 {
		t.Errorf("Daily likes should be incremented: expected %d, got %d", initialDaily+1, newDaily)
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_DailyLimitReached(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	// Remove Alice's bonus likes and set daily count to limit
	dailyLimit := 10
	_, err := db.Pool.Exec(ctx, "UPDATE credits SET bonus_likes = 0 WHERE user_id = $1", alice.ID)
	if err != nil {
		t.Fatalf("Failed to remove bonus likes: %v", err)
	}
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO daily_likes (user_id, date, count)
		VALUES ($1, CURRENT_DATE, $2)
		ON CONFLICT (user_id, date) DO UPDATE SET count = $2
	`, alice.ID, dailyLimit)
	if err != nil {
		t.Fatalf("Failed to set daily likes: %v", err)
	}

	// Alice tries to like Bob (should fail)
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: false,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	_, _, err = repo.CreateLikeWithCreditAtomic(ctx, like, false, dailyLimit, 10, user1, user2)
	if err == nil {
		t.Error("Expected error when daily limit reached")
	}
	if err != repository.ErrDailyLimitReached {
		t.Errorf("Expected ErrDailyLimitReached, got: %v", err)
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_InsufficientCreditsForSuperlike(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)
	bob := db.CreateTestUser(t, "Bob", "man", 28)

	// Remove Alice's credits
	_, err := db.Pool.Exec(ctx, "UPDATE credits SET balance = 0 WHERE user_id = $1", alice.ID)
	if err != nil {
		t.Fatalf("Failed to remove credits: %v", err)
	}

	// Alice tries to superlike Bob (should fail)
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     bob.ID,
		IsSuperlike: true,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, bob.ID)
	_, _, err = repo.CreateLikeWithCreditAtomic(ctx, like, true, 10, 10, user1, user2)
	if err == nil {
		t.Error("Expected error when insufficient credits for superlike")
	}
	if err != repository.ErrInsufficientCredits {
		t.Errorf("Expected ErrInsufficientCredits, got: %v", err)
	}
}

func TestFeedRepository_CreateLikeWithCreditAtomic_AtomicRollbackOnError(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUser(t, "Alice", "woman", 25)

	initialBalance, initialBonus := db.GetCredits(t, alice.ID)

	// Try to like non-existent user (will fail on foreign key)
	nonExistentUserID := uuid.New()
	like := &feed.Like{
		ID:          uuid.New(),
		LikerID:     alice.ID,
		LikedID:     nonExistentUserID,
		IsSuperlike: true,
		CreatedAt:   time.Now(),
	}
	user1, user2 := orderedUserIDs(alice.ID, nonExistentUserID)
	_, _, err := repo.CreateLikeWithCreditAtomic(ctx, like, true, 10, 10, user1, user2)
	if err == nil {
		t.Error("Expected error when liking non-existent user")
	}

	// Verify credits were NOT deducted (transaction rolled back)
	newBalance, newBonus := db.GetCredits(t, alice.ID)
	if newBalance != initialBalance {
		t.Errorf("Balance should be unchanged after rollback: expected %d, got %d", initialBalance, newBalance)
	}
	if newBonus != initialBonus {
		t.Errorf("Bonus likes should be unchanged after rollback: expected %d, got %d", initialBonus, newBonus)
	}
}

func TestFeedRepository_GetFeedProfiles_LikesAppearFirst(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	// Create Alice (woman seeking men)
	alice := db.CreateTestUserWithPrefs(t, "Alice", "woman", 25, []string{"man"}, 20, 40)

	// Create 5 men who browse
	browseUsers := make([]*testutil.TestUser, 5)
	for i := 0; i < 5; i++ {
		browseUsers[i] = db.CreateTestUserWithPrefs(t, "BrowseMan", "man", 25+i, []string{"woman"}, 20, 40)
	}

	// Create 3 men who liked Alice
	likers := make([]*testutil.TestUser, 3)
	for i := 0; i < 3; i++ {
		likers[i] = db.CreateTestUserWithPrefs(t, "LikerMan", "man", 26+i, []string{"woman"}, 20, 40)
		db.CreateLike(t, likers[i].ID, alice.ID, false)
	}

	// Create 1 man who superliked Alice
	superliker := db.CreateTestUserWithPrefs(t, "SuperLikerMan", "man", 30, []string{"woman"}, 20, 40)
	db.CreateLike(t, superliker.ID, alice.ID, true)

	// Get Alice's feed
	prefs := &profile.Preferences{
		GendersSeeking: []string{"man"},
		AgeMin:         20,
		AgeMax:         40,
		DistanceMiles:  100,
	}
	profiles, err := repo.GetFeedProfiles(ctx, alice.ID, prefs, 20)
	if err != nil {
		t.Fatalf("GetFeedProfiles failed: %v", err)
	}

	if len(profiles) == 0 {
		t.Fatal("Expected profiles in feed")
	}

	// First profile should be the superliker (priority 1)
	if profiles[0].UserID != superliker.ID {
		t.Errorf("First profile should be superliker, got %v", profiles[0].UserID)
	}
	if profiles[0].Priority != feed.PriorityQualifiedSuperlike {
		t.Errorf("First profile priority should be qualified_superlike, got %v", profiles[0].Priority)
	}

	// Next 3 should be regular likers (priority 2)
	likerIDs := make(map[uuid.UUID]bool)
	for _, l := range likers {
		likerIDs[l.ID] = true
	}
	for i := 1; i <= 3 && i < len(profiles); i++ {
		if !likerIDs[profiles[i].UserID] {
			t.Errorf("Profile %d should be a liker, got %v", i, profiles[i].UserID)
		}
		if profiles[i].Priority != feed.PriorityQualifiedLike {
			t.Errorf("Profile %d priority should be qualified_like, got %v", i, profiles[i].Priority)
		}
	}

	// Rest should be browse (priority 4)
	for i := 4; i < len(profiles); i++ {
		if profiles[i].Priority != feed.PriorityBrowse {
			t.Errorf("Profile %d priority should be browse, got %v", i, profiles[i].Priority)
		}
	}
}

func TestFeedRepository_GetFeedProfiles_ExcludesMatchedUsers(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUserWithPrefs(t, "Alice", "woman", 25, []string{"man"}, 20, 40)
	bob := db.CreateTestUserWithPrefs(t, "Bob", "man", 28, []string{"woman"}, 20, 40)
	charlie := db.CreateTestUserWithPrefs(t, "Charlie", "man", 30, []string{"woman"}, 20, 40)

	// Alice and Bob are matched
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO matches (id, user1_id, user2_id, created_at)
		VALUES ($1, $2, $3, NOW())
	`, uuid.New(), alice.ID, bob.ID)
	if err != nil {
		t.Fatalf("Failed to create match: %v", err)
	}

	// Get Alice's feed
	prefs := &profile.Preferences{
		GendersSeeking: []string{"man"},
		AgeMin:         20,
		AgeMax:         40,
		DistanceMiles:  100,
	}
	profiles, err := repo.GetFeedProfiles(ctx, alice.ID, prefs, 20)
	if err != nil {
		t.Fatalf("GetFeedProfiles failed: %v", err)
	}

	// Bob should not be in the feed (matched)
	for _, p := range profiles {
		if p.UserID == bob.ID {
			t.Error("Matched user Bob should not appear in feed")
		}
	}

	// Charlie should be in the feed
	found := false
	for _, p := range profiles {
		if p.UserID == charlie.ID {
			found = true
			break
		}
	}
	if !found {
		t.Error("Unmatched user Charlie should appear in feed")
	}
}

func TestFeedRepository_CountQueuedLikes(t *testing.T) {
	db := testutil.NewTestDB(t)
	defer db.Close()
	defer db.CleanupAll(t)

	repo := repository.NewFeedRepository(db.Pool)
	ctx := context.Background()

	alice := db.CreateTestUserWithPrefs(t, "Alice", "woman", 25, []string{"man"}, 20, 40)

	// Create 5 men who liked Alice
	for i := 0; i < 5; i++ {
		liker := db.CreateTestUserWithPrefs(t, "LikerMan", "man", 25+i, []string{"woman"}, 20, 40)
		db.CreateLike(t, liker.ID, alice.ID, false)
	}

	// Create 2 men outside age range who liked Alice
	for i := 0; i < 2; i++ {
		liker := db.CreateTestUserWithPrefs(t, "OldLikerMan", "man", 50+i, []string{"woman"}, 20, 40)
		db.CreateLike(t, liker.ID, alice.ID, false)
	}

	prefs := &profile.Preferences{
		GendersSeeking: []string{"man"},
		AgeMin:         20,
		AgeMax:         40,
		DistanceMiles:  100,
	}

	count, err := repo.CountQueuedLikes(ctx, alice.ID, prefs)
	if err != nil {
		t.Fatalf("CountQueuedLikes failed: %v", err)
	}

	// Should only count the 5 qualified likes (within age range)
	if count != 5 {
		t.Errorf("Expected 5 queued likes, got %d", count)
	}
}

// Helper function to order user IDs consistently
func orderedUserIDs(a, b uuid.UUID) (uuid.UUID, uuid.UUID) {
	if a.String() < b.String() {
		return a, b
	}
	return b, a
}
