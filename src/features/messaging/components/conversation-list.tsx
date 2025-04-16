'use client';

import { useState } from 'react';
import { Conversation } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createConversation } from '../controllers/conversation-controller';
import { findUserByEmail } from '../controllers/contact-controller';
import { toast } from '@/components/ui/use-toast';

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUser,
}: {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  currentUser: any;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle creating a new conversation with a user
  async function handleCreateConversation() {
    try {
      setIsLoading(true);
      
      // Check if we have a valid user
      if (!currentUser || !currentUser.id) {
        toast({
          variant: 'destructive',
          description: 'User authentication error. Please sign in again.',
        });
        return;
      }
      
      // Find the user by email
      const user = await findUserByEmail(searchEmail);
      if (!user) {
        toast({
          variant: 'destructive',
          description: 'User not found with that email',
        });
        return;
      }
      
      // Create a new conversation with this user
      const newConversation = await createConversation([user.id], {
        name: user.full_name || 'Chat',
        isGroup: false,
      });
      
      // Select the new conversation
      onSelectConversation(newConversation);
      
      // Reset the form
      setSearchEmail('');
      setIsCreating(false);
      
      toast({
        description: 'Conversation created successfully',
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        variant: 'destructive',
        description: 'Failed to create conversation',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Format conversation name/title
  function getConversationTitle(conversation: Conversation) {
    return conversation.metadata?.name || 'Untitled Conversation';
  }

  // Format last message preview
  function getLastMessagePreview(conversation: Conversation) {
    // First check if there's a real last message in the metadata
    if (conversation.metadata?.lastMessage) {
      return conversation.metadata.lastMessage;
    }
    
    // If message count shows messages exist but no preview is available
    if (conversation.metadata?.messageCount && conversation.metadata.messageCount > 0) {
      return "Messages available";
    }
    
    // For existing conversations without metadata updates, check if we have a timestamp
    // that would indicate activity
    if (conversation.updated_at && 
        new Date(conversation.updated_at).getTime() > new Date(conversation.created_at).getTime()) {
      return "Conversation active";
    }
    
    return 'No messages yet';
  }

  // Format timestamp
  function formatTime(timestamp: string | undefined) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-base md:text-lg font-bold">Conversations</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsCreating(true)}
          className="text-xs"
        >
          New Chat
        </Button>
      </div>
      
      {/* New Conversation Form */}
      {isCreating && (
        <div className="p-3 md:p-4 border-b border-zinc-800">
          <h3 className="text-xs md:text-sm font-semibold mb-2">Start a new conversation</h3>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Enter email address"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="text-xs md:text-sm bg-zinc-800 border-zinc-700"
            />
            <Button 
              size="sm" 
              onClick={handleCreateConversation} 
              disabled={!searchEmail || isLoading}
              className="bg-cyan-600 hover:bg-cyan-500 text-xs md:text-sm"
            >
              Start
            </Button>
          </div>
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => setIsCreating(false)}
            className="text-xs mt-2 text-zinc-400"
          >
            Cancel
          </Button>
        </div>
      )}
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-2 md:p-4 cursor-pointer hover:bg-zinc-800 transition-colors ${
                  selectedConversationId === conversation.id ? 'bg-zinc-800' : ''
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-xs md:text-sm truncate max-w-[70%]">
                    {getConversationTitle(conversation)}
                  </h3>
                  <span className="text-[10px] md:text-xs text-zinc-400 flex-shrink-0">
                    {formatTime(conversation.updated_at)}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-zinc-400 truncate">
                  {getLastMessagePreview(conversation)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-2 md:p-4 text-center text-zinc-500">
            <div>
              <p className="mb-1 md:mb-2 text-xs md:text-sm">No conversations yet</p>
              <p className="text-xs">Start a new conversation by clicking the button above</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}