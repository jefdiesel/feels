-- Seed data for development/testing
-- Creates test users with profiles and photos

-- Generate UUIDs for test users
DO $$
DECLARE
    user1_id UUID := uuid_generate_v4();
    user2_id UUID := uuid_generate_v4();
    user3_id UUID := uuid_generate_v4();
    user4_id UUID := uuid_generate_v4();
    user5_id UUID := uuid_generate_v4();
BEGIN
    -- Insert test users (password is 'password123' hashed with bcrypt)
    INSERT INTO users (id, email, password_hash, email_verified, phone, phone_verified) VALUES
    (user1_id, 'sarah@test.com', '$2a$10$rZxK4H.4l1EpRDqKqI3hPOmXhZ8Y6Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', true, '2125551001', true),
    (user2_id, 'emma@test.com', '$2a$10$rZxK4H.4l1EpRDqKqI3hPOmXhZ8Y6Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', true, '2125551002', true),
    (user3_id, 'alex@test.com', '$2a$10$rZxK4H.4l1EpRDqKqI3hPOmXhZ8Y6Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', true, '2125551003', true),
    (user4_id, 'jordan@test.com', '$2a$10$rZxK4H.4l1EpRDqKqI3hPOmXhZ8Y6Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', true, '2125551004', true),
    (user5_id, 'taylor@test.com', '$2a$10$rZxK4H.4l1EpRDqKqI3hPOmXhZ8Y6Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', true, '2125551005', true);

    -- Insert profiles
    INSERT INTO profiles (user_id, name, dob, gender, zip_code, neighborhood, bio, kink_level, lat, lng, is_verified, last_active) VALUES
    (user1_id, 'Sarah', '1996-03-15'::DATE, 'woman', '10001', 'West Village', 'Coffee addict. Dog lover. Looking for someone to explore the city with.', 'sensual', 40.7336, -74.0027, true, NOW()),
    (user2_id, 'Emma', '1994-07-22'::DATE, 'woman', '10002', 'East Village', 'Musician by night, designer by day. Love trying new restaurants.', 'curious', 40.7265, -73.9815, true, NOW()),
    (user3_id, 'Alex', '1993-11-08'::DATE, 'man', '10003', 'SoHo', 'Photographer and traveler. Always planning the next adventure.', 'experienced', 40.7234, -73.9987, true, NOW()),
    (user4_id, 'Jordan', '1995-01-30'::DATE, 'non_binary', '10004', 'Tribeca', 'Tech nerd with a passion for cooking. Make me laugh!', 'kinky', 40.7163, -74.0086, true, NOW()),
    (user5_id, 'Taylor', '1997-09-12'::DATE, 'woman', '10005', 'Chelsea', 'Yoga instructor and bookworm. Seeking deep conversations.', 'vanilla', 40.7465, -74.0014, true, NOW());

    -- Insert photos (using picsum.photos for random images)
    INSERT INTO photos (user_id, url, position) VALUES
    (user1_id, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', 1),
    (user1_id, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', 2),
    (user1_id, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', 3),
    (user2_id, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', 1),
    (user2_id, 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800', 2),
    (user3_id, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 1),
    (user3_id, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800', 2),
    (user4_id, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800', 1),
    (user4_id, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800', 2),
    (user5_id, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800', 1),
    (user5_id, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800', 2),
    (user5_id, 'https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=800', 3);

    -- Insert preferences (all seeking everyone for testing)
    INSERT INTO preferences (user_id, genders_seeking, age_min, age_max, distance_miles, include_trans, visible_to_genders) VALUES
    (user1_id, ARRAY['man', 'woman', 'non_binary'], 21, 40, 50, true, ARRAY['man', 'woman', 'non_binary']),
    (user2_id, ARRAY['man', 'woman', 'non_binary'], 21, 40, 50, true, ARRAY['man', 'woman', 'non_binary']),
    (user3_id, ARRAY['man', 'woman', 'non_binary'], 21, 40, 50, true, ARRAY['man', 'woman', 'non_binary']),
    (user4_id, ARRAY['man', 'woman', 'non_binary'], 21, 40, 50, true, ARRAY['man', 'woman', 'non_binary']),
    (user5_id, ARRAY['man', 'woman', 'non_binary'], 21, 40, 50, true, ARRAY['man', 'woman', 'non_binary']);

    -- Initialize credits for test users
    INSERT INTO credits (user_id, balance, bonus_likes) VALUES
    (user1_id, 100, 10),
    (user2_id, 100, 10),
    (user3_id, 100, 10),
    (user4_id, 100, 10),
    (user5_id, 100, 10);
END $$;
