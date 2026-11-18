import "server-only";
import type { AppState, Focus, Mission, PersonalizationSource, PracticeStatus } from "@/lib/types";
import { getMission } from "@/content/missions";
import { auth } from "@/auth";
import { ApiError, databaseError } from "./http";
import { rows } from "./db";
import { isContentReviewer } from "./review-access";

export type SessionUser = { id: string; email: string | null; createdAt: string; role: string };

export const allowUnreviewedContent = () => process.env.NODE_ENV !== "production" && process.env.ALLOW_UNREVIEWED_CONTENT === "true";

type MissionRow = {
  id: string; phase: string; title: string; reference: string; context: string; principle: string;
  practice: string; simplified: string; deepened: string; reflection_question: string;
};

export async function findMission(focus: Focus, day: number): Promise<Mission | undefined> {
  const result = await rows<MissionRow>(
    `select id, phase, title, reference, context, principle, practice, simplified, deepened, reflection_question
     from public.mission_templates where focus = $1 and day = $2 and review_status = 'approved' limit 1`,
    [focus, day],
  );
  const row = result[0];
  if (row) return { id: row.id, focus, day, phase: row.phase, title: row.title, reference: row.reference, context: row.context, principle: row.principle, practice: row.practice, simplified: row.simplified, deepened: row.deepened, reflectionQuestion: row.reflection_question, reviewStatus: "approved" };
  return allowUnreviewedContent() ? getMission(focus, day) : undefined;
}

export async function assertMissionAvailable(focus: Focus, day: number) {
  const mission = await findMission(focus, day);
  if (!mission) throw new ApiError(503, "Conteúdo aguardando revisão humana.", "CONTENT_PENDING_REVIEW");
  return mission;
}

export async function requireSession(): Promise<{ user: SessionUser }> {
  const session = await auth();
  if (!session?.user?.id || !session.sessionToken) throw new ApiError(401, "Entre para continuar.", "UNAUTHENTICATED");
  let live: { expires: string }[];
  try {
    live = await rows<{ expires: string }>(
      `select expires from public.sessions where "sessionToken" = $1 and "userId" = $2::uuid and expires > now()`,
      [session.sessionToken, session.user.id],
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "CONFIGURATION_REQUIRED") throw error;
    if (error instanceof ApiError) throw new ApiError(503, "Serviço indisponível.", "SESSION_CHECK_UNAVAILABLE");
    databaseError({ code: "offline" });
    throw new ApiError(503, "Serviço indisponível.", "SESSION_CHECK_UNAVAILABLE");
  }
  if (!live.length) throw new ApiError(401, "Sessão encerrada. Entre novamente.", "SESSION_REVOKED");
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      createdAt: session.user.createdAt ?? new Date(0).toISOString(),
      role: session.user.role ?? "user",
    },
  };
}

export async function loadState(userId: string, reviewer = false): Promise<AppState> {
  const [profile] = await rows<{ display_name: string; preferred_time: string; locale: string; reminder_email: boolean }>(
    `select display_name, preferred_time::text as preferred_time, locale, reminder_email from public.profiles where user_id = $1`,
    [userId],
  );
  const [consent] = await rows<{ sensitive_data: boolean; ai: boolean; history: boolean; journey_context: boolean }>(
    `select sensitive_data, ai, history, journey_context from public.consents where user_id = $1`,
    [userId],
  );
  const [journey] = await rows<{ id: string; focus: string; current_day: number; status: string; difficulty: string; goal: string }>(
    `select id, focus, current_day, status, difficulty, goal from public.journeys where user_id = $1 and status in ('active','completed') order by created_at desc limit 1`,
    [userId],
  );
  const [subscription] = await rows<{ plan_code: string }>(`select plan_code from public.subscriptions where user_id = $1`, [userId]);
  if (!profile || !consent || !subscription) throw new ApiError(503, "Serviço indisponível.", "PROFILE_UNAVAILABLE");
  const code = subscription.plan_code === "premium" ? "premium" : "free";
  const assignments = journey
    ? await rows<{ id: string; day: number; variant: string; personalized_practice: string | null; personalized_title: string | null; personalized_commitment: string | null; personalization_source: string | null; personalized_variant: string | null }>(
      `select id, day, variant, personalized_practice, personalized_title, personalized_commitment, personalization_source, personalized_variant from public.mission_assignments where user_id = $1 and journey_id = $2`,
      [userId, journey.id],
    )
    : [];
  const activities = await rows<{ id: string; title: string; description: string; created_at: string }>(
    `select id, title, description, created_at from public.activities where user_id = $1 order by created_at desc limit 100`,
    [userId],
  );
  const conversations = consent.history
    ? await rows<{ id: string; title: string; created_at: string }>(
      `select id, title, created_at from public.mentor_conversations where user_id = $1 order by created_at desc limit 100`,
      [userId],
    )
    : [];
  const [plan] = await rows<{ mentor_daily_limit: number }>(`select mentor_daily_limit from public.plans where code = $1`, [code]);
  const assignmentIds = assignments.map((item) => item.id);
  const checkins = assignmentIds.length
    ? await rows<{ id: string; assignment_id: string; status: string; reflection: string | null; learned: string | null; created_at: string }>(
      `select id, assignment_id, status, reflection, learned, created_at from public.check_ins where user_id = $1 and assignment_id = any($2::uuid[]) order by created_at`,
      [userId, assignmentIds],
    )
    : [];
  const current = assignments.find((item) => item.day === journey?.current_day);
  const mission = journey ? await findMission(journey.focus as Focus, journey.current_day) : undefined;
  const pending = Boolean(journey && (!mission || mission.reviewStatus !== "approved"));
  const available = Boolean(mission && (!pending || allowUnreviewedContent()));
  return {
    profile: { displayName: profile.display_name, preferredTime: String(profile.preferred_time).slice(0, 5), locale: profile.locale, reminderEmail: Boolean(profile.reminder_email) },
    consents: { sensitiveData: consent.sensitive_data, ai: consent.ai, history: consent.history, journeyContext: consent.journey_context },
    reviewer,
    journey: journey ? { id: journey.id, focus: journey.focus as Focus, currentDay: journey.current_day, status: journey.status as "active" | "completed", difficulty: journey.difficulty, goal: journey.goal } : null,
    today: available && mission && current && journey?.status === "active" ? { ...mission, assignmentId: current.id, variant: current.variant as "standard" | "simplified" | "deepened", ...storedPersonalization(current) } : null,
    checkins: checkins.flatMap((checkin) => {
      const assignment = assignments.find((item) => item.id === checkin.assignment_id);
      return assignment ? [{ id: checkin.id, assignmentId: checkin.assignment_id, day: assignment.day, status: checkin.status as PracticeStatus, reflection: checkin.reflection, learned: checkin.learned, createdAt: checkin.created_at }] : [];
    }),
    activities: activities.map((item) => ({ id: item.id, title: item.title, description: item.description, createdAt: item.created_at })),
    conversations: conversations.map((item) => ({ id: item.id, title: item.title, createdAt: item.created_at })),
    plan: { code, mentorDailyLimit: plan?.mentor_daily_limit ?? 5 },
    contentPendingReview: pending,
  };
}

export async function requireContext(): Promise<{ user: SessionUser; state: AppState }> {
  const { user } = await requireSession();
  const state = await loadState(user.id, isContentReviewer(user.email ?? undefined, { role: user.role }));
  return { user, state };
}

function storedPersonalization(current: { variant: string; personalized_practice?: string | null; personalized_title?: string | null; personalized_commitment?: string | null; personalization_source?: string | null; personalized_variant?: string | null }) {
  const ready = Boolean(current.personalized_practice) && current.personalized_variant === current.variant;
  const source: PersonalizationSource = current.personalization_source === "model" ? "model" : "fallback";
  return {
    personalizedTitle: ready ? current.personalized_title ?? null : null,
    personalizedCommitment: ready ? current.personalized_commitment ?? null : null,
    personalizedPractice: ready ? current.personalized_practice ?? "" : "",
    personalizationSource: ready ? source : "fallback" as const,
  };
}
