/*
  # Renommer subscription_type en sim_type et définir les valeurs
  
  1. Modifications
    - Renommer la colonne `subscription_type` en `sim_type` dans la table `sims`
    - Définir une valeur par défaut 'physical' pour les nouvelles SIM
    - Mettre à jour les valeurs existantes NULL vers 'physical'
  
  2. Notes
    - Les valeurs possibles sont 'physical' (Physique) ou 'virtual' (Virtuelle/eSIM)
*/

-- Mettre à jour les valeurs NULL existantes
UPDATE sims 
SET subscription_type = 'physical' 
WHERE subscription_type IS NULL;

-- Renommer la colonne
ALTER TABLE sims 
RENAME COLUMN subscription_type TO sim_type;

-- Définir une valeur par défaut
ALTER TABLE sims 
ALTER COLUMN sim_type SET DEFAULT 'physical';
