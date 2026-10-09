'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createDemoBuilderWorkspace, UNIT_STATUS_LABEL, totalLayoutArea } from '@estateflow/shared';
import { PublicHeader } from '@/components/public-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SampleTourViewer } from '@/features/tours/sample-tour-viewer';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ws = createDemoBuilderWorkspace(new Date('2026-10-01T10:00:00+05:30'));
  const project = ws.projects.find((item) => item.id === id);
  if (!project) {
    return (
      <div>
        <PublicHeader />
        <p className="p-8 text-body">Project nahi mila.</p>
      </div>
    );
  }
  const units = ws.units.filter((unit) => unit.projectId === project.id);
  const media = ws.media.filter((item) => item.projectId === project.id);
  const tour = ws.tours.find((item) => item.projectId === project.id && item.status === 'published');

  return (
    <div>
      <PublicHeader />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <p className="text-meta text-muted-foreground"><Link href="/projects">Projects</Link> / {project.locality}</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-page">{project.name}</h1>
            <p className="text-body text-muted-foreground">{project.developerName} · {project.address}</p>
          </div>
          <Badge variant="muted">Demo project</Badge>
        </div>
        <nav className="flex flex-wrap gap-3 text-meta">
          {['Overview', 'Inventory', 'Floor Plans', 'Gallery', 'Video', '3D Tour', 'Amenities', 'Location', 'Builder', 'Site Visit'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="rounded-full border px-3 py-1">{item}</a>
          ))}
        </nav>
        <section id="overview" className="space-y-2">
          <h2>Overview</h2>
          <p className="text-body">{project.description}</p>
          <p className="text-meta text-muted-foreground">RERA {project.reraNumber ?? 'not recorded'} · Possession {project.possessionDate ?? 'not recorded'} · {project.constructionStatus.replace('_', ' ')}</p>
        </section>
        <section id="inventory" className="space-y-2">
          <h2>Inventory</h2>
          <ul className="space-y-2 text-body">
            {units.map((unit) => (
              <li key={unit.id} className="flex justify-between gap-3 rounded-lg border px-3 py-2">
                <span>{unit.unitNumber} · {unit.configuration} · {unit.carpetAreaSqft} sq ft</span>
                <span>{UNIT_STATUS_LABEL[unit.availability]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section id="floor-plans" className="space-y-2">
          <h2>Floor Plans</h2>
          {units.filter((unit) => unit.layout?.rooms.length).map((unit) => (
            <p key={unit.id} className="text-body">{unit.unitNumber}: structured layout · {totalLayoutArea(unit.layout!)} sq ft of rooms. Photo reconstruction nahi hai.</p>
          ))}
          {!units.some((unit) => unit.layout?.rooms.length) && <p className="text-body text-muted-foreground">Structured layout tabhi dikhega jab builder ne rooms save kiye hon.</p>}
        </section>
        <section id="gallery" className="space-y-2">
          <h2>Gallery</h2>
          <p className="text-body text-muted-foreground">{media.filter((item) => item.kind === 'image').map((item) => item.fileName).join(', ') || 'No image files stored.'}</p>
        </section>
        <section id="video" className="space-y-2">
          <h2>Video</h2>
          <p className="text-body text-muted-foreground">{media.filter((item) => item.kind === 'video').map((item) => item.fileName).join(', ') || 'No video on file.'}</p>
        </section>
        <section id="3d-tour" className="space-y-3">
          <h2>3D Tour</h2>
          {tour ? (
            <>
              <p className="text-body">DEMO 3D — This is an illustrative sample experience. Uploaded media ne ye model create nahi kiya.</p>
              <SampleTourViewer height={360} />
            </>
          ) : (
            <p className="text-body text-muted-foreground">Published 3D tour nahi hai.</p>
          )}
        </section>
        <section id="amenities">
          <h2>Amenities</h2>
          <p className="mt-2 text-body">{project.amenities.join(', ') || 'Not recorded'}</p>
        </section>
        <section id="location">
          <h2>Location</h2>
          <p className="mt-2 text-body">{project.locality}, {project.city}{project.latitude != null ? ` · ${project.latitude}, ${project.longitude}` : '. Coordinates not stored.'}</p>
        </section>
        <section id="builder">
          <h2>Builder</h2>
          <p className="mt-2 text-body">{project.developerName} — fictional demo organization.</p>
        </section>
        <section id="site-visit">
          <h2>Site Visit</h2>
          <p className="mt-2 text-body text-muted-foreground">Public page se live booking nahi hoti. Dealer/builder workspace visit record karta hai.</p>
          <Button asChild className="mt-3"><Link href="/auth/sign-in?role=buyer">Buyer ke taur par continue</Link></Button>
        </section>
      </div>
    </div>
  );
}
