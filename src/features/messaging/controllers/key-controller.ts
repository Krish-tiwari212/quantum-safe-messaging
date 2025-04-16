'use server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { UserProfileWithKeys } from '../types';

/**
 * Store the user's public key in the database
 * This will be used for quantum-safe message encryption
 */
export async function storeUserPublicKey(publicKey: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Store the public key for all conversations this user is in
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('user_id', user.id);
    
    if (participationsError) throw participationsError;
    
    if (participations?.length > 0) {
      // Update all conversation participations with the new public key
      const { error } = await supabase
        .from('conversation_participants')
        .update({ public_key: publicKey })
        .in('id', participations.map(p => p.id));
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error storing public key:', error);
    return false;
  }
}

/**
 * Get public keys for all participants in a conversation
 */
export async function getConversationParticipantsWithKeys(conversationId: string): Promise<UserProfileWithKeys[]> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Create a function to get user emails using the service role to access auth.users
    const { data: participants, error } = await supabase.rpc('get_conversation_participants_with_emails', {
      conv_id: conversationId
    });
    
    if (error) {
      console.error('Error fetching participants with emails:', error);
      throw error;
    }
    
    return participants.map((participant: any) => ({
      id: participant.user_id,
      full_name: participant.full_name,
      email: participant.email, // This will come from auth.users via our SQL function
      avatar_url: participant.avatar_url,
      public_key: participant.public_key,
      publicKeyAlgorithm: 'XSalsa20-Poly1305'
    }));
  } catch (error) {
    console.error('Error getting participants with keys:', error);
    return [];
  }
}

/**
 * Update the current user's public key in the database
 * This should be called when the user generates a new key pair
 */
export async function updateCurrentUserPublicKey(publicKey: string): Promise<boolean> {
  return storeUserPublicKey(publicKey);
}