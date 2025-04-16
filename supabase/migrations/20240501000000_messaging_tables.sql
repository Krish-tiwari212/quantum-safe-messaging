/**
 * MESSAGING SYSTEM TABLES
 * These tables will support the core functionality of our quantum-safe messaging app
 */

-- Contacts table to manage user connections
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  contact_user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  
  -- Prevent duplicate contacts
  unique(user_id, contact_user_id)
);
alter table contacts enable row level security;
create policy "Users can view their own contacts" on contacts for select using (auth.uid() = user_id);
create policy "Users can insert their own contacts" on contacts for insert with check (auth.uid() = user_id);
create policy "Users can update their own contacts" on contacts for update using (auth.uid() = user_id);
create policy "Users can delete their own contacts" on contacts for delete using (auth.uid() = user_id);

-- Conversations table to group messages between users
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Metadata can contain conversation name, avatar, etc.
  metadata jsonb default '{}'::jsonb
);
alter table conversations enable row level security;

-- Junction table to associate users with conversations
create table conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations not null,
  user_id uuid references auth.users not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- The public key for this user in this conversation (for quantum-safe encryption)
  public_key text,
  
  -- Prevent duplicate participants
  unique(conversation_id, user_id)
);
alter table conversation_participants enable row level security;
create policy "Users can view conversations they are in" on conversation_participants for select using (auth.uid() = user_id);
create policy "Users can insert themselves into conversations" on conversation_participants for insert with check (auth.uid() = user_id);

-- Make conversations visible to participants only
create policy "Users can view their conversations" on conversations for select 
using (
  exists (
    select 1 from conversation_participants 
    where conversation_id = conversations.id and user_id = auth.uid()
  )
);

create policy "Users can create conversations" on conversations for insert 
with check (
  true  -- We'll handle permissions in the application code
);

-- Messages table for storing encrypted messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations not null,
  sender_id uuid references auth.users not null,
  -- The actual message content is encrypted client-side before storage
  encrypted_content text not null,
  -- IV (Initialization Vector) required for some encryption methods
  iv text,
  -- For quantum-safe encryption details
  encryption_metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Optional client-side message metadata like "read" status
  metadata jsonb default '{}'::jsonb
);
alter table messages enable row level security;
create policy "Users can view messages in their conversations" on messages for select 
using (
  exists (
    select 1 from conversation_participants 
    where conversation_id = messages.conversation_id and user_id = auth.uid()
  )
);
create policy "Users can send messages to their conversations" on messages for insert 
with check (
  auth.uid() = sender_id AND
  exists (
    select 1 from conversation_participants 
    where conversation_id = messages.conversation_id and user_id = auth.uid()
  )
);

-- Update the existing realtime publication to include our new tables
alter publication supabase_realtime add table messages, conversations, conversation_participants;

-- Function to update the 'updated_at' timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers to automatically update 'updated_at' fields
create trigger update_contacts_updated_at
before update on contacts
for each row execute procedure update_updated_at();

create trigger update_conversations_updated_at
before update on conversations
for each row execute procedure update_updated_at();

create trigger update_messages_updated_at
before update on messages
for each row execute procedure update_updated_at();

-- Update conversation's updated_at when new messages are added
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations 
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger update_conversation_timestamp
after insert on messages
for each row execute procedure update_conversation_timestamp();