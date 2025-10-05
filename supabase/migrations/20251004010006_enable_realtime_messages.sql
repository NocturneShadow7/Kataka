/*
  # Enable realtime for messages table

  1. Changes
    - Enable realtime replication for the messages table
    - This allows the chat to update automatically when new messages are sent
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;