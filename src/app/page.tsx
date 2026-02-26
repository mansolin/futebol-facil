'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div
      className="flex items-center justify-center h-dvh"
      style={{ background: 'var(--bg)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="text-6xl animate-bounce">⚽</span>
        <p className="font-black text-2xl" style={{ color: 'var(--primary)' }}>
          FUTEBOL FÁCIL
        </p>
        <div
          className="h-1 w-32 rounded-full animate-pulse"
          style={{ background: 'var(--primary)' }}
        />
      </div>
    </div>
  );
}
