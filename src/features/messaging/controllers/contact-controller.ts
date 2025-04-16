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
    
    let userId: string | null = null;
    let userData: {
      id: string;
      full_name?: string;
      avatar_url?: string;
    } | null = null;
    
    // Method 1: Try the RPC function if it exists
    try {
      const { data: rpcData, error } = await supabase.rpc('find_user_by_email', { 
        email_to_find: normalizedEmail 
      });
      
      if (!error && rpcData && rpcData.id) {
        userId = rpcData.id;
        userData = {
          id: rpcData.id,
          full_name: rpcData.full_name,
          avatar_url: rpcData.avatar_url
        };
        console.log('Found user via RPC function:', userId);
      }
    } catch (rpcError) {
      console.error('RPC search failed:', rpcError);
    }
    
    // Method 2: Try using get_user_id_by_email RPC function
    if (!userId) {
      try {
        const { data: emailLookup } = await supabase
          .rpc('get_user_id_by_email', { email_to_check: normalizedEmail });
          
        if (emailLookup) {
          userId = emailLookup;
          console.log('Found user ID by email lookup:', userId);
          
          // Now fetch user data
          const { data: profile } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', userId)
            .single();
            
          if (profile) {
            userData = {
              id: userId,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url
            };
          }
        }
      } catch (lookupError) {
        console.error('Email lookup failed:', lookupError);
      }
    }
    
    // Method 3: Try direct lookup as a last resort
    if (!userId) {
      try {
        // Try to find user by iterating through users and checking emails
        // Only do this for a limited number to keep it performant
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(100);
        
        if (users && users.length > 0) {
          for (const user of users) {
            const { data: email } = await supabase
              .rpc('get_user_email_by_id', { user_id: user.id });
              
            if (email && email.toLowerCase() === normalizedEmail) {
              userId = user.id;
              
              // Get profile data
              const { data: profile } = await supabase
                .from('users')
                .select('full_name, avatar_url')
                .eq('id', userId)
                .single();
                
              if (profile) {
                userData = {
                  id: userId,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url
                };
              } else {
                userData = { id: userId };
              }
              
              console.log('Found user by checking individual emails:', userId);
              break;
            }
          }
        }
      } catch (directError) {
        console.error('Direct lookup failed:', directError);
      }
    }
    
    if (!userId || !userData) {
      console.log('No user found with email:', normalizedEmail);
      return null;
    }
    
    // Get the user's public key if available
    try {
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('public_key')
        .eq('user_id', userId)
        .maybeSingle();
      
      return {
        id: userId,
        full_name: userData.full_name || 'User',
        avatar_url: userData.avatar_url || null,
        public_key: participant?.public_key || null
      };
    } catch (keyError) {
      console.error('Error fetching user public key:', keyError);
      
      // Return basic user data even if we can't get the public key
      return {
        id: userId,
        full_name: userData.full_name || 'User',
        avatar_url: userData.avatar_url || null,
        public_key: null
      };
    }
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