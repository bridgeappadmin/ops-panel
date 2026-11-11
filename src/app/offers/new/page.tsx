'use client';

import { AppShell } from '@/components/AppShell';
import { OfferForm } from '@/components/OfferForm';

export default function NewOfferPage() {
  return <AppShell title="New offer" description="Pick the venue, set the price in Connects and the number of coupons, then choose the dates."><OfferForm /></AppShell>;
}
