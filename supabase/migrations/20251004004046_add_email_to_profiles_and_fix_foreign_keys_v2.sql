/*
  # Add email to profiles and fix foreign keys

  1. Changes to profiles table
    - Add `email` column (text, unique, not null)
    - Populate email from auth.users
  
  2. Changes to orders table
    - Add foreign key from client_id to profiles(user_id)
  
  3. Changes to invoices table
    - Delete orphaned invoices
    - Add foreign key from client_id to profiles(user_id)
  
  4. Changes to messages table
    - Add foreign key from sender_id to profiles(user_id)
  
  5. Changes to conversations table
    - Add foreign key from client_id to profiles(user_id)
*/

-- Add email column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Populate email from auth.users
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.user_id = auth.users.id AND profiles.email IS NULL;

-- Make email NOT NULL and UNIQUE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_email_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- Delete orphaned invoices
DELETE FROM invoices 
WHERE client_id NOT IN (SELECT user_id FROM profiles);

-- Delete orphaned conversations
DELETE FROM conversations 
WHERE client_id NOT IN (SELECT user_id FROM profiles);

-- Add foreign key from orders.client_id to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_client_id_fkey_profiles'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_client_id_fkey_profiles 
    FOREIGN KEY (client_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from invoices.client_id to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_client_id_fkey_profiles'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_client_id_fkey_profiles 
    FOREIGN KEY (client_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from messages.sender_id to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_sender_id_fkey_profiles'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_sender_id_fkey_profiles 
    FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from conversations.client_id to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversations_client_id_fkey_profiles'
  ) THEN
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_client_id_fkey_profiles 
    FOREIGN KEY (client_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;