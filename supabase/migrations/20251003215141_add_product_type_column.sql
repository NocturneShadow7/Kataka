/*
  # Ajouter colonne product_type aux produits

  1. Modifications
    - Ajouter `product_type` dans products (SIM ou Article)
    - Par défaut: 'Article'
    - Seuls les produits de type 'SIM' bénéficient des réductions intelligentes

  2. Notes
    - Les calculs de réduction ne s'appliquent que sur les produits de type 'SIM'
    - Les articles standards sont vendus sans réduction de quantité
*/

-- Ajouter la colonne product_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type text DEFAULT 'Article';
    ALTER TABLE products ADD CONSTRAINT product_type_check CHECK (product_type IN ('SIM', 'Article'));
  END IF;
END $$;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS products_product_type_idx ON products(product_type);

-- Mettre à jour les produits existants qui ont des données mobiles comme étant des SIM
UPDATE products 
SET product_type = 'SIM' 
WHERE data_limit IS NOT NULL 
  AND data_limit != '';
