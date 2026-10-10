'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Mail } from 'lucide-react';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const { show } = useToastStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    import('@/lib/soundEffects').then(({ soundEffects }) => soundEffects.playSend()).catch(() => { });
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('PLEASE PROVIDE CREDENTIALS');
      return;
    }

    // If input contains @ symbol, strictly enforce @gmail.com
    if (cleanEmail.includes('@') && !GMAIL_REGEX.test(cleanEmail)) {
      setError('ONLY GENUINE GOOGLE (@GMAIL.COM) EMAIL ADDRESSES ARE ACCEPTED');
      show({
        title: 'NON-GMAIL REJECTED',
        description: 'Only genuine @gmail.com email addresses are allowed.',
        variant: 'error',
      });
      return;
    }

    try {
      await login(cleanEmail, password);
      show({ title: 'user login successfully', variant: 'success' });
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'AUTHENTICATION FAILED');
      show({ title: 'LOGIN REJECTED', description: err.message, variant: 'error' });
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas p-4 sm:p-6 overflow-hidden crt-overlay font-mono">
      {/* Corner Metallic Chassis Screws */}
      <div className="absolute top-4 left-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute top-4 right-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>

      <div className="w-full max-w-md bg-chassis-sand border-2 border-dark-oxide rounded-sm p-6 sm:p-8 shadow-2xl bevel-raised relative z-10 space-y-6">

        {/* Cassette Deck Status HUD Header */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-xl font-extrabold text-dark-oxide tracking-wider uppercase">
            USER SIGN/IN
          </h1>
          <p className="text-xs text-oxide-grey font-mono">
            WELCOME TO Varta-लाप
          </p>
          {/* <div className="inline-flex items-center gap-1 text-[10px] text-black-700 bg-#B2AAA4-100 border border-black px-2 py-0.5 rounded font-bold uppercase mt-1">
            <Mail className="w-3 h-3 text-black-600" /> GENUINE GMAIL VERIFICATION ACTIVE
          </div> */}
        </div>

        {error && (
          <div className="rounded-sm bg-danger/10 border border-danger p-2.5 text-xs text-danger font-bold font-mono">
            [ERR: {error}]
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="USERNAME OR GMAIL (@GMAIL.COM)"
            type="text"
            placeholder="yourname@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            playSound
          />
          <Input
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            playSound
          />

          <Button type="submit" variant="transmit" loading={loading} className="w-full py-3 text-sm">
            SIGN IN
          </Button>
        </form>

        <div className="pt-4 border-t border-dark-oxide/20 text-center space-y-2">
          <p className="text-xs text-dark-oxide font-mono">
            NEW USER?{' '}
            <Link href="/register" className="font-bold text-magnetic-oxide hover:underline uppercase tracking-wider">
              [REGISTER HERE]
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-oxide-brown">
            <ShieldCheck className="w-3.5 h-3.5 text-magnetic-oxide" />
            <span>Varta-लाप Nodemailer Gmail Verification</span>
          </div>
        </div>
      </div>
    </main>
  );
}
