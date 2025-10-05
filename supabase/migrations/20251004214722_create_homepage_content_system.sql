/*
  # Create Homepage Content Management System

  ## New Tables

  ### `homepage_content`
  - `id` (uuid, primary key)
  - `section` (text) - Section identifier (hero, features, stats, cta, etc.)
  - `key` (text) - Content key within the section
  - `value` (text) - Content value (can be JSON for complex data)
  - `type` (text) - Type of content (text, image_url, number, json)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS
  - Only admins can update
  - Everyone can read

  ## Notes
  This allows complete control over homepage content without code changes.
*/

CREATE TABLE IF NOT EXISTS homepage_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image_url', 'number', 'json')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section, key)
);

ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view homepage content"
  ON homepage_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update homepage content"
  ON homepage_content FOR UPDATE
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

CREATE POLICY "Admins can insert homepage content"
  ON homepage_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_homepage_content_section ON homepage_content(section);

CREATE OR REPLACE FUNCTION update_homepage_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_homepage_content_timestamp
  BEFORE UPDATE ON homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_content_timestamp();

INSERT INTO homepage_content (section, key, value, type) VALUES
  ('hero', 'title', 'Gérez vos cartes SIM professionnelles en toute simplicité', 'text'),
  ('hero', 'subtitle', 'Solution complète pour la gestion de vos cartes SIM d''entreprise avec Interkom', 'text'),
  ('hero', 'cta_primary', 'Commencer maintenant', 'text'),
  ('hero', 'cta_secondary', 'En savoir plus', 'text'),
  ('hero', 'background_image', '', 'image_url'),
  
  ('stats', 'stat1_number', '500+', 'text'),
  ('stats', 'stat1_label', 'Cartes SIM gérées', 'text'),
  ('stats', 'stat2_number', '99.9%', 'text'),
  ('stats', 'stat2_label', 'Disponibilité', 'text'),
  ('stats', 'stat3_number', '24/7', 'text'),
  ('stats', 'stat3_label', 'Support technique', 'text'),
  
  ('feature1', 'icon', 'Shield', 'text'),
  ('feature1', 'title', 'Sécurisé', 'text'),
  ('feature1', 'description', 'Vos données sont protégées avec un chiffrement de niveau bancaire', 'text'),
  
  ('feature2', 'icon', 'Zap', 'text'),
  ('feature2', 'title', 'Rapide', 'text'),
  ('feature2', 'description', 'Gestion instantanée de vos cartes SIM en quelques clics', 'text'),
  
  ('feature3', 'icon', 'Users', 'text'),
  ('feature3', 'title', 'Collaboratif', 'text'),
  ('feature3', 'description', 'Partagez et gérez les accès avec votre équipe facilement', 'text'),
  
  ('feature4', 'icon', 'BarChart', 'text'),
  ('feature4', 'title', 'Analytique', 'text'),
  ('feature4', 'description', 'Suivez votre consommation avec des rapports détaillés', 'text'),
  
  ('cta', 'title', 'Prêt à commencer ?', 'text'),
  ('cta', 'description', 'Rejoignez des centaines d''entreprises qui font confiance à Interkom', 'text'),
  ('cta', 'button_text', 'Créer un compte', 'text'),
  
  ('footer', 'copyright', '© 2024 Interkom. Tous droits réservés.', 'text'),
  ('footer', 'description', 'La solution de gestion de cartes SIM pour les professionnels', 'text')
ON CONFLICT (section, key) DO NOTHING;
