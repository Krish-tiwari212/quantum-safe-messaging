'use server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Conversation, ConversationParticipant } from '../types';

/**
 * Gets all conversations for the current authenticated user
 */
export async function getUserConversations(): Promise<Conversation[]> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not authenticated');
      return []; // Return empty array if user not authenticated
    }
    
    // Check if the tables exist by running a simple query with detailed logging
    try {
      console.log('Attempting to query conversation_participants table...');
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Database error checking conversation_participants:', error);
        return [];
      }
      
      console.log('Successfully accessed conversation_participants table');
    } catch (tableError) {
      console.error('Exception checking conversation_participants table:', tableError);
      return [];
    }
    
    // Get all conversations where the user is a participant
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);
    
    if (participationsError) {
      console.error('Error fetching participations:', participationsError);
      return []; // Return empty array on error instead of throwing
    }
    
    if (!participations || participations.length === 0) {
      console.log('No conversations found for user');
      return []; // Return empty array if no participations
    }
    
    // Get the conversation details
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', participations.map(p => p.conversation_id))
      .order('updated_at', { ascending: false });
    
    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return []; // Return empty array on error instead of throwing
    }
    
    return conversations || [];
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    return []; // Return empty array on any error instead of throwing
  }
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Get participants of a conversation
 */
export async function getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching conversation participants:', error);
    throw error;
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(participantIds: string[], metadata: any = {}): Promise<Conversation> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Make sure the current user is included in participants
    if (!participantIds.includes(user.id)) {
      participantIds.push(user.id);
    }
    
    console.log('Creating conversation with participants:', participantIds);
    
    // Use our new SQL function to create the conversation and add participants
    const { data, error } = await supabase
      .rpc('create_conversation_with_participants', {
        creator_id: user.id,
        participant_ids: participantIds,
        conversation_metadata: metadata
      });
    
    if (error) {
      console.error('Error calling create_conversation_with_participants:', error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
    
    const conversationId = data;
    if (!conversationId) {
      throw new Error('Failed to get conversation ID from SQL function');
    }
    
    // Get the full conversation details
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created conversation:', fetchError);
      throw fetchError;
    }
    
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Update a conversation's metadata
 */
export async function updateConversationMetadata(conversationId: string, metadata: any): Promise<Conversation> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('conversations')
      .update({ metadata })
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating conversation metadata:', error);
    throw error;
  }
}

/**
 * Add a participant to an existing conversation
 */
export async function addParticipantToConversation(conversationId: string, participantEmail: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Verify the current user is a participant in this conversation
    const { data: isParticipant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (participantError) throw participantError;
    if (!isParticipant) throw new Error('You are not a participant in this conversation');
    
    // Find the user to add by email
    const { data: userToAdd, error: userError } = await supabase
      .rpc('find_user_by_email', { search_email: participantEmail });
    
    if (userError) throw userError;
    if (!userToAdd) throw new Error('No user found with that email');
    
    // Check if the user is already a participant
    const { data: existingParticipant } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userToAdd.id)
      .maybeSingle();
    
    if (existingParticipant) {
      throw new Error('User is already a participant in this conversation');
    }
    
    // Add the new participant
    const { error: addError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userToAdd.id
      });
    
    if (addError) throw addError;
    
    // Update conversation metadata to reflect the new participant count
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('count', { count: 'exact' })
      .eq('conversation_id', conversationId);
    
    const participantCount = participants?.length || 0;
    
    // Get current metadata
    const { data: conversation } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', conversationId)
      .single();
    
    const currentMetadata = conversation?.metadata || {};
    
    // Update conversation metadata
    await supabase
      .from('conversations')
      .update({
        metadata: {
          ...currentMetadata,
          participantCount: participantCount
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    return true;
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
}