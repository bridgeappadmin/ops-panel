'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { OfferForm } from '@/components/OfferForm';
import { Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import type { Offer, OfferResponse } from '@/lib/types';

// Loads inside AppShell's children, so it only runs while signed in.
function EditLoader() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<OfferResponse>(`/admin/offers/${id}`).then((r) => setOffer(r.offer), (e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p role="alert" className="text-danger">{error}</p>;
  if (!offer) return <Skeleton className="h-64 w-full" />;
  return <OfferForm offer={offer} />;
}

export default function EditOfferPage() {
  return <AppShell title="Edit offer"><EditLoader /></AppShell>;
}
