-- Fix the infinite recursion issue in the conversation participants policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON conversation_participants;

-- Create simpler policies that don't cause recursion
-- First policy: Allow users to add themselves or others as the first participant in a conversation
CREATE POLICY "Users can add first participant to conversation"
ON conversation_participants
FOR INSERT
WITH CHECK (
  -- The conversation must not have any participants yet
  NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_participants.conversation_id
  )
);

-- Second policy: Allow users to add others to conversations they're already in
CREATE POLICY "Users can add others to conversations they are in"
ON conversation_participants
FOR INSERT
WITH CHECK (
  -- The current user must already be a participant in this conversation
  EXISTS (
    SELECT 1 FROM conversation_participants existing
    WHERE 
      existing.conversation_id = conversation_participants.conversation_id AND
      existing.user_id = auth.uid()
  )
);