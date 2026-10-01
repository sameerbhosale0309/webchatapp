'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (initialized) {
      if (user) {
        router.push('/chat');
      } else {
        router.push('/login');
      }
    }
  }, [user, initialized, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-violet border-t-transparent" />
      <p className="mt-4 text-sm text-text-secondary">Loading Echo...</p>
    </main>
  );
}