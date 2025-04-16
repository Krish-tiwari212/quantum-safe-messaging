import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href='/' className='flex w-fit items-center gap-2'>
      <div className='rounded-full bg-gradient-to-r from-[#556b9c] to-[#265073] p-2 flex items-center justify-center'>
        <span className="text-xl font-bold text-white">Q</span>
      </div>
      <span className='font-alt text-xl text-white'>QuantumShield</span>
    </Link>
  );
}
