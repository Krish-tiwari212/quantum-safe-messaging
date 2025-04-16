'use server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Message, EncryptedMessagePayload } from '../types';

/**
 * Get messages from a conversation
 */
export async function getConversationMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    throw error;
  }
}

/**
 * Send a new message to a conversation
 * Note: Message content must be encrypted client-side before sending
 */
export async function sendMessage(conversationId: string, encryptedContent: string, iv: string, encryptionMetadata: any = {}): Promise<Message> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Verify user is a participant of the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (participantError) throw participantError;
    if (!participant) throw new Error('You are not a participant of this conversation');
    
    // Insert the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        encrypted_content: encryptedContent,
        iv,
        encryption_metadata: encryptionMetadata
      })
      .select()
      .single();
    
    if (error) throw error;

    // Get user's email for the preview
    const { data: senderEmail } = await supabase
      .rpc('get_user_email_by_id', { user_id: user.id });
    
    // Create a proper message preview
    const messagePreview = senderEmail ? `${senderEmail}: New message` : "New encrypted message";
    
    // Update the conversation metadata with the last message info
    await updateConversationWithLastMessage(conversationId, messagePreview);

    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Updates the conversation with the last message and increments the message count
 */
async function updateConversationWithLastMessage(conversationId: string, lastMessagePreview: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current conversation metadata first
    const { data: conversation } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', conversationId)
      .single();
    
    const currentMetadata = conversation?.metadata || {};
    const messageCount = (currentMetadata.messageCount || 0) + 1;
    
    // Update the metadata
    const updatedMetadata = {
      ...currentMetadata,
      lastMessage: lastMessagePreview,
      messageCount: messageCount
    };
    
    // Update the conversation
    await supabase
      .from('conversations')
      .update({ 
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
      
  } catch (error) {
    console.error('Error updating conversation metadata:', error);
  }
}

/**
 * Update message metadata (e.g., mark as read)
 */
export async function updateMessageMetadata(messageId: string, metadata: any): Promise<Message> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First get the message to check permissions
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*, conversation_participants!inner(user_id)')
      .eq('messages.id', messageId)
      .eq('conversation_participants.user_id', user.id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!existingMessage) throw new Error('Message not found or not accessible');

    // Update the metadata
    const { data, error } = await supabase
      .from('messages')
      .update({
        metadata
      })
      .eq('id', messageId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating message metadata:', error);
    throw error;
  }
}