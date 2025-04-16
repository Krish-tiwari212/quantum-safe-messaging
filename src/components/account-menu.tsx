'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoPersonCircleOutline } from 'react-icons/io5';
import {
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from './ui/use-toast';

// Update props type to accept a function without a return type
export function AccountMenu({ signOut }: { signOut: () => void }) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleLogoutClick() {
    try {
      await signOut();
      router.refresh();
      toast({
        description: 'You have been logged out.',
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        variant: 'destructive',
        description: 'An error occurred while logging out. Please try again or contact support.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='rounded-full'>
        <IoPersonCircleOutline size={24} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className='me-4'>
        <DropdownMenuItem asChild>
          <Link href='/account'>Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/messages'>Messages</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogoutClick}>Log Out</DropdownMenuItem>
        <DropdownMenuArrow className='me-4 fill-white' />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
