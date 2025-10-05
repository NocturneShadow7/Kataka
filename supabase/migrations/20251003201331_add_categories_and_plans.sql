/*
  # Ajout des catégories, forfaits SIM et mise à jour des tables

  1. Nouvelles Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, nom de la catégorie)
      - `description` (text, description optionnelle)
      - `created_at` (timestamptz)
    
    - `sim_plans`
      - `id` (uuid, primary key)
      - `name` (text, nom du forfait)
      - `description` (text, description)
      - `data_limit` (text, limite de données)
      - `price` (numeric, prix du forfait)
      - `duration_days` (integer, durée en jours)
      - `created_at` (timestamptz)

  2. Modifications
    - Ajout de `category_id` à la table `products`
    - Ajout de `plan_id` à la table `sims` (subscription_type existe déjà)

  3. Sécurité
    - Enable RLS sur les nouvelles tables
    - Policies pour accès admin et lecture client
*/

-- Créer la table categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
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

CREATE POLICY "Everyone can view categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Créer la table sim_plans (forfaits SIM)
CREATE TABLE IF NOT EXISTS sim_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  data_limit text,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sim_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sim plans"
  ON sim_plans
  FOR ALL
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

CREATE POLICY "Everyone can view sim plans"
  ON sim_plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Ajouter category_id à la table products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ajouter plan_id à la table sims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sims' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE sims ADD COLUMN plan_id uuid REFERENCES sim_plans(id) ON DELETE SET NULL;
  END IF;
END $$;