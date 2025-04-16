'use server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Contact, UserProfileWithKeys } from '../types';

/**
 * Get all contacts for the current user
 */
export async function getUserContacts(): Promise<Contact[]> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user contacts:', error);
    throw error;
  }
}

/**
 * Find users by email for adding new contacts
 */
export async function findUserByEmail(email: string): Promise<UserProfileWithKeys | null> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Normalize the email address
    const normalizedEmail = email.trim().toLowerCase();
    
    console.log(`Searching for user with email: ${normalizedEmail}`);
    
    // Try to find the user with the RPC function
    try {
      const { data: rpcData } = await supabase.rpc('find_user_by_email', { 
        email_to_find: normalizedEmail 
      });
      
      if (rpcData && rpcData.id) {
        // Get the user's public key for secure communication
        const { data: participant } = await supabase
          .from('conversation_participants')
          .select('public_key')
          .eq('user_id', rpcData.id)
          .maybeSingle();
        
        return {
          id: rpcData.id,
          full_name: rpcData.full_name || 'User',
          avatar_url: rpcData.avatar_url || null,
          public_key: participant?.public_key || null
        };
      }
    } catch (rpcError) {
      console.error('RPC search failed:', rpcError);
    }
    
    // If RPC fails, try a simpler approach using the profiles table directly
    try {
      // First get the user ID from auth.users if permissions allow
      const { data: userEmail } = await supabase
        .rpc('get_user_id_by_email', { email_to_check: normalizedEmail });
        
      if (userEmail) {
        // Now get the user profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', userEmail)
          .single();
          
        if (userProfile) {
          return {
            id: userProfile.id,
            full_name: userProfile.full_name || 'User',
            avatar_url: userProfile.avatar_url || null,
            public_key: null
          };
        }
      }
    } catch (sqlError) {
      console.error('Direct user lookup failed:', sqlError);
    }
    
    console.log('No user found with email:', normalizedEmail);
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Add a new contact
 */
export async function addContact(contactUserId: string): Promise<Contact> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Don't allow adding yourself as a contact
    if (user.id === contactUserId) {
      throw new Error("You can't add yourself as a contact");
    }
    
    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('contact_user_id', contactUserId)
      .maybeSingle();
    
    if (existingContact) {
      throw new Error('Contact already exists');
    }
    
    // Add the contact with pending status
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        contact_user_id: contactUserId,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding contact:', error);
    throw error;
  }
}

/**
 * Update contact status (accept/block)
 */
export async function updateContactStatus(contactId: string, status: 'accepted' | 'blocked'): Promise<Contact> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Update the contact status
    const { data, error } = await supabase
      .from('contacts')
      .update({ status })
      .eq('id', contactId)
      .eq('user_id', user.id) // Ensure the contact belongs to the current user
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating contact status:', error);
    throw error;
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Delete the contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id); // Ensure the contact belongs to the current user
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
}