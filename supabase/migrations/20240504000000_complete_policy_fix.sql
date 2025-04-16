-- Complete policy fix for conversation participants
-- First, drop ALL existing policies for conversation_participants to start fresh
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'conversation_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON conversation_participants', policy_name);
    END LOOP;
END
$$;

-- And for conversations too, just to be safe
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'conversations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON conversations', policy_name);
    END LOOP;
END
$$;

-- Now create simple, straightforward policies:

-- 1. Users can view conversations they are in
CREATE POLICY "Users can view their conversations" 
ON conversations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
);

-- 2. Anyone can create a conversation
CREATE POLICY "Anyone can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (true);

-- 3. Users can update conversations they are in
CREATE POLICY "Users can update conversations they are in" 
ON conversations 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
);

-- 4. Users can see participants in conversations they're in
CREATE POLICY "Users can view participants of their conversations" 
ON conversation_participants 
FOR SELECT 
USING (
    auth.uid() IN (
        SELECT user_id FROM conversation_participants AS cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
    )
);

-- 5. Very simple policy: users can add ANY participants when inserting
CREATE POLICY "Users can add participants" 
ON conversation_participants 
FOR INSERT 
WITH CHECK (true);

-- 6. Users can only update their own participant records
CREATE POLICY "Users can update their own participant records" 
ON conversation_participants 
FOR UPDATE 
USING (user_id = auth.uid());

-- 7. Users can only delete their own participant records (leaving a conversation)
CREATE POLICY "Users can delete their own participant records" 
ON conversation_participants 
FOR DELETE 
USING (user_id = auth.uid());

-- Ensure the realtime publication includes these tables
-- Using DO block to safely add each table to avoid the "already member of publication" error
DO $$
DECLARE
  table_exists INTEGER;
BEGIN
  -- Check and add conversation_participants if not already in publication
  SELECT count(*) INTO table_exists FROM pg_publication_tables 
  WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants';
  
  IF table_exists = 0 THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants';
  END IF;

  -- Check and add messages if not already in publication
  SELECT count(*) INTO table_exists FROM pg_publication_tables 
  WHERE pubname = 'supabase_realtime' AND tablename = 'messages';
  
  IF table_exists = 0 THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
  END IF;
END
$$;