export interface LeadershipTerm {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  finalized: boolean;
}

export interface LeadershipAssignment {
  termId: string;
  position: string;
  memberId: string;
  startsOn: string;
  endsOn?: string | null;
}

function overlaps(startA: string, endA: string | null | undefined, startB: string, endB: string | null | undefined): boolean {
  const effectiveEndA = endA ?? "9999-12-31";
  const effectiveEndB = endB ?? "9999-12-31";
  return startA <= effectiveEndB && startB <= effectiveEndA;
}

export function validateLeadershipTerm(term: LeadershipTerm): string[] {
  const errors: string[] = [];
  if (!term.label.trim()) errors.push("Term label is required.");
  if (!term.startsOn) errors.push("Start date is required.");
  if (!term.endsOn) errors.push("End date is required.");
  if (term.startsOn && term.endsOn && term.startsOn >= term.endsOn) {
    errors.push("End date must be after start date.");
  }
  return errors;
}

export function validateAssignments(
  term: LeadershipTerm,
  assignments: LeadershipAssignment[],
): string[] {
  const errors = validateLeadershipTerm(term);
  const seen = new Map<string, LeadershipAssignment>();
  for (const assignment of assignments) {
    const key = assignment.position.trim().toLowerCase();
    if (!key) errors.push("Every assignment needs a position.");
    if (!assignment.memberId) errors.push(`Missing member for ${assignment.position}.`);
    if (assignment.startsOn < term.startsOn || assignment.startsOn > term.endsOn) {
      errors.push(`Assignment outside term: ${assignment.position}`);
    }
    const previous = seen.get(key);
    if (previous && overlaps(previous.startsOn, previous.endsOn, assignment.startsOn, assignment.endsOn)) {
      errors.push(`Overlapping assignment for position: ${assignment.position}`);
    }
    seen.set(key, assignment);
  }
  return errors;
}
