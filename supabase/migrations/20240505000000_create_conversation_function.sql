-- Create a secure function to create conversations and add participants
-- This will bypass RLS policies and handle the creation in one transaction

CREATE OR REPLACE FUNCTION create_conversation_with_participants(
  creator_id UUID,
  participant_ids UUID[],
  conversation_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This ensures the function runs with the privileges of the creator
AS $$
DECLARE
  new_conversation_id UUID;
  participant_id UUID;
BEGIN
  -- Validate the creator is included in participants
  IF NOT creator_id = ANY(participant_ids) THEN
    participant_ids := array_append(participant_ids, creator_id);
  END IF;

  -- Create the conversation
  INSERT INTO conversations (metadata)
  VALUES (conversation_metadata)
  RETURNING id INTO new_conversation_id;

  -- Add all participants
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (new_conversation_id, participant_id);
  END LOOP;

  RETURN new_conversation_id;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION create_conversation_with_participants TO authenticated;