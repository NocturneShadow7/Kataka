/*
  # Create Settings and Contact Requests Tables

  ## 1. New Tables

  ### `contact_requests`
  - `id` (uuid, primary key)
  - `full_name` (text) - Name of the person requesting inscription
  - `email` (text) - Email address
  - `phone` (text) - Phone number
  - `message` (text, nullable) - Optional message
  - `status` (text) - Status: pending, approved, rejected
  - `created_at` (timestamptz) - Request date
  - `processed_at` (timestamptz, nullable) - Processing date
  - `processed_by` (uuid, nullable) - Admin who processed it

  ### `site_settings`
  - `id` (uuid, primary key)
  - `key` (text, unique) - Setting key
  - `value` (jsonb) - Setting value
  - `updated_at` (timestamptz) - Last update date
  - `updated_by` (uuid, nullable) - Admin who updated it

  ### `home_content`
  - `id` (uuid, primary key)
  - `section` (text) - Section identifier
  - `title` (text) - Section title
  - `subtitle` (text, nullable) - Section subtitle
  - `content` (text, nullable) - Section content
  - `image_url` (text, nullable) - Image URL
  - `order_position` (integer) - Display order
  - `is_active` (boolean) - Active/inactive
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for admins to manage everything
  - Add policies for users to view public content
  - Add policies for anonymous users to create contact requests
*/

-- Create contact_requests table
CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create a contact request
CREATE POLICY "Anyone can create contact requests"
  ON contact_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can view all contact requests
CREATE POLICY "Admins can view contact requests"
  ON contact_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update contact requests
CREATE POLICY "Admins can update contact requests"
  ON contact_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete contact requests
CREATE POLICY "Admins can delete contact requests"
  ON contact_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Anyone can view settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create home_content table
CREATE TABLE IF NOT EXISTS home_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  title text NOT NULL,
  subtitle text,
  content text,
  image_url text,
  order_position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE home_content ENABLE ROW LEVEL SECURITY;

-- Everyone can view active home content
CREATE POLICY "Anyone can view active home content"
  ON home_content FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admins can view all home content
CREATE POLICY "Admins can view all home content"
  ON home_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert home content
CREATE POLICY "Admins can insert home content"
  ON home_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update home content
CREATE POLICY "Admins can update home content"
  ON home_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete home content
CREATE POLICY "Admins can delete home content"
  ON home_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('maintenance_mode', '{"enabled": false}'::jsonb),
  ('secure_mode', '{"enabled": false, "code": ""}'::jsonb),
  ('captcha_enabled', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert default home content
INSERT INTO home_content (section, title, subtitle, content, order_position, is_active) VALUES
  ('hero', 'Bienvenue chez Interkom', 'Votre partenaire de confiance pour les cartes SIM 4G', 'Découvrez nos offres adaptées à vos besoins avec un service client réactif et des prix compétitifs.', 1, true),
  ('features', 'Nos Avantages', 'Pourquoi choisir Interkom ?', 'Profitez d''une couverture réseau optimale, de forfaits flexibles et d''un support technique disponible 7j/7.', 2, true),
  ('pricing', 'Nos Offres', 'Des tarifs adaptés à tous', 'Choisissez parmi nos différents forfaits celui qui correspond le mieux à votre utilisation.', 3, true)
ON CONFLICT DO NOTHING;
