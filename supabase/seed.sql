-- =============================================================
-- Alt-F4 Bucks — Seed Data
-- Run AFTER schema.sql and after creating test users via Auth
-- =============================================================
-- NOTE: You must first create users in Supabase Auth.
-- The trigger will auto-create profiles.
-- Then update their roles and add sample data below.
--
-- Example: create users in Supabase dashboard or via SQL:
--   select supabase_auth.create_user('manager@team7558.com', 'password123');
--   select supabase_auth.create_user('member1@team7558.com', 'password123');
--   etc.

-- After users are created, update roles for managers:
-- UPDATE public.profiles SET role = 'manager' WHERE display_name = 'manager@team7558.com';
-- UPDATE public.profiles SET role = 'admin' WHERE display_name = 'admin@team7558.com';

-- Sample store items
insert into public.store_items (name, description, price, stock, active) values
  ('Team Sticker Pack', 'A pack of 5 custom FRC 7558 stickers', 50, 100, true),
  ('Alt-F4 T-Shirt', 'Official team t-shirt with the Alt-F4 logo', 200, 30, true),
  ('Snack Voucher', 'Redeemable for one snack during meetings', 25, null, true),
  ('Priority Build Access', 'Skip the line for the next build session', 150, 5, true),
  ('Custom 3D Print', 'One custom 3D print (small, under 50g)', 300, 10, true),
  ('Team Hoodie', 'Warm hoodie with team branding', 400, 15, true),
  ('Mentor Lunch Pass', 'Lunch with a team mentor of your choice', 500, 3, true),
  ('Robot Naming Rights', 'Name the next competition robot', 1000, 1, true);
