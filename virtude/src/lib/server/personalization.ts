import "server-only";
import { personalizePractice } from "@/lib/ai/personalize-service";
import { catalogPractice, fallbackPersonalization, type Personalization } from "@/lib/personalize";
import type { AppState } from "@/lib/types";
import { call } from "./db";

export async function ensurePersonalization(userId: string, state: AppState): Promise<AppState> {
  const today = state.today;
  const journey = state.journey;
  if (!today || !journey || journey.status !== "active" || today.personalizedPractice) return state;
  const basePractice = catalogPractice(today, today.variant);
  const recentCheckins = state.consents.sensitiveData && state.consents.journeyContext
    ? state.checkins.slice(-3).map((item) => ({ status: item.status, learned: item.learned }))
    : [];
  let result: Personalization = fallbackPersonalization({ goal: journey.goal, difficulty: journey.difficulty });
  if (state.consents.ai) {
    result = await personalizePractice({
      reference: today.reference,
      basePractice,
      goal: journey.goal,
      difficulty: journey.difficulty,
      recentCheckins,
    });
  }
  try {
    await call("save_day_personalization", [userId, today.assignmentId, result.personalizedPractice, result.personalizedTitle, result.personalizedCommitment, result.personalizationSource]);
  } catch {
    // The screen can still show the text resolved for this request.
  }
  return { ...state, today: { ...today, ...result } };
}
