/*
  # Migration vers l'authentification native Supabase

  1. Changements
    - Suppression de la table users personnalisée
    - Utilisation de auth.users natif avec métadonnées
    - Création d'une table profiles liée à auth.users
    - Migration des policies RLS pour utiliser auth.uid()

  2. Nouvelles tables
    - profiles (lié à auth.users par user_id)
      - user_id (uuid, FK vers auth.users)
      - role (text, 'admin' ou 'client')
      - full_name (text)
      - created_at (timestamptz)

  3. Sécurité
    - RLS activé sur profiles
    - Les admins peuvent voir tous les profils
    - Les utilisateurs peuvent voir leur propre profil
*/

-- Supprimer l'ancienne table users si elle existe
DROP TABLE IF EXISTS users CASCADE;

-- Créer la table profiles
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy pour que les admins voient tous les profils
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy pour que les utilisateurs voient leur propre profil
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy pour que les admins puissent insérer des profils
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy pour que les admins puissent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy pour que les utilisateurs puissent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy pour que les admins puissent supprimer des profils
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );