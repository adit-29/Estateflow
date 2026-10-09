'use client';

import { useState } from 'react';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';

export default function EnquiriesPage() {
  const { notify } = useToast();
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const store = getDemoStore();
    store.buyer.enquiries.unshift({
      id: `en${Date.now()}`,
      propertyId: 'bp1',
      message,
      createdAt: new Date().toISOString(),
    });
    saveDemoStore(store);
    setMessage('');
    notify('Enquiry saved (demo)');
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">New enquiry</h2>
      <form onSubmit={submit} className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Label htmlFor="m">Message</Label>
          <Input id="m" required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I'm interested in…" />
        </div>
        <Button type="submit">Send enquiry (demo)</Button>
      </form>
    </div>
  );
}
