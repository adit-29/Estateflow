import { Suspense } from 'react';
import { RequirementFlow } from '@/features/public/requirement-flow';

export default function BuyPage() {
  return (
    <Suspense fallback={<p className="p-8 text-body text-muted-foreground">Requirement load ho rahi hai…</p>}>
      <RequirementFlow purpose="buy" />
    </Suspense>
  );
}
