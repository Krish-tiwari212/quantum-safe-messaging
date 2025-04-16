'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { addParticipantToConversation } from '../controllers/conversation-controller';

export function AddParticipantDialog({
  conversationId,
  isOpen,
  onClose,
  onParticipantAdded
}: {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onParticipantAdded?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    try {
      setIsLoading(true);
      
      await addParticipantToConversation(conversationId, email);
      
      toast({
        description: 'Participant added successfully',
      });
      
      setEmail('');
      onClose();
      
      // Call the callback to refresh participants list
      if (onParticipantAdded) {
        onParticipantAdded();
      }
    } catch (error: any) {
      console.error('Error adding participant:', error);
      toast({
        variant: 'destructive',
        description: error.message || 'Failed to add participant',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle>Add Participant</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter the email address of the user you want to add to this conversation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-zinc-400">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="col-span-3 bg-zinc-800 border-zinc-700"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!email.trim() || isLoading}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              {isLoading ? 'Adding...' : 'Add Participant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}