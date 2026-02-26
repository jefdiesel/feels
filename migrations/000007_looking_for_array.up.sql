-- Change looking_for from TEXT to TEXT[] to support multiple options
ALTER TABLE profiles
ALTER COLUMN looking_for TYPE TEXT[]
USING CASE
    WHEN looking_for IS NULL THEN NULL
    ELSE ARRAY[looking_for]
END;
