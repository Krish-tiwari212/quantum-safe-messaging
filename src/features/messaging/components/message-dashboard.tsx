'use client';

import { useState, useEffect } from 'react';
import { Conversation } from '../types';
import { ConversationList } from './conversation-list';
import { MessageView } from './message-view';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

export function MessageDashboard({ 
  initialUser,
  initialConversations = []
}: {
  initialUser: any;
  initialConversations: Conversation[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    initialConversations.length > 0 ? initialConversations[0] : null
  );
  const [user] = useState(initialUser || {}); // Ensure user is at least an empty object

  // Set up real-time updates for conversations
  useEffect(() => {
    // Guard against missing user
    if (!user || !user.id) {
      console.warn('User data is missing or incomplete');
      return;
    }

    const supabase = createSupabaseBrowserClient();

    // Subscribe to conversation changes
    const conversationSubscription = supabase
      .channel('conversation-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations',
        }, 
        async (payload) => {
          // Handle conversation changes (new conversations, updates, etc.)
          if (payload.eventType === 'INSERT') {
            // Check if this user is a participant before adding
            const { data: isParticipant } = await supabase
              .from('conversation_participants')
              .select('*')
              .eq('conversation_id', payload.new.id)
              .eq('user_id', user.id)
              .single();

            if (isParticipant) {
              setConversations(prev => [payload.new, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => 
              prev.map(conv => conv.id === payload.new.id ? payload.new : conv)
            );
            
            // If this is the currently selected conversation, update it
            if (selectedConversation?.id === payload.new.id) {
              setSelectedConversation(payload.new);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
    };
  }, [user?.id, selectedConversation?.id]); // Use optional chaining to avoid null reference

  // If user data is missing, show a message
  if (!user || !user.id) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg p-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-2">User Not Available</h3>
          <p className="text-zinc-400">Please sign in again to access messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-900 rounded-lg overflow-hidden">
      {/* Conversation List */}
      <div className="w-1/3 border-r border-zinc-800">
        <ConversationList 
          conversations={conversations}
          selectedConversationId={selectedConversation?.id}
          onSelectConversation={conversation => setSelectedConversation(conversation)}
          currentUser={user}
        />
      </div>
      
      {/* Message View */}
      <div className="w-2/3">
        {selectedConversation ? (
          <MessageView 
            conversation={selectedConversation}
            currentUser={user}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}