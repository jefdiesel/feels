-- Seed data for development/testing
-- Creates 200 test users with profiles, photos, preferences, and credits

DO $$
DECLARE
    user_ids UUID[];
    i INT;

    -- Names arrays
    women_names TEXT[] := ARRAY['Sarah', 'Emma', 'Taylor', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Luna', 'Camila', 'Sofia', 'Scarlett', 'Aria', 'Penelope', 'Layla', 'Chloe', 'Victoria', 'Madison', 'Eleanor', 'Grace', 'Nora', 'Riley', 'Zoey', 'Hannah', 'Lily', 'Ellie', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella', 'Claire', 'Skylar', 'Lucy', 'Paisley', 'Natalie', 'Naomi', 'Aaliyah', 'Ruby', 'Alice', 'Maya', 'Caroline', 'Kennedy', 'Sadie', 'Elena', 'Stella', 'Hazel', 'Eva', 'Emilia', 'Autumn', 'Quinn', 'Nevaeh', 'Piper', 'Ivy', 'Leah'];
    men_names TEXT[] := ARRAY['Alex', 'Jordan', 'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Theodore', 'Jack', 'Levi', 'Sebastian', 'Mateo', 'Daniel', 'Michael', 'Owen', 'Alexander', 'Asher', 'Samuel', 'Ethan', 'Leo', 'Jackson', 'Mason', 'Ezra', 'John', 'Hudson', 'David', 'Joseph', 'Wesley', 'Luke', 'Dylan', 'Andrew', 'Isaac', 'Gabriel', 'Anthony', 'Thomas', 'Charles', 'Christopher', 'Jace', 'Maverick', 'Adrian', 'Christian', 'Aaron', 'Connor', 'Caleb', 'Evan', 'Miles', 'Nathan', 'Cameron', 'Kai', 'Vincent', 'Max', 'Marcus', 'Jake', 'Tyler', 'Ryan', 'Cole'];
    nb_names TEXT[] := ARRAY['Jordan', 'Riley', 'Quinn', 'Avery', 'Casey', 'Morgan', 'Jamie', 'Skyler', 'Sage', 'Rowan', 'River', 'Phoenix', 'Reese', 'Finley', 'Dakota', 'Emerson', 'Blake', 'Cameron', 'Parker', 'Drew', 'Taylor', 'Hayden', 'Alexis', 'Remi', 'Ari', 'Justice', 'Lennox', 'Eden', 'Peyton', 'Jules'];

    -- NYC neighborhoods
    neighborhoods TEXT[] := ARRAY['West Village', 'East Village', 'SoHo', 'Tribeca', 'Chelsea', 'Lower East Side', 'Williamsburg', 'Bushwick', 'Greenpoint', 'Park Slope', 'DUMBO', 'Brooklyn Heights', 'Bed-Stuy', 'Crown Heights', 'Prospect Heights', 'Astoria', 'Long Island City', 'Harlem', 'Upper West Side', 'Upper East Side', 'Hell''s Kitchen', 'Midtown', 'Nolita', 'Chinatown', 'Financial District', 'Murray Hill', 'Gramercy', 'Flatiron', 'NoMad', 'Fort Greene'];

    -- Zip codes (Manhattan and Brooklyn)
    zip_codes TEXT[] := ARRAY['10001', '10002', '10003', '10004', '10005', '10006', '10007', '10009', '10010', '10011', '10012', '10013', '10014', '10016', '10017', '10018', '10019', '10020', '10021', '10022', '10023', '10024', '10025', '10026', '10027', '10028', '10029', '10030', '10031', '10032', '11201', '11211', '11215', '11217', '11222', '11231', '11238'];

    -- Kink levels
    kink_levels TEXT[] := ARRAY['vanilla', 'sensual', 'curious', 'experienced', 'kinky'];

    -- Looking for options
    looking_for_opts TEXT[] := ARRAY['serious', 'relationship', 'dating', 'meeting_people', 'friends_and_more'];

    -- Zodiac signs
    zodiacs TEXT[] := ARRAY['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

    -- Religion options
    religions TEXT[] := ARRAY['agnostic', 'atheist', 'buddhist', 'catholic', 'christian', 'hindu', 'jewish', 'muslim', 'spiritual', 'other', NULL];

    -- Wants kids options (matches frontend formatWantsKids)
    wants_kids_opts TEXT[] := ARRAY['want', 'open', 'not_sure', 'dont_want', NULL];

    -- Alcohol options (matches frontend formatAlcohol)
    alcohol_opts TEXT[] := ARRAY['never', 'socially', 'regularly', NULL];

    -- Weed options (matches frontend formatWeed)
    weed_opts TEXT[] := ARRAY['never', 'socially', 'regularly', NULL];

    -- Bio templates
    bio_templates TEXT[] := ARRAY[
        'Coffee addict. Looking for someone to explore the city with.',
        'Musician by night, designer by day. Love trying new restaurants.',
        'Photographer and traveler. Always planning the next adventure.',
        'Tech nerd with a passion for cooking. Make me laugh!',
        'Yoga instructor and bookworm. Seeking deep conversations.',
        'Artist based in NYC. Will definitely show you my studio.',
        'Finance by day, DJ by night. Rooftop season is my season.',
        'Startup founder. Work hard, play harder.',
        'Teacher who loves hiking and trying new coffee shops.',
        'Writer working on my first novel. Probably at a cafe.',
        'Nurse with a love for travel. Adventure is my middle name.',
        'Chef who can cook you dinner. Wine included.',
        'Lawyer who''s actually fun at parties. I promise.',
        'Physical therapist. I''ll fix your posture and your heart.',
        'Marketing exec who knows all the best brunch spots.',
        'Architect designing my perfect match. Could be you.',
        'Doctor who somehow still has a social life.',
        'Investment banker trying to have work-life balance.',
        'Actor/model/whatever pays the bills. Very serious about sushi.',
        'Grad student surviving on coffee and optimism.',
        'Personal trainer. Let''s work out and then eat pizza.',
        'Engineer building things, including connections.',
        'Journalist who will ask you a lot of questions.',
        'Social worker with a dark sense of humor.',
        'Bartender who can make you a perfect cocktail.',
        'UX designer. Your profile could use some work.',
        'Musician seeking someone to harmonize with.',
        'Photographer looking for my muse.',
        'Dancer with moves on and off the floor.',
        'Veterinarian. Your pet will love me.',
        'Scientist by day, party animal by night.',
        'Professor who promises not to lecture.',
        'Real estate agent who found my dream apartment.',
        'Therapist who won''t analyze you. Much.',
        'Publicist with all the good party invites.',
        'Film editor. I''ll cut to the chase.',
        'Data scientist looking for chemistry.',
        'Consultant traveling every week but worth the wait.',
        'Product manager who can prioritize you.',
        'Creative director seeking creative connections.',
        'Fashion designer. I''ll dress you up.',
        'Interior designer. Let me into your space.',
        'Event planner. Our first date will be epic.',
        'Gallery owner surrounded by beautiful things.',
        'Music producer making beats and connections.',
        'Sommelier. I know a thing or two about good taste.',
        'Pastry chef. Will bake for affection.',
        'Tattoo artist. Permanent impressions are my thing.',
        'Yoga teacher finding balance in everything.',
        'Pilates instructor with a strong core and stronger personality.',
        'Physical therapist healing bodies and maybe hearts.',
        'Nutritionist who believes in cheat days.',
        'Life coach who needs to follow my own advice.',
        'Podcaster. You might end up on an episode.',
        'Crypto bro who swears it''s more than a phase.',
        'Non-profit worker saving the world, one grant at a time.',
        'Fashion buyer with closet full of stories.',
        'Botanist. I''ll name a plant after you.',
        'Beekeeper. Sweet as honey.',
        'Marine biologist. Deep like the ocean.'
    ];

    -- Prompts for Hinge-style profile
    prompt_questions TEXT[] := ARRAY[
        'The way to win me over is',
        'My most irrational fear is',
        'I''m looking for someone who',
        'A random fact I love is',
        'My simple pleasures',
        'I''m weirdly attracted to',
        'The one thing I''d love to know about you is',
        'My love language is',
        'We''ll get along if',
        'Don''t hate me if I',
        'The key to my heart is',
        'I get way too excited about'
    ];

    prompt_answers TEXT[] := ARRAY[
        'good food and even better conversation',
        'that I''ll never find someone who gets my humor',
        'doesn''t take themselves too seriously',
        'octopuses have three hearts',
        'coffee in bed, long walks, and good playlists',
        'people who are passionate about random things',
        'what''s your go-to karaoke song',
        'quality time and acts of service',
        'you can handle my chaotic energy',
        'sing in the car like nobody''s watching',
        'making me laugh until I cry',
        'trying new restaurants',
        'planning trips I may never take',
        'vintage vinyl records',
        'dogs, obviously',
        'a well-made old fashioned',
        'spontaneous adventures',
        'deep conversations at 2am',
        'someone who loves live music',
        'trying weird food combinations',
        'cozy nights in',
        'terrible puns',
        'discovering hidden gem bars',
        'people who aren''t afraid to be themselves'
    ];

    -- Photos - diverse Unsplash URLs
    women_photos TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e',
        'https://images.unsplash.com/photo-1524638431109-93d95c968f03',
        'https://images.unsplash.com/photo-1502767089025-6572583495b9',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91',
        'https://images.unsplash.com/photo-1499996860823-5f82763f6113',
        'https://images.unsplash.com/photo-1485893086445-ed75865251e0',
        'https://images.unsplash.com/photo-1503104834685-7205e8607eb9',
        'https://images.unsplash.com/photo-1519699047748-de8e457a634e',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
        'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6',
        'https://images.unsplash.com/photo-1516726817505-f5ed825624d8',
        'https://images.unsplash.com/photo-1513379733131-47fc74b45fc7'
    ];

    men_photos TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef',
        'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1',
        'https://images.unsplash.com/photo-1504257432389-52343af06ae3',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
        'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6',
        'https://images.unsplash.com/photo-1488161628813-04466f872be2',
        'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
        'https://images.unsplash.com/photo-1463453091185-61582044d556',
        'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d',
        'https://images.unsplash.com/photo-1545167622-3a6ac756afa4',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        'https://images.unsplash.com/photo-1499996860823-5f82763f6113',
        'https://images.unsplash.com/photo-1522556189639-b150ed9c4330',
        'https://images.unsplash.com/photo-1507081323647-4d250478b919'
    ];

    nb_photos TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce',
        'https://images.unsplash.com/photo-1519699047748-de8e457a634e',
        'https://images.unsplash.com/photo-1499996860823-5f82763f6113',
        'https://images.unsplash.com/photo-1502767089025-6572583495b9',
        'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
        'https://images.unsplash.com/photo-1516726817505-f5ed825624d8',
        'https://images.unsplash.com/photo-1522556189639-b150ed9c4330'
    ];

    -- Variables for each user
    curr_user_id UUID;
    curr_gender TEXT;
    curr_name TEXT;
    curr_dob DATE;
    curr_neighborhood TEXT;
    curr_zip TEXT;
    curr_bio TEXT;
    curr_kink TEXT;
    curr_looking_for TEXT;
    curr_zodiac TEXT;
    curr_religion TEXT;
    curr_has_kids BOOLEAN;
    curr_wants_kids TEXT;
    curr_alcohol TEXT;
    curr_weed TEXT;
    curr_lat FLOAT;
    curr_lng FLOAT;
    curr_prompts JSONB;
    num_photos INT;
    photo_url TEXT;
    base_lat FLOAT := 40.7128;
    base_lng FLOAT := -74.0060;
    prompt_idx1 INT;
    prompt_idx2 INT;
    prompt_idx3 INT;

BEGIN
    -- Generate 200 user IDs
    FOR i IN 1..200 LOOP
        user_ids := array_append(user_ids, uuid_generate_v4());
    END LOOP;

    -- Create all users
    FOR i IN 1..200 LOOP
        INSERT INTO users (id, email, password_hash, email_verified, phone, phone_verified)
        VALUES (
            user_ids[i],
            'user' || i || '@test.com',
            '$2a$10$OgeFr4mPLnta7Wil2JiW1un8Xl21FxpXUU0agxdYxPNRfENtNQdKK', -- password: password123
            true,
            '212555' || LPAD(i::TEXT, 4, '0'),
            true
        );
    END LOOP;

    -- Create profiles for each user
    FOR i IN 1..200 LOOP
        -- Assign gender (60% women, 35% men, 5% non-binary)
        IF i <= 120 THEN
            curr_gender := 'woman';
            curr_name := women_names[1 + ((i - 1) % array_length(women_names, 1))];
        ELSIF i <= 190 THEN
            curr_gender := 'man';
            curr_name := men_names[1 + ((i - 121) % array_length(men_names, 1))];
        ELSE
            curr_gender := 'non_binary';
            curr_name := nb_names[1 + ((i - 191) % array_length(nb_names, 1))];
        END IF;

        -- Random DOB (ages 21-45)
        curr_dob := DATE '1980-01-01' + (floor(random() * 8766))::INT;
        IF curr_dob > DATE '2005-02-25' THEN
            curr_dob := curr_dob - INTERVAL '10 years';
        END IF;
        IF curr_dob < DATE '1980-01-01' THEN
            curr_dob := DATE '1990-01-01' + (floor(random() * 3650))::INT;
        END IF;

        -- Assign neighborhood and zip
        curr_neighborhood := neighborhoods[1 + (i % array_length(neighborhoods, 1))];
        curr_zip := zip_codes[1 + (i % array_length(zip_codes, 1))];

        -- Assign bio
        curr_bio := bio_templates[1 + (i % array_length(bio_templates, 1))];

        -- Assign kink level
        curr_kink := kink_levels[1 + (i % array_length(kink_levels, 1))];

        -- Assign looking for
        curr_looking_for := looking_for_opts[1 + (i % array_length(looking_for_opts, 1))];

        -- Assign zodiac
        curr_zodiac := zodiacs[1 + (i % array_length(zodiacs, 1))];

        -- Assign religion (some null)
        IF i % 4 = 0 THEN
            curr_religion := NULL;
        ELSE
            curr_religion := religions[1 + (i % (array_length(religions, 1) - 1))];
        END IF;

        -- Assign has_kids (10% have kids)
        curr_has_kids := (i % 10 = 0);

        -- Assign wants_kids
        IF i % 5 = 0 THEN
            curr_wants_kids := NULL;
        ELSE
            curr_wants_kids := wants_kids_opts[1 + (i % (array_length(wants_kids_opts, 1) - 2))];
        END IF;

        -- Assign alcohol
        IF i % 6 = 0 THEN
            curr_alcohol := NULL;
        ELSE
            curr_alcohol := alcohol_opts[1 + (i % (array_length(alcohol_opts, 1) - 1))];
        END IF;

        -- Assign weed
        IF i % 7 = 0 THEN
            curr_weed := NULL;
        ELSE
            curr_weed := weed_opts[1 + (i % (array_length(weed_opts, 1) - 1))];
        END IF;

        -- Assign location (NYC area with slight variations)
        curr_lat := base_lat + (random() - 0.5) * 0.1;
        curr_lng := base_lng + (random() - 0.5) * 0.1;

        -- Generate prompts (3 per profile) with unique IDs
        prompt_idx1 := 1 + (i % array_length(prompt_questions, 1));
        prompt_idx2 := 1 + ((i + 3) % array_length(prompt_questions, 1));
        prompt_idx3 := 1 + ((i + 7) % array_length(prompt_questions, 1));

        curr_prompts := jsonb_build_array(
            jsonb_build_object('id', 'prompt_' || i || '_1', 'question', prompt_questions[prompt_idx1], 'answer', prompt_answers[1 + (i % array_length(prompt_answers, 1))]),
            jsonb_build_object('id', 'prompt_' || i || '_2', 'question', prompt_questions[prompt_idx2], 'answer', prompt_answers[1 + ((i + 5) % array_length(prompt_answers, 1))]),
            jsonb_build_object('id', 'prompt_' || i || '_3', 'question', prompt_questions[prompt_idx3], 'answer', prompt_answers[1 + ((i + 11) % array_length(prompt_answers, 1))])
        );

        INSERT INTO profiles (user_id, name, dob, gender, zip_code, neighborhood, bio, kink_level, looking_for, zodiac, religion, has_kids, wants_kids, alcohol, weed, lat, lng, is_verified, last_active, prompts)
        VALUES (
            user_ids[i],
            curr_name,
            curr_dob,
            curr_gender,
            curr_zip,
            curr_neighborhood,
            curr_bio,
            curr_kink,
            curr_looking_for,
            curr_zodiac,
            curr_religion,
            curr_has_kids,
            curr_wants_kids,
            curr_alcohol,
            curr_weed,
            curr_lat,
            curr_lng,
            (i % 3 != 0), -- 66% verified
            NOW() - (floor(random() * 30) || ' days')::INTERVAL, -- Random last active within 30 days
            curr_prompts
        );
    END LOOP;

    -- Add photos for each user (2-4 photos each)
    FOR i IN 1..200 LOOP
        num_photos := 2 + (i % 3); -- 2, 3, or 4 photos

        FOR j IN 1..num_photos LOOP
            IF i <= 120 THEN
                photo_url := women_photos[1 + ((i + j) % array_length(women_photos, 1))] || '?w=800&h=1000&fit=crop&sig=' || i || j;
            ELSIF i <= 190 THEN
                photo_url := men_photos[1 + ((i + j) % array_length(men_photos, 1))] || '?w=800&h=1000&fit=crop&sig=' || i || j;
            ELSE
                photo_url := nb_photos[1 + ((i + j) % array_length(nb_photos, 1))] || '?w=800&h=1000&fit=crop&sig=' || i || j;
            END IF;

            INSERT INTO photos (user_id, url, position)
            VALUES (user_ids[i], photo_url, j);
        END LOOP;
    END LOOP;

    -- Add preferences for each user
    FOR i IN 1..200 LOOP
        INSERT INTO preferences (user_id, genders_seeking, age_min, age_max, distance_miles, include_trans, visible_to_genders)
        VALUES (
            user_ids[i],
            CASE
                WHEN i % 5 = 0 THEN ARRAY['woman']
                WHEN i % 5 = 1 THEN ARRAY['man']
                WHEN i % 5 = 2 THEN ARRAY['man', 'woman']
                WHEN i % 5 = 3 THEN ARRAY['man', 'woman', 'non_binary']
                ELSE ARRAY['woman', 'non_binary']
            END,
            21,
            45,
            25 + (i % 50),
            true,
            ARRAY['man', 'woman', 'non_binary']
        );
    END LOOP;

    -- Initialize credits for all users
    FOR i IN 1..200 LOOP
        INSERT INTO credits (user_id, balance, bonus_likes)
        VALUES (user_ids[i], 50 + (i % 100), 5 + (i % 10));
    END LOOP;

END $$;
