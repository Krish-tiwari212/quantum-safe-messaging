import Link from 'next/link';
import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { getSession } from '@/features/account/controllers/get-session';
import { MessageSquare } from 'lucide-react';

export default async function HomePage() {
  return (
    <div className='flex flex-col gap-8 lg:gap-32'>
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}

async function HeroSection() {
  const session = await getSession();
  
  return (
    <section className='relative overflow-hidden lg:overflow-visible'>
      <Container className='relative rounded-lg bg-black py-20 lg:py-[140px]'>
        <div className='relative z-10 flex flex-col gap-5 lg:max-w-xl lg:pl-8'>
          <div className='w-fit rounded-full bg-gradient-to-r from-[#556b9c] via-[#7a8db9] to-[#265073] px-4 py-1 '>
            <span className='font-alt text-sm font-semibold text-black mix-blend-soft-light'>
              Quantum-Safe Encryption
            </span>
          </div>
          <h1>Secure messaging for the quantum computing era</h1>
          <p className='text-zinc-300 max-w-md'>
            Our platform uses post-quantum cryptographic algorithms to ensure your messages remain secure
            even against quantum computer attacks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {session ? (
              <Button asChild variant='sexy' className='flex items-center gap-2'>
                <Link href='/messages'>
                  <MessageSquare size={18} />
                  Go to Messages
                </Link>
              </Button>
            ) : (
              <Button asChild variant='sexy'>
                <Link href='/signup'>Get started for free</Link>
              </Button>
            )}
            
            {session && (
              <Button asChild variant='outline'>
                <Link href='/account'>Your Account</Link>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className='flex flex-col gap-4 overflow-hidden rounded-lg bg-black py-8'>
      <Container>
        <h2 className='text-3xl font-bold text-center mb-12'>Why Choose Quantum Safe Messaging</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          <FeatureCard 
            title="Quantum Resistant"
            description="Protected against attacks from both conventional and quantum computers"
          />
          <FeatureCard 
            title="End-to-End Encryption"
            description="Messages are encrypted on your device and can only be decrypted by the intended recipient"
          />
          <FeatureCard 
            title="Zero Knowledge"
            description="We cannot read your messages - your data remains private and secure"
          />
        </div>
      </Container>
    </section>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg bg-zinc-900">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-zinc-400">{description}</p>
    </div>
  );
}
