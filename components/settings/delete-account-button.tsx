'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/components/ui/use-toast';

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToastStore();
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete your account?')) return;
    setLoading(true);
    const res = await fetch('/api/me', { method: 'DELETE' });
    setLoading(false);
    if (!res.ok) {
      pushToast({ variant: 'destructive', title: 'Failed to delete account' });
      return;
    }
    pushToast({ title: 'Account deleted' });
    await signOut({ callbackUrl: '/sign-in' });
  }
  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
      Delete account
    </Button>
  );
}
