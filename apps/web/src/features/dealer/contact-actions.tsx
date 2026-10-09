'use client';

import { Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function phoneDigits(phone?: string | null) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function CallButton({ phone, size = 'sm' }: { phone?: string | null; size?: 'sm' | 'default' }) {
  const digits = phoneDigits(phone);
  const label = phone?.trim() ? `Call ${phone}` : 'Call';
  if (digits.length >= 10) {
    return (
      <Button asChild size={size} className="bg-emerald-600 text-white hover:bg-emerald-700">
        <a href={`tel:${digits}`}><Phone className="h-3.5 w-3.5" />{label}</a>
      </Button>
    );
  }
  return (
    <Button size={size} type="button" disabled className="bg-emerald-600/40 text-white">
      <Phone className="h-3.5 w-3.5" />{phone ? `Call ${phone}` : 'No number'}
    </Button>
  );
}

export function WhatsAppButton({
  phone,
  text,
  size = 'sm',
}: {
  phone?: string | null;
  text?: string;
  size?: 'sm' | 'default';
}) {
  const digits = phoneDigits(phone);
  if (digits.length < 10) {
    return (
      <Button size={size} type="button" disabled variant="outline">
        <MessageCircle className="h-3.5 w-3.5" />WhatsApp
      </Button>
    );
  }
  const href = `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  return (
    <Button asChild size={size} className="bg-[#128C7E] text-white hover:bg-[#0e6e63]">
      <a href={href} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
    </Button>
  );
}

export function PhoneChip({ phone }: { phone?: string | null }) {
  if (!phone) return <span className="text-sm text-muted-foreground">Phone not recorded</span>;
  const digits = phoneDigits(phone);
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
      <Phone className="h-3.5 w-3.5" />
      {phone}
    </span>
  );
  if (digits.length < 10) return inner;
  return <a href={`tel:${digits}`}>{inner}</a>;
}

export function EmailButton({ email, size = 'sm' }: { email?: string | null; size?: 'sm' | 'default' }) {
  if (!email) return null;
  return (
    <Button asChild size={size} variant="outline">
      <a href={`mailto:${email}`}>Email</a>
    </Button>
  );
}
