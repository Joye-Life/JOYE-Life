export type ApplicationStatus = "pending" | "approved" | "rejected" | "invited";
export type AccessStatus = "pending" | "active" | "suspended";

export interface BetaApplication {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  primary_focus: string;
  biggest_challenge: string;
  desired_outcome: string;
  expected_frequency: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface UserContext {
  displayName: string;
  timezone: string;
  availableMinutes: number;
  energy: "low" | "medium" | "high";
  primaryFocus: string;
  goals: Array<{ id: string; title: string; progress: number; dueDate?: string }>;
  tasks: Array<{ id: string; title: string; minutes: number; priority: number; completed: boolean; dueDate?: string }>;
  money: { nextPayday?: string; availableMargin?: number; upcomingBills?: number };
  career: { currentRole?: string; targetRole?: string; nextMilestone?: string };
}
