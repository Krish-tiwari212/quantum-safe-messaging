'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';
import { getConversationParticipants } from '../controllers/conversation-controller';
import { getConversationParticipantsWithKeys } from '../controllers/key-controller';
import { getConversationMessages, sendMessage } from '../controllers/message-controller';
import { Conversation, ConversationParticipant, Message, UserProfileWithKeys } from '../types';
import { QuantumMessageEncryption } from './quantum-message-encryption';
import { UserPlusIcon } from 'lucide-react';
import { AddParticipantDialog } from './add-participant-dialog';

// Define interface for the encryption ref
interface EncryptionRef {
  decryptMessage: (message: Message) => Promise<string>;
  encryptMessage: (
    plaintext: string, 
    recipients: UserProfileWithKeys[]
  ) => Promise<{
    encryptedContent: string;
    iv: string;
    metadata: any;
  }>;
  getPublicKey: () => string | null;
}

export function MessageView({
  conversation,
  currentUser,
}: {
  conversation: Conversation;
  currentUser: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [participantsWithKeys, setParticipantsWithKeys] = useState<UserProfileWithKeys[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const encryptionRef = useRef<EncryptionRef | null>(null);

  // Load initial messages and set up real-time updates
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    // Guard against missing user
    if (!currentUser || !currentUser.id) {
      console.warn('User data is missing in MessageView');
      if (isMounted) setIsLoading(false);
      return;
    }
    
    // Load initial messages
    const loadMessages = async () => {
      try {
        const fetchedMessages = await getConversationMessages(conversation.id);
        if (isMounted) {
          setMessages(fetchedMessages.reverse()); // Reverse to show oldest first
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          variant: 'destructive',
          description: 'Failed to load messages',
        });
        if (isMounted) setIsLoading(false);
      }
    };
    
    // Load participants (needed for encryption)
    const loadParticipants = async () => {
      try {
        const fetchedParticipants = await getConversationParticipants(conversation.id);
        if (isMounted) {
          setParticipants(fetchedParticipants);
        }
      } catch (error) {
        console.error('Error loading participants:', error);
      }
    };

    // Load participants with their public keys
    const loadParticipantsWithKeys = async () => {
      try {
        const participantData = await getConversationParticipantsWithKeys(conversation.id);
        if (isMounted) {
          setParticipantsWithKeys(participantData);
        }
      } catch (error) {
        console.error('Error loading participants with keys:', error);
      }
    };

    // Fetch emails for all participants directly using our new SQL function
    const fetchUserEmails = async () => {
      const supabase = createSupabaseBrowserClient();
      
      // Get all participants first
      const { data: fetchedParticipants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversation.id);
      
      if (!fetchedParticipants) return;
      
      const emailMap: Record<string, string> = {};
      
      // Fetch email for each participant
      for (const participant of fetchedParticipants) {
        const { data: email } = await supabase
          .rpc('get_user_email_by_id', { user_id: participant.user_id });
          
        if (email) {
          emailMap[participant.user_id] = email;
        }
      }
      
      if (isMounted) {
        setUserEmails(emailMap);
      }
    };
    
    // Subscribe to new messages via Supabase real-time
    const supabase = createSupabaseBrowserClient();
    const subscription = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        }, 
        (payload: any) => {
          if (isMounted) {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();
    
    loadMessages();
    loadParticipants();
    loadParticipantsWithKeys();
    fetchUserEmails();
    
    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [conversation.id, currentUser?.id]);

  // Decrypt messages whenever the messages array changes
  useEffect(() => {
    const decryptAllMessages = async () => {
      if (!encryptionRef.current) return;
      
      const newDecryptedMessages: Record<string, string> = {};
      
      for (const message of messages) {
        try {
          const decryptedContent = await encryptionRef.current.decryptMessage(message);
          newDecryptedMessages[message.id] = decryptedContent;
        } catch (error) {
          console.error('Error decrypting message:', error);
          newDecryptedMessages[message.id] = "Decryption failed";
        }
      }
      
      setDecryptedMessages(newDecryptedMessages);
    };
    
    decryptAllMessages();
  }, [messages]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add this function to refresh participants after adding a new one
  const refreshParticipants = useCallback(async () => {
    try {
      const updatedParticipants = await getConversationParticipants(conversation.id);
      setParticipants(updatedParticipants);
      
      const updatedParticipantsWithKeys = await getConversationParticipantsWithKeys(conversation.id);
      setParticipantsWithKeys(updatedParticipantsWithKeys);
      
      // Refresh emails as well
      const supabase = createSupabaseBrowserClient();
      const emailMap: Record<string, string> = {};
      
      for (const participant of updatedParticipants) {
        const { data: email } = await supabase
          .rpc('get_user_email_by_id', { user_id: participant.user_id });
          
        if (email) {
          emailMap[participant.user_id] = email;
        }
      }
      
      setUserEmails(emailMap);
    } catch (error) {
      console.error('Error refreshing participants:', error);
    }
  }, [conversation.id]);

  // Handle sending a message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;
    
    // Guard against missing user
    if (!currentUser || !currentUser.id) {
      toast({
        variant: 'destructive',
        description: 'User authentication error. Please sign in again.',
      });
      return;
    }
    
    try {
      setIsSending(true);
      
      if (!encryptionRef.current) {
        toast({
          variant: 'destructive',
          description: 'Encryption module not initialized',
        });
        return;
      }
      
      // Encrypt the message using our quantum-safe encryption
      const { encryptedContent, iv, metadata } = await encryptionRef.current.encryptMessage(
        messageInput,
        participantsWithKeys.filter(p => p.id !== currentUser.id)
      );
      
      // Send the encrypted message to the server
      await sendMessage(
        conversation.id,
        encryptedContent,
        iv,
        metadata
      );
      
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        description: 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  }

  // Format messages for display
  function getDisplayName(userId: string) {
    if (!currentUser) return 'Unknown';
    if (userId === currentUser.id) {
      return 'You';
    }
    
    // First, check our direct email map
    if (userEmails[userId]) {
      return userEmails[userId];
    }
    
    // Fallback to participant data
    const participant = participantsWithKeys.find(p => p.id === userId);
    if (participant?.email) {
      return participant.email;
    }
    
    // As a last resort, show the user ID
    return 'User ' + userId.substring(0, 8);
  }
  
  // Format timestamp
  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Get decrypted content for a message
  function getDecryptedContent(messageId: string) {
    return decryptedMessages[messageId] || "Decrypting...";
  }

  // If no valid user, show an error message
  if (!currentUser || !currentUser.id) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">User authentication error. Please sign in again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Initialize our quantum encryption module (hidden) */}
      <QuantumMessageEncryption 
        ref={encryptionRef}
        currentUser={currentUser}
      />
      
      {/* Add Participant Dialog */}
      <AddParticipantDialog
        conversationId={conversation.id}
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
        onParticipantAdded={refreshParticipants}
      />
      
      {/* Conversation Header */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="font-bold">
            {conversation.metadata?.name || 'Chat'}
          </h2>
          <p className="text-xs text-zinc-400">
            {participants.length} participants • Quantum-Safe Encrypted
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={() => setIsAddParticipantOpen(true)}
          title="Add Participant"
        >
          <UserPlusIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500">Loading messages...</p>
          </div>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender_id === currentUser.id
                    ? 'bg-cyan-800 text-white'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-medium text-sm">
                    {getDisplayName(message.sender_id)}
                  </span>
                  <span className="text-xs opacity-70 ml-2">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-sm">
                  {/* Use pre-decrypted content from state */}
                  {getDecryptedContent(message.id)}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  Quantum-Safe Encrypted
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500">No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t border-zinc-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={isSending}
            className="bg-zinc-800 border-zinc-700"
          />
          <Button 
            type="submit" 
            disabled={!messageInput.trim() || isSending}
            className="bg-cyan-600 hover:bg-cyan-500 min-w-[80px]"
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
