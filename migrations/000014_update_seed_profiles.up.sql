-- Update seed profiles with correct field values and prompt IDs

-- Fix wants_kids values to match frontend
UPDATE profiles SET wants_kids = 'want' WHERE wants_kids = 'want_kids';
UPDATE profiles SET wants_kids = 'dont_want' WHERE wants_kids = 'dont_want_kids';
UPDATE profiles SET wants_kids = 'open' WHERE wants_kids = 'open_to_kids';
UPDATE profiles SET wants_kids = 'want' WHERE wants_kids = 'have_kids_want_more';
UPDATE profiles SET wants_kids = 'dont_want' WHERE wants_kids = 'have_kids_done';

-- Fix alcohol values to match frontend (rarely -> socially, often -> regularly)
UPDATE profiles SET alcohol = 'socially' WHERE alcohol = 'rarely';
UPDATE profiles SET alcohol = 'regularly' WHERE alcohol = 'often';

-- Fix weed values to match frontend (rarely -> socially, often -> regularly)
UPDATE profiles SET weed = 'socially' WHERE weed = 'rarely';
UPDATE profiles SET weed = 'regularly' WHERE weed = 'often';

-- Add IDs to prompts that don't have them
DO $$
DECLARE
    r RECORD;
    new_prompts JSONB;
    elem JSONB;
    idx INT;
BEGIN
    FOR r IN SELECT user_id, prompts FROM profiles WHERE prompts IS NOT NULL AND jsonb_array_length(prompts) > 0 LOOP
        -- Check if prompts already have IDs
        IF (SELECT COUNT(*) FROM jsonb_array_elements(r.prompts) e WHERE e->>'id' IS NOT NULL) = 0 THEN
            new_prompts := '[]'::jsonb;
            idx := 1;
            FOR elem IN SELECT * FROM jsonb_array_elements(r.prompts) LOOP
                new_prompts := new_prompts || jsonb_build_array(
                    elem || jsonb_build_object('id', 'prompt_' || r.user_id::text || '_' || idx::text)
                );
                idx := idx + 1;
            END LOOP;
            UPDATE profiles SET prompts = new_prompts WHERE user_id = r.user_id;
        END IF;
    END LOOP;
END $$;
