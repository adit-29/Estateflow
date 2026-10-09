import type { Metadata } from 'next';
import { OnboardingWizard } from '@/features/onboarding/onboarding-wizard';

export const metadata: Metadata = {
  title: 'Dealer onboarding',
  description: 'Complete your dealer profile for matching and workspace access.',
};

export default function DealerOnboardingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4">
        <h1 className="text-lg font-semibold">Dealer profile</h1>
        <p className="text-sm text-muted-foreground">Help us understand how you operate — you can resume anytime.</p>
      </header>
      <OnboardingWizard />
    </div>
  );
}
