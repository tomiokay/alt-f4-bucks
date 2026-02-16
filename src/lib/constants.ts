export const TRANSACTION_CATEGORIES = [
  "attendance",
  "contribution",
  "mentoring",
  "competition",
  "outreach",
  "leadership",
  "cleanup",
  "bonus",
  "penalty",
  "other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  attendance: "Attendance",
  contribution: "Contribution",
  mentoring: "Mentoring",
  competition: "Competition",
  outreach: "Outreach",
  leadership: "Leadership",
  cleanup: "Cleanup",
  bonus: "Bonus",
  penalty: "Penalty",
  other: "Other",
};
