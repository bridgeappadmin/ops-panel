'use client';

// Stub: Task 2 replaces this with the offers list.
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Budget } from '@/lib/types';

export default function OffersPage() {
  return (
    <AppShell title="Offers">
      <BudgetLine />
    </AppShell>
  );
}

function BudgetLine() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Budget>('/admin/budget').then(setBudget, (e: Error) => setError(e.message));
  }, []);

  return (
    <Card>
      {error ? (
        <p role="alert" className="text-danger">{error}</p>
      ) : budget ? (
        <p className="text-body-md">
          Tazmify-funded this month: {formatNumber(budget.usedConnects)} / {formatNumber(budget.capConnects)} Connects
        </p>
      ) : (
        <Skeleton className="h-5 w-80" />
      )}
    </Card>
  );
}
