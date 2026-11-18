export type Focus = "self_control" | "relationships" | "stewardship" | "spiritual_life";
export type PracticeStatus = "completed" | "attempted" | "skipped";
export type ReviewStatus = "pending_review" | "approved" | "needs_changes" | "rejected";
export type PersonalizationSource = "model" | "fallback";
export type Mission = {
  id: string;
  focus: Focus;
  day: number;
  phase: string;
  title: string;
  reference: string;
  context: string;
  principle: string;
  practice: string;
  simplified: string;
  deepened: string;
  reflectionQuestion: string;
  reviewStatus: ReviewStatus;
};
export type CheckIn = {
  id: string;
  assignmentId: string;
  day: number;
  status: PracticeStatus;
  reflection: string | null;
  learned: string | null;
  createdAt: string;
};
export type Consents = {
  sensitiveData: boolean;
  ai: boolean;
  history: boolean;
  journeyContext: boolean;
};
export type AppState = {
  profile: { displayName: string; preferredTime: string; locale: string; reminderEmail: boolean };
  consents: Consents;
  reviewer: boolean;
  journey: {
    id: string;
    focus: Focus;
    currentDay: number;
    status: "active" | "completed";
    difficulty: string;
    goal: string;
  } | null;
  today: (Mission & {
    assignmentId: string;
    variant: "standard" | "simplified" | "deepened";
    personalizedTitle: string | null;
    personalizedCommitment: string | null;
    personalizedPractice: string;
    personalizationSource: PersonalizationSource;
  }) | null;
  checkins: CheckIn[];
  activities: { id: string; title: string; description: string; createdAt: string }[];
  conversations: { id: string; title: string; createdAt: string }[];
  plan: { code: "free" | "premium"; mentorDailyLimit: number };
  contentPendingReview: boolean;
};
export type MentorReply = {
  reply: string;
  references: string[];
  questions: string[];
  suggestedActivity: { title: string; description: string } | null;
  conversationId: string | null;
  safety: string;
};
