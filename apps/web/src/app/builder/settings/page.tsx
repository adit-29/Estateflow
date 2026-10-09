'use client';

import { ASSIGNMENT_MODES, type NotificationPrefs } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass } from '@/features/builder/format';

export default function BuilderSettingsPage() {
  const { workspace, run, mode, resetDemo } = useBuilderWorkspace();
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  const weights = workspace.settings.weights;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h2 className="text-xl font-semibold">Assignment settings</h2>
      <p className="text-sm text-muted-foreground">Weights are backend configuration. They are not chosen by a language model and cannot be edited in the browser.</p>
      <ul className="space-y-1 text-sm">
        {Object.entries(weights).map(([key, value]) => <li key={key}>{key}: {value}</li>)}
      </ul>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void run({
            type: 'update_settings',
            mode: String(form.get('mode')) as 'manual',
            responseWindowMinutes: Number(form.get('window')),
            maxReassignments: Number(form.get('retries')),
            monthlyLeadLimit: form.get('monthly') === '' ? null : Number(form.get('monthly')),
          });
          void run({ type: 'rename_organization', name: String(form.get('org') ?? '') });
        }}
      >
        <label className="block text-sm">Organization
          <Input name="org" defaultValue={workspace.organizationName} className="mt-1" />
        </label>
        <label className="block text-sm">Default mode
          <select name="mode" defaultValue={workspace.settings.mode} className={`${fieldClass} mt-1`}>
            {ASSIGNMENT_MODES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm">Response window (minutes)
          <Input name="window" type="number" defaultValue={workspace.settings.responseWindowMinutes} className="mt-1" />
        </label>
        <label className="block text-sm">Retries after no response
          <Input name="retries" type="number" defaultValue={workspace.settings.maxReassignments} className="mt-1" />
        </label>
        <label className="block text-sm">Maximum new leads per dealer this month
          <Input name="monthly" type="number" placeholder="Unlimited" defaultValue={workspace.settings.monthlyLeadLimit ?? ''} className="mt-1" />
          <span className="mt-1 block text-helper text-muted-foreground">Khali chhodne par limit nahi lagti. Over-capacity dealers recommend nahi honge.</span>
        </label>
        <Button type="submit">Save settings</Button>
      </form>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void run({ type: 'sweep_timeouts' });
          void form;
        }}
      >
        <Button type="button" variant="outline" onClick={() => run({ type: 'sweep_timeouts' })}>Check response windows now</Button>
      </form>
      <section className="space-y-2">
        <h3 className="font-medium">Notification preferences</h3>
        <p className="text-sm text-muted-foreground">These stay in this workspace. Demo notices are marked demo/local and are not sent by email or SMS.</p>
        {(Object.keys(workspace.settings.notifications) as (keyof NotificationPrefs)[]).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={workspace.settings.notifications[key]}
              onChange={(event) => run({ type: 'update_settings', notifications: { [key]: event.target.checked } })}
            />
            {key}
          </label>
        ))}
      </section>
      {mode === 'demo' && <Button type="button" variant="outline" onClick={resetDemo}>Reset demo workspace</Button>}
    </div>
  );
}
