-- Revert looking_for from TEXT[] back to TEXT
ALTER TABLE profiles
ALTER COLUMN looking_for TYPE TEXT
USING looking_for[1];
