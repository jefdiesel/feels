-- Remove seed data (all 200 test users)
DELETE FROM users WHERE email LIKE 'user%@test.com';
