'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Cpu, Terminal, Radio, Mail, Key, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '@/lib/soundEffects';

const ModelViewer3D = dynamic(() => import('@/components/ui/ModelViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-dark-oxide/40 border border-dark-oxide/30 rounded text-xs text-paper-display font-mono space-y-2">
      <Radio className="w-6 h-6 text-magnetic-oxide animate-pulse" />
      <span>[INITIALIZING 3D MODEL...]</span>
    </div>
  ),
});

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export default function RegisterPage() {
  const router = useRouter();
  const { register, sendOtp, loading } = useAuthStore();
  const { show } = useToastStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    soundEffects.playClick();
    setError('');
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (cleanUsername.length < 3) {
      setError('USERNAME MUST BE AT LEAST 3 CHARACTERS');
      return;
    }

    if (!cleanEmail) {
      setError('PLEASE ENTER A GMAIL ADDRESS');
      return;
    }

    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('ONLY GENUINE GOOGLE (@GMAIL.COM) EMAIL ADDRESSES ARE ACCEPTED');
      show({
        title: 'NON-GMAIL REJECTED',
        description: 'Only genuine @gmail.com email addresses are allowed.',
        variant: 'error',
      });
      return;
    }

    if (password.length < 6) {
      setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS');
      return;
    }

    setSendingOtp(true);
    try {
      await sendOtp(cleanEmail, 'register', cleanUsername);
      setOtpSent(true);
      show({
        title: 'VERIFICATION CODE DISPATCHED!',
        description: `Check your Gmail inbox and Spam/Junk folder (${cleanEmail}) for your 6-digit code.`,
        variant: 'info',
      });
    } catch (err: any) {
      setError(err.message || 'FAILED TO SEND VERIFICATION CODE');
      show({ title: 'DISPATCH FAILED', description: err.message, variant: 'error' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playSend();
    setError('');
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('ONLY GENUINE GOOGLE (@GMAIL.COM) EMAIL ADDRESSES ARE ACCEPTED');
      return;
    }

    if (!cleanOtp || cleanOtp.length < 6) {
      setError('PLEASE ENTER THE 6-DIGIT VERIFICATION CODE SENT TO YOUR GMAIL');
      return;
    }

    try {
      await register(cleanUsername, cleanEmail, password, cleanOtp);
      show({ title: 'ACCOUNT CREATED & VERIFIED SUCCESSFULLY!', variant: 'success' });
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'REGISTRATION FAILED');
      show({ title: 'REGISTRATION FAILED', description: err.message, variant: 'error' });
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas p-4 sm:p-6 md:p-8 overflow-y-auto crt-overlay font-mono">
      {/* Corner Metallic Chassis Screws */}
      <div className="absolute top-4 left-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute top-4 right-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10 py-4">

        {/* 3D Model Viewport Panel */}
        <div className="order-2 lg:order-1 lg:col-span-7 w-full bg-dark-oxide/90 border-2 border-dark-oxide rounded-sm p-3 sm:p-4 shadow-2xl bevel-raised flex flex-col justify-between min-h-[300px] sm:min-h-[380px] lg:min-h-[560px] relative overflow-hidden group">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-paper-display/20 py-1 px-1.5">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-magnetic-oxide animate-pulse" />
              <span className="font-bold text-[10px] text-paper-display tracking-wider uppercase">
                Welcome to Varta-लाप.
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-oxide-brown">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="text-emerald-400 font-bold uppercase">interactive</span>
            </div>
          </div>

          {/* 3D Model Container */}
          <div className="flex-1 w-full relative min-h-[240px] sm:min-h-[300px] lg:min-h-[400px] my-2 rounded bg-black/40 border border-paper-display/10 overflow-hidden">
            <ModelViewer3D modelPath="/3dmodel/latestvartalaap3dmodel.glb" />
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-paper-display/20 pt-2 px-2 text-[10px] text-oxide-brown">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-magnetic-oxide" />
              SYSTEM MODEL: Varta-लाप TECHNOLOGIES
            </span>
          </div>
        </div>

        {/* User Register Form */}
        <div className="order-1 lg:order-2 lg:col-span-5 w-full bg-chassis-sand border-2 border-dark-oxide rounded-sm p-5 sm:p-8 shadow-2xl bevel-raised space-y-5 sm:space-y-6">
          <div className="text-center space-y-1 border-b border-dark-oxide/20 pb-4">
            <h1 className="font-display text-xl font-extrabold text-dark-oxide tracking-wider uppercase">
              CREATE USER ACCOUNT
            </h1>
            <p className="text-xs text-black font-mono">
              Welcome to Varta-लाप !
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
              label="ENTER USERNAME"
              placeholder="Username (min. 3 chars)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              disabled={otpSent}
              playSound
            />
            <Input
              label="ENTER GENUINE GMAIL (@GMAIL.COM)"
              type="email"
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
              disabled={otpSent}
              playSound
            />
            <Input
              label="CREATE PASSWORD"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              disabled={otpSent}
              playSound
            />

            {!otpSent ? (
              <Button
                type="button"
                onClick={handleSendOtp}
                variant="transmit"
                loading={sendingOtp}
                className="w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> SEND GMAIL VERIFICATION CODE
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-paper-display border-2 border-dark-oxide rounded-sm bevel-recessed animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> VERIFICATION CODE SENT
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[10px] text-magnetic-oxide underline hover:text-dark-oxide"
                  >
                    CHANGE GMAIL
                  </button>
                </div>

                <Input
                  label="ENTER 6-DIGIT GMAIL CODE"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  playSound
                />

                <Button type="submit" variant="transmit" loading={loading} className="w-full py-3 text-sm flex items-center justify-center gap-2">
                  <Key className="w-4 h-4" /> VERIFY CODE & CREATE ACCOUNT
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="text-[10px] text-oxide-brown hover:text-dark-oxide underline font-mono"
                  >
                    Didn&apos;t receive code? Resend to Gmail
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="pt-4 border-t border-dark-oxide/20 text-center space-y-2">
            <p className="text-xs text-dark-oxide font-mono">
              EXISTING USER?{' '}
              <Link href="/login" className="font-bold text-magnetic-oxide hover:underline uppercase tracking-wider">
                [SIGN IN]
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-black">
              <ShieldCheck className="w-3.5 h-3.5 text-magnetic-oxide" />
              <span>Varta-लाप Secure Nodemailer Verification</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
