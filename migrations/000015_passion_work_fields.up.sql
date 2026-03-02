-- Add passion and work fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_for_money TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_for_passion TEXT;
