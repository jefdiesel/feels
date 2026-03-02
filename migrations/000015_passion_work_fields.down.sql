-- Remove passion and work fields from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS work_for_money;
ALTER TABLE profiles DROP COLUMN IF EXISTS work_for_passion;
