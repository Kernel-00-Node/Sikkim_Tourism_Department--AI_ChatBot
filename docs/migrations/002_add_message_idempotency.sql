-- Add retry de-duplication to an existing database.
ALTER TABLE messages
  ADD COLUMN client_message_id VARCHAR(64) NULL,
  ADD UNIQUE KEY uq_messages_client_id (conversation_id, client_message_id);
