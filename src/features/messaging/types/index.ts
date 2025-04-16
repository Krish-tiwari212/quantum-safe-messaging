import { Database } from '@/libs/supabase/types';

export type Contact = {
  id: string;
  user_id: string;
  contact_user_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'accepted' | 'blocked';
};

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  metadata: {
    name?: string;
    isGroup?: boolean;
    avatar?: string;
    lastMessage?: string;
    lastMessageTime?: string;
  };
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  public_key: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  iv: string | null;
  encryption_metadata: {
    algorithm?: string;
    keyEncapsulation?: string;
    keySize?: number;
  };
  created_at: string;
  updated_at: string;
  metadata: {
    isRead?: boolean;
    readBy?: string[];
    deliveredTo?: string[];
    clientId?: string; // For optimistic updates
  };
};

export type UserProfileWithKeys = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  public_key?: string | null;
  publicKeyAlgorithm?: string;
  email?: string; // Add email field
};

// For encrypted message payload in transit
export type EncryptedMessagePayload = {
  encapsulatedKeys: Record<string, string>; // participant_id -> encapsulated key
  message: {
    encrypted_content: string;
    iv: string;
    algorithm: string;
  };
  metadata?: {
    clientId?: string;
  };
};