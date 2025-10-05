/*
  # Enable realtime for conversations table

  1. Changes
    - Enable realtime replication for the conversations table
    - This allows the conversation list to update automatically
*/

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;