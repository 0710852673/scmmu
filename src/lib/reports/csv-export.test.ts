import { describe, expect, it } from "vitest";
import { toCsv } from "./csv-export";

describe("csv export", () => {
  it("exports headers, escaped values, and formatted cells", () => {
    const csv = toCsv(
      [{ id: "M-001", name: "Shehara, Geeneth", points: 12 }],
      [
        { key: "id", label: "Member ID" },
        { key: "name", label: "Name" },
        { key: "points", label: "Points", format: (value) => Number(value).toFixed(0) },
      ],
    );

    expect(csv).toBe('Member ID,Name,Points\nM-001,"Shehara, Geeneth",12');
  });
});
