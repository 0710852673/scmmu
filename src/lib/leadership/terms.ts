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
  const seen = new Set<string>();
  for (const assignment of assignments) {
    const key = assignment.position.trim().toLowerCase();
    if (!key) errors.push("Every assignment needs a position.");
    if (seen.has(key)) errors.push(`Duplicate position: ${assignment.position}`);
    seen.add(key);
    if (!assignment.memberId) errors.push(`Missing member for ${assignment.position}.`);
    if (assignment.startsOn < term.startsOn || assignment.startsOn > term.endsOn) {
      errors.push(`Assignment outside term: ${assignment.position}`);
    }
  }
  return errors;
}
