'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONSTRUCTION_STATUSES, PROJECT_STATUSES, PROJECT_TYPES, PROJECT_VISIBILITY } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass } from '@/features/builder/format';

export default function NewProjectPage() {
  const { run } = useBuilderWorkspace();
  const router = useRouter();
  const [amenities, setAmenities] = useState('Lift, Power backup');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const visibility = String(form.get('visibility')) as 'private' | 'dealers' | 'public';
    try {
      const next = await run({
        type: 'create_project',
        project: {
          name: String(form.get('name') ?? ''),
          projectType: String(form.get('projectType')) as 'residential',
          developerName: String(form.get('developerName') ?? ''),
          city: String(form.get('city') ?? ''),
          locality: String(form.get('locality') ?? ''),
          address: String(form.get('address') ?? ''),
          description: String(form.get('description') ?? ''),
          reraNumber: String(form.get('reraNumber') ?? '') || null,
          constructionStatus: String(form.get('constructionStatus')) as 'pre_launch',
          possessionDate: String(form.get('possessionDate') ?? '') || null,
          amenities: amenities.split(',').map((item) => item.trim()).filter(Boolean),
          visibility,
          status: String(form.get('status')) as 'draft',
          latitude: form.get('latitude') ? Number(form.get('latitude')) : null,
          longitude: form.get('longitude') ? Number(form.get('longitude')) : null,
        },
      });
      if (!next) return;
      router.push(`/builder/projects/${next.projects[0].id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">New project</h2>
      <p className="text-sm text-muted-foreground">A draft stays private. A public listing needs an active status, address, description, and registration number.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Field name="name" label="Project name" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="projectType" label="Project type" options={PROJECT_TYPES} />
        <Select name="status" label="Status" options={PROJECT_STATUSES} />
      </div>
      <Field name="developerName" label="Developer / builder name" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="city" label="City" />
        <Field name="locality" label="Locality" />
      </div>
      <Field name="address" label="Address" />
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" />
      </div>
      <Field name="reraNumber" label="RERA / project registration" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="constructionStatus" label="Construction status" options={CONSTRUCTION_STATUSES} />
        <Select name="visibility" label="Visibility" options={PROJECT_VISIBILITY} />
      </div>
      <Field name="possessionDate" label="Possession date" type="date" />
      <div className="space-y-2">
        <Label htmlFor="amenities">Amenities</Label>
        <Input id="amenities" value={amenities} onChange={(event) => setAmenities(event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="latitude" label="Latitude" />
        <Field name="longitude" label="Longitude" />
      </div>
      <Button type="submit">Create project</Button>
    </form>
  );
}

function Field({ name, label, type = 'text' }: { name: string; label: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
    </div>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} className={fieldClass}>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
      </select>
    </div>
  );
}
