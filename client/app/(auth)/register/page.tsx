'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MessageSquare } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuthStore();
  const { show } = useToastStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, password);
      show({ title: 'Account created successfully!', variant: 'success' });
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      show({ title: 'Registration failed', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent-violet/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-pink/20 blur-3xl" />

      <div className="w-full max-w-md space-y-6 glass rounded-2xl p-8 border border-white/10 shadow-2xl relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-violet to-accent-pink shadow-lg shadow-accent-violet/30">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">Create Account</h1>
          <p className="text-sm text-text-secondary">Join Echo and start chatting in real-time</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            placeholder="e.g. alex_dev"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" loading={loading} className="w-full py-2.5">
            Create Account & Join
          </Button>
        </form>

        <p className="text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent-violet hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
