export type SearchEntityType = 'lead' | 'buyer' | 'property' | 'project' | 'dealer' | 'visit' | 'deal';

export interface SearchHit {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle: string;
  href?: string;
}

export interface SearchIndex {
  search(query: string, limit: number): SearchHit[];
}

/** In-process search used until a dedicated search service is configured. */
export class MemorySearchIndex implements SearchIndex {
  constructor(private readonly hits: SearchHit[]) {}

  search(query: string, limit: number): SearchHit[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return this.hits
      .filter((hit) => `${hit.title} ${hit.subtitle}`.toLowerCase().includes(q))
      .slice(0, limit);
  }
}

export function pageSearchHits(hits: SearchHit[], offset: number, limit: number): SearchHit[] {
  const start = Math.max(0, offset);
  const size = Math.min(Math.max(limit, 0), 20);
  return hits.slice(start, start + size);
}

/** Drops hits the caller is not allowed to see. Null means the caller passed an already scoped set. */
export function permissionAwareHits(hits: SearchHit[], allowedIds: ReadonlySet<string> | null): SearchHit[] {
  if (!allowedIds) return hits;
  return hits.filter((hit) => allowedIds.has(hit.id));
}
