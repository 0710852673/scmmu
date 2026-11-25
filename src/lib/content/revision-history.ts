export type RevisionValue = string | number | boolean | null;
export type RevisionSnapshot = Record<string, RevisionValue>;

export interface ContentRevision {
  id: string;
  contentId: string;
  revision: number;
  state: "draft" | "pending" | "approved" | "archived";
  snapshot: RevisionSnapshot;
  createdAt: string;
  createdBy?: string | null;
  note?: string | null;
}

export interface RevisionChange {
  field: string;
  before: RevisionValue;
  after: RevisionValue;
}

export function compareRevisionSnapshots(
  before: RevisionSnapshot,
  after: RevisionSnapshot,
): RevisionChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .sort()
    .filter((field) => before[field] !== after[field])
    .map((field) => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
}

export function nextRevisionNumber(revisions: Pick<ContentRevision, "revision">[]): number {
  return revisions.reduce((max, item) => Math.max(max, item.revision), 0) + 1;
}

export function restoreAsDraft(revision: ContentRevision, now = new Date().toISOString()): ContentRevision {
  return {
    ...revision,
    id: crypto.randomUUID(),
    revision: revision.revision + 1,
    state: "draft",
    createdAt: now,
    note: `Restored from revision ${revision.revision}`,
  };
}
