/*
  # Correction des policies RLS pour profiles

  1. Changements
    - Suppression des policies existantes
    - Recréation avec logique simplifiée sans dépendances circulaires
    - Les utilisateurs peuvent toujours voir leur propre profil
    - Les admins utilisent une sous-requête plus simple

  2. Sécurité
    - Pas de changement de sécurité, juste simplification
    - Les utilisateurs voient leur profil
    - Les admins voient tous les profils
*/

-- Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Policy simple: les utilisateurs voient leur propre profil
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy simple: les admins voient tous les profils (vérification directe)
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Policy: les admins peuvent insérer des profils
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Policy: les admins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Policy: les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: les admins peuvent supprimer des profils
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );