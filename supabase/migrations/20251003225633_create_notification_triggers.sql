/*
  # Create Notification Triggers

  1. Functions Created
    - `notify_admins_new_order()` - Notifies all admins when a new order is created
    - `notify_client_invoice_status()` - Notifies client when invoice status changes
    - `notify_admins_new_message()` - Notifies all admins when client sends message
    - `notify_client_new_message()` - Notifies client when admin sends message
    
  2. Triggers Created
    - Orders table: After insert, notify all admins
    - Invoices table: After update on status, notify client
    - Messages table: After insert, notify recipients
    
  3. Security
    - Functions run with SECURITY DEFINER to bypass RLS for notification insertion
*/

CREATE OR REPLACE FUNCTION notify_admins_new_order()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_rec RECORD;
  client_name TEXT;
BEGIN
  SELECT full_name INTO client_name
  FROM users
  WHERE id = NEW.client_id;

  FOR admin_rec IN 
    SELECT user_id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, related_id, priority)
    VALUES (
      admin_rec.user_id,
      'order_created',
      'Nouvelle commande',
      'Commande ' || NEW.order_number || ' créée par ' || COALESCE(client_name, 'client') || ' - Montant: ' || NEW.total_amount || '€',
      NEW.id,
      'high'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_client_invoice_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  status_text TEXT;
  notif_type TEXT;
  notif_priority TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'paid' THEN
      status_text := 'confirmée';
      notif_type := 'invoice_confirmed';
      notif_priority := 'high';
    ELSIF NEW.status = 'unpaid' THEN
      status_text := 'rejetée';
      notif_type := 'invoice_rejected';
      notif_priority := 'urgent';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO notifications (user_id, type, title, message, related_id, priority)
    VALUES (
      NEW.client_id,
      notif_type,
      'Facture ' || status_text,
      'Votre facture ' || NEW.invoice_number || ' a été ' || status_text || '.',
      NEW.id,
      notif_priority
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_message_recipients()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  conv_rec RECORD;
  sender_name TEXT;
  sender_role TEXT;
  admin_rec RECORD;
BEGIN
  SELECT client_id INTO conv_rec
  FROM conversations
  WHERE id = NEW.conversation_id;

  SELECT full_name, role INTO sender_name, sender_role
  FROM users u
  JOIN profiles p ON p.user_id = u.id
  WHERE u.id = NEW.sender_id;

  IF sender_role = 'client' THEN
    FOR admin_rec IN 
      SELECT user_id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, related_id, priority)
      VALUES (
        admin_rec.user_id,
        'new_message',
        'Nouveau message client',
        COALESCE(sender_name, 'Un client') || ' a envoyé un message',
        NEW.conversation_id,
        'normal'
      );
    END LOOP;
  ELSE
    INSERT INTO notifications (user_id, type, title, message, related_id, priority)
    VALUES (
      conv_rec.client_id,
      'new_message',
      'Réponse du support',
      'Vous avez reçu une réponse du support',
      NEW.conversation_id,
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admins_new_order ON orders;
CREATE TRIGGER trigger_notify_admins_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_order();

DROP TRIGGER IF EXISTS trigger_notify_client_invoice_status ON invoices;
CREATE TRIGGER trigger_notify_client_invoice_status
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_invoice_status();

DROP TRIGGER IF EXISTS trigger_notify_message_recipients ON messages;
CREATE TRIGGER trigger_notify_message_recipients
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_recipients();