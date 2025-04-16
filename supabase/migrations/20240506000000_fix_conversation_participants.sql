-- Complete cleanup and fix for conversation_participants table policies

-- First, drop ALL policies on the table to start fresh
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'conversation_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON conversation_participants', policy_name);
    END LOOP;
END
$$;

-- Now create simple, clean policies

-- 1. Allow users to see participants in conversations they're part of
CREATE POLICY "view_conversation_participants" 
ON conversation_participants 
FOR SELECT 
USING (
    -- User can see participants in conversations they are part of
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM conversation_participants other_participant
        WHERE 
            other_participant.conversation_id = conversation_participants.conversation_id AND
            other_participant.user_id = auth.uid()
    )
);

-- 2. Allow users to insert their own participation record
CREATE POLICY "insert_own_participation" 
ON conversation_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 3. Allow users to insert other users' participation for conversations they're in
CREATE POLICY "insert_other_participation_for_own_conversations" 
ON conversation_participants 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversations c
        WHERE 
            c.id = conversation_participants.conversation_id
    )
);

-- 4. Allow users to update their own participation
CREATE POLICY "update_own_participation" 
ON conversation_participants 
FOR UPDATE 
USING (user_id = auth.uid());

-- 5. Allow users to delete their own participation
CREATE POLICY "delete_own_participation" 
ON conversation_participants 
FOR DELETE 
USING (user_id = auth.uid());