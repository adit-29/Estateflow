import { Suspense } from 'react';
import { RequirementFlow } from '@/features/public/requirement-flow';

export default function RentPage() {
  return (
    <Suspense fallback={<p className="p-8 text-body text-muted-foreground">Rental requirement load ho rahi hai…</p>}>
      <RequirementFlow purpose="rent" />
    </Suspense>
  );
}
