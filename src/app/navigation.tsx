'use client';

import Link from 'next/link';
import { IoMenu } from 'react-icons/io5';
import { MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';

import { AccountMenu } from '@/components/account-menu';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTrigger } from '@/components/ui/sheet';

// We'll use this type for session data
type SessionProps = {
  session: any | null;
}

// The component is now a client component that receives session as a prop
export function Navigation({ session }: SessionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSignOut = async () => {
    try {
      const { signOut } = await import('./(auth)/auth-actions');
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className='relative flex items-center gap-6'>
      {session ? (
        <>
          <Link 
            href="/messages" 
            className="hidden lg:block mr-4 text-white hover:text-cyan-300 transition-colors"
          >
            Messages
          </Link>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className='block lg:hidden'>
              <IoMenu size={28} />
            </SheetTrigger>
            <SheetContent className='w-full bg-black'>
              <SheetHeader>
                <Logo />
                <SheetDescription className='py-8 flex flex-col gap-4'>
                  <Button variant='outline' className='flex justify-start items-center gap-2' asChild>
                    <Link href='/messages' onClick={() => setIsOpen(false)}>
                      <MessageSquare size={18} />
                      Messages
                    </Link>
                  </Button>
                  <Button 
                    variant='outline'
                    onClick={handleSignOut}
                    className='flex justify-start'
                  >
                    Sign Out
                  </Button>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <AccountMenu signOut={handleSignOut} />
        </>
      ) : (
        <>
          <Button variant='sexy' className='hidden flex-shrink-0 lg:flex' asChild>
            <Link href='/signup'>Get started for free</Link>
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className='block lg:hidden'>
              <IoMenu size={28} />
            </SheetTrigger>
            <SheetContent className='w-full bg-black'>
              <SheetHeader>
                <Logo />
                <SheetDescription className='py-8'>
                  <Button variant='sexy' className='flex-shrink-0' asChild>
                    <Link href='/signup' onClick={() => setIsOpen(false)}>Get started for free</Link>
                  </Button>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
