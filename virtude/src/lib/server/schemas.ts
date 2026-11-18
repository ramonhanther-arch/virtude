import { z } from "zod";
export const focusSchema = z.enum(["self_control", "relationships", "stewardship", "spiritual_life"]);
export const nameSchema = z.string().trim().min(1).max(80);
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const passwordSchema = z.string().min(12).max(128);
export const onboardingSchema = z.object({
  displayName: nameSchema, focus: focusSchema, difficulty: z.string().trim().min(1).max(600), goal: z.string().trim().min(1).max(600),
  preferredTime: timeSchema, reminderEmail: z.boolean().optional(), sensitiveDataConsent: z.literal(true), aiConsent: z.boolean(), historyConsent: z.boolean(), journeyContextConsent: z.boolean(),
}).strict();
export const checkinSchema = z.object({ assignmentId: z.uuid(), status: z.enum(["completed", "attempted", "skipped"]), reflection: z.string().trim().max(4000).optional(), learned: z.string().trim().max(4000).optional() }).strict();
export const journeySchema = z.object({ action: z.enum(["advance", "adapt", "restart", "switch"]), focus: focusSchema.optional() }).strict().refine(v => v.action !== "switch" || Boolean(v.focus));
export const settingsSchema = z.object({ displayName: nameSchema.optional(), preferredTime: timeSchema.optional(), reminderEmail: z.boolean().optional(), consents: z.object({ sensitiveData: z.boolean().optional(), ai: z.boolean().optional(), history: z.boolean().optional(), journeyContext: z.boolean().optional() }).strict().optional() }).strict();
export const reviewDecisionSchema = z.object({
  focus: focusSchema,
  day: z.number().int().min(1).max(21),
  decision: z.enum(["approved", "needs_changes", "rejected"]),
  note: z.string().trim().max(2000),
}).strict().superRefine((value, ctx) => {
  if (value.decision !== "approved" && value.note.length < 8) ctx.addIssue({ code: "custom", path: ["note"], message: "nota" });
});
export const authSchema = z.discriminatedUnion("action", [
 z.object({ action: z.literal("login"), email: z.email().max(254), password: z.string().min(1).max(128) }).strict(),
 z.object({ action: z.literal("signup"), email: z.email().max(254), password: passwordSchema }).strict(),
 z.object({ action: z.literal("logout") }).strict(),
 z.object({ action: z.literal("forgot"), email: z.email().max(254) }).strict(),
 z.object({ action: z.literal("reset"), password: passwordSchema }).strict(),
]);
export const accountSchema = z.object({ confirmation: z.literal("EXCLUIR"), password: z.string().min(1).max(128) }).strict();
