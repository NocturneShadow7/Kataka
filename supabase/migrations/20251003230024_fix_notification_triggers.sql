/*
  # Fix Notification Triggers

  1. Changes
    - Update functions to use correct schema references (auth.users instead of users)
    - Fix function to properly retrieve user data from auth schema
    
  2. Security
    - Functions remain SECURITY DEFINER to bypass RLS
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
  SELECT au.raw_user_meta_data->>'full_name' INTO client_name
  FROM auth.users au
  WHERE au.id = NEW.client_id;

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

  SELECT p.full_name, p.role INTO sender_name, sender_role
  FROM profiles p
  WHERE p.user_id = NEW.sender_id;

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