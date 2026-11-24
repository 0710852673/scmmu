import { describe, expect, it } from "vitest";
import {
  compareRevisionData,
  createRevision,
  restoreRevision,
  trimRevisionHistory,
} from "./revision-history";

describe("revision history", () => {
  it("increments revisions and compares changed fields", () => {
    const first = createRevision(undefined, {
      id: "r1",
      contentType: "announcement",
      contentId: "a1",
      status: "draft",
      data: { title: "Old", published: false },
      createdAt: "2026-11-21T00:00:00Z",
    });
    const second = createRevision(first, {
      id: "r2",
      contentType: "announcement",
      contentId: "a1",
      status: "pending",
      data: { title: "New", published: false },
      createdAt: "2026-11-21T00:01:00Z",
    });

    expect(second.revision).toBe(2);
    expect(compareRevisionData(first.data, second.data)).toEqual({
      title: { before: "Old", after: "New" },
    });
  });

  it("restores as a new draft without mutating the target", () => {
    const current = createRevision(undefined, {
      id: "r1",
      contentType: "project",
      contentId: "p1",
      status: "approved",
      data: { title: "Current" },
      createdAt: "2026-11-21T00:00:00Z",
    });
    const target = createRevision(current, {
      id: "r2",
      contentType: "project",
      contentId: "p1",
      status: "archived",
      data: { title: "Target" },
      createdAt: "2026-11-21T00:01:00Z",
    });
    const restored = restoreRevision(current, target, "actor-1");

    expect(restored.revision).toBe(2);
    expect(restored.status).toBe("draft");
    expect(restored.data).toEqual({ title: "Target" });
    expect(target.status).toBe("archived");
  });

  it("keeps the newest revisions within the limit", () => {
    const revisions = Array.from({ length: 4 }, (_, index) => ({
      id: String(index + 1),
      contentType: "event",
      contentId: "e1",
      revision: index + 1,
      status: "draft" as const,
      data: {},
      createdAt: new Date(2026, 10, 21, 0, index).toISOString(),
    }));
    expect(trimRevisionHistory(revisions, { maxRevisions: 2 }).map((item) => item.revision)).toEqual([4, 3]);
  });
});
