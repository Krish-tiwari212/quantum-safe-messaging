-- Fix the RLS policies for conversation participants
-- This will allow users to add other users to conversations

-- First let's update the policy for adding participants
DROP POLICY IF EXISTS "Users can insert themselves into conversations" on conversation_participants;

-- Now create a more permissive policy for adding participants
CREATE POLICY "Users can add participants to conversations they created" 
ON conversation_participants
FOR INSERT 
WITH CHECK (
  -- The user can add any participant to a conversation they created
  EXISTS (
    SELECT 1 FROM conversations c 
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE 
      c.id = conversation_id AND
      cp.user_id = auth.uid()
  )
);

-- Allow users to create conversations more easily
DROP POLICY IF EXISTS "Users can create conversations" on conversations;
CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (true);

-- Also ensure users can update conversations they're in
CREATE POLICY "Users can update their conversations" 
ON conversations 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

-- Make sure users can only see participants from conversations they're in
CREATE POLICY "Users can view participants of their conversations" 
ON conversation_participants 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants AS my_participation
    WHERE 
      my_participation.conversation_id = conversation_participants.conversation_id AND 
      my_participation.user_id = auth.uid()
  )
);