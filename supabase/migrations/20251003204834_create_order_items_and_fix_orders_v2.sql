/*
  # Créer la table order_items et mettre à jour les structures pour le flux d'achat

  1. Nouvelles Tables
    - `order_items` : Lignes de commande pour gérer plusieurs produits par commande
      - `id` (uuid, primary key)
      - `order_id` (uuid, référence vers orders)
      - `product_id` (uuid, référence vers products)
      - `quantity` (integer) - Quantité commandée
      - `unit_price` (numeric) - Prix unitaire au moment de l'achat
      - `subtotal` (numeric) - Sous-total (quantity * unit_price)
      - `created_at` (timestamptz)

  2. Modifications
    - Ajouter une contrainte d'unicité sur `payment_code` dans payments
    - Modifier les statuts orders pour correspondre au spec (pending, paid, canceled)
    - Mettre à jour invoices status pour inclure draft, pending, paid
    - Ajouter order_id dans invoices

  3. Sécurité
    - RLS activée sur order_items
    - Policies pour clients (voir leurs propres items) et admin (tout voir)
*/

-- Créer la table order_items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS sur order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies pour order_items
CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ajouter order_id dans invoices si pas déjà présent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN order_id uuid REFERENCES orders(id);
  END IF;
END $$;

-- Ajouter contrainte d'unicité sur payment_code dans payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_payment_code_unique'
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_payment_code_unique UNIQUE (payment_code);
  END IF;
END $$;

-- Mettre à jour les contraintes de statut pour orders
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'canceled'::text]));
END $$;

-- Mettre à jour unpaid vers pending dans invoices avant de changer la contrainte
UPDATE invoices SET status = 'pending' WHERE status = 'unpaid';

-- Mettre à jour les contraintes de statut pour invoices (ajouter draft)
DO $$
BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
    CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'paid'::text]));
END $$;

-- Changer la valeur par défaut de invoices.status
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'draft';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id);
CREATE INDEX IF NOT EXISTS payments_payment_code_idx ON payments(payment_code);
CREATE INDEX IF NOT EXISTS orders_client_id_idx ON orders(client_id);
CREATE INDEX IF NOT EXISTS invoices_order_id_idx ON invoices(order_id);
