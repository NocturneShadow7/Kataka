/*
  # Correction de la récursion infinie dans les policies

  1. Changements
    - Suppression de toutes les policies qui font des sous-requêtes récursives
    - Utilisation de policies simples sans vérification de rôle pour SELECT
    - Les vérifications de rôle admin se feront côté application

  2. Sécurité
    - Tous les utilisateurs authentifiés peuvent voir tous les profils
    - Seuls les admins peuvent modifier/supprimer via l'Edge Function
    - Les utilisateurs peuvent modifier leur propre profil
*/

-- Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Policy ultra-simple: tous les utilisateurs authentifiés peuvent voir les profils
-- La restriction par rôle sera gérée par l'application
CREATE POLICY "Authenticated users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Les utilisateurs peuvent modifier leur propre profil uniquement
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pas de policy INSERT/DELETE publique
-- Ces opérations se feront uniquement via l'Edge Function avec service role