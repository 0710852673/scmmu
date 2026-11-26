import { describe, expect, it } from "vitest";
import { escapeCsvCell, rowsToCsv, safeCsvFilename } from "./csv";
import { validateAssignments, validateLeadershipTerm } from "../leadership/terms";

describe("csv exports", () => {
  it("uses CRLF rows and escapes dangerous cells", () => {
    expect(rowsToCsv(["Name", "Note"], [["A", "line 1, line 2"]])).toBe(
      'Name,Note\r\nA,"line 1, line 2"',
    );
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("normalizes filenames", () => {
    expect(safeCsvFilename("board/2026")).toBe("board-2026.csv");
    expect(safeCsvFilename("")).toBe("export.csv");
    expect(safeCsvFilename("report.csv")).toBe("report.csv");
  });
});

describe("leadership validation", () => {
  const term = {
    id: "t1",
    label: "2026",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    finalized: false,
  };

  it("rejects invalid terms", () => {
    expect(validateLeadershipTerm({ ...term, endsOn: "2025-12-31" })).toContain(
      "End date must be after start date.",
    );
  });

  it("rejects overlapping assignments for one position", () => {
    const errors = validateAssignments(term, [
      { termId: "t1", position: "President", memberId: "m1", startsOn: "2026-01-01", endsOn: "2026-06-30" },
      { termId: "t1", position: "President", memberId: "m2", startsOn: "2026-06-30", endsOn: "2026-12-31" },
    ]);
    expect(errors).toContain("Overlapping assignment for position: President");
  });
});
