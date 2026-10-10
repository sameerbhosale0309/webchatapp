'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToastStore } from '@/stores/toastStore';
import { useThemeStore } from '@/stores/themeStore';

export default function PreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { show } = useToastStore();
  const { toggle, theme } = useThemeStore();

  return (
    <main className="min-h-screen bg-canvas p-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-text-primary">Echo Design Kit</h1>
          <Button variant="secondary" onClick={toggle}>
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </Button>
        </div>

        <section className="glass space-y-4 rounded-xl p-6">
          <h2 className="font-display font-semibold text-text-primary">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
          </div>
        </section>

        <section className="glass space-y-4 rounded-xl p-6">
          <h2 className="font-display font-semibold text-text-primary">Inputs</h2>
          <Input label="Email" placeholder="you@example.com" />
          <Input label="Password" type="password" error="Password must be at least 8 characters" />
        </section>

        <section className="glass space-y-4 rounded-xl p-6">
          <h2 className="font-display font-semibold text-text-primary">Avatars</h2>
          <div className="flex items-center gap-4">
            <Avatar initials="JD" size="sm" presence="online" />
            <Avatar initials="AK" size="md" presence="away" gradient={['#FF5CAA', '#7C5CFC']} />
            <Avatar initials="MW" size="lg" presence="offline" />
            <Avatar initials="EC" size="xl" presence="online" />
          </div>
        </section>

        <section className="glass space-y-4 rounded-xl p-6">
          <h2 className="font-display font-semibold text-text-primary">Skeletons</h2>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </section>

        <section className="glass flex flex-wrap gap-3 rounded-xl p-6">
          <Button onClick={() => show({ title: 'Message sent', variant: 'success' })}>
            Trigger success toast
          </Button>
          <Button variant="danger" onClick={() => show({ title: 'Upload failed', description: 'Retry?', variant: 'error' })}>
            Trigger error toast
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
        </section>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal">
          <p className="text-sm text-text-secondary">
            Focus-trapped, ESC to close, spring animation. This is the base Modal component
            we&apos;ll reuse for Group Settings, Profile, and Media Viewer.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </div>
    </main>
  );
}