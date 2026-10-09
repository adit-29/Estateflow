'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDemoStore, saveDemoStore } from '@/lib/demo-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';

export default function SellerNewPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [title, setTitle] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const store = getDemoStore();
    store.seller.listings.unshift({
      id: `s${Date.now()}`,
      title,
      status: 'draft',
      enquiries: 0,
    });
    saveDemoStore(store);
    notify('Listing saved as draft (demo)');
    router.push('/seller');
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Add property</h2>
      <form onSubmit={submit} className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Label htmlFor="t">Listing title</Label>
          <Input id="t" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 3 BHK · JP Nagar" />
        </div>
        <Button type="submit">Save draft</Button>
      </form>
    </div>
  );
}
