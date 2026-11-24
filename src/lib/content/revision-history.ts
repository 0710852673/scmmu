export type RevisionStatus = "draft" | "pending" | "approved" | "rejected" | "archived";

export type ContentRevision<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  contentType: string;
  contentId: string;
  revision: number;
  status: RevisionStatus;
  data: T;
  createdAt: string;
  createdBy?: string;
  note?: string;
};

export type RevisionHistoryOptions = {
  maxRevisions?: number;
};

export function createRevision<T extends Record<string, unknown>>(
  previous: ContentRevision<T> | undefined,
  input: Omit<ContentRevision<T>, "revision">,
): ContentRevision<T> {
  return {
    ...input,
    revision: (previous?.revision ?? 0) + 1,
  };
}

export function compareRevisionData(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Object.fromEntries(
    [...keys]
      .sort()
      .filter((key) => !Object.is(before[key], after[key]))
      .map((key) => [key, { before: before[key] ?? null, after: after[key] ?? null }]),
  );
}

export function restoreRevision<T extends Record<string, unknown>>(
  current: ContentRevision<T>,
  target: ContentRevision<T>,
  actorId: string,
  note = "Restored from revision",
): ContentRevision<T> {
  return createRevision(current, {
    id: crypto.randomUUID(),
    contentType: current.contentType,
    contentId: current.contentId,
    status: "draft",
    data: structuredClone(target.data),
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    note,
  });
}

export function trimRevisionHistory<T extends Record<string, unknown>>(
  revisions: ContentRevision<T>[],
  options: RevisionHistoryOptions = {},
): ContentRevision<T>[] {
  const maxRevisions = Math.max(1, options.maxRevisions ?? 50);
  return [...revisions]
    .sort((a, b) => b.revision - a.revision)
    .slice(0, maxRevisions);
}
