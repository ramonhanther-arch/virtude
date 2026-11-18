import { z } from "zod";
import { mentorRequestSchema, urgentSupport } from "@/lib/ai/mentor-core";
import { generateMentorReply } from "@/lib/ai/mentor-service";
import { loadMentorLibrary } from "@/lib/ai/library";
import { recordAnalytics } from "@/lib/server/analytics";
import { requireContext } from "@/lib/server/context";
import { call, rows } from "@/lib/server/db";
import { ApiError, handleRoute, json, readJson } from "@/lib/server/http";
import { consumeLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const conversationSchema = z.uuid();

export function GET(request: Request) {
  return handleRoute(async () => {
    const { user, state } = await requireContext();
    if (!state.consents.history) throw new ApiError(403, "Ative o histórico para consultar conversas salvas.");
    await consumeLimit(user.id, "mentor_read", 60, 60);
    const id = conversationSchema.safeParse(new URL(request.url).searchParams.get("conversationId"));
    if (!id.success) throw new ApiError(400, "Escolha uma conversa válida.");
    const conversation = await rows<{ id: string }>(`select id from public.mentor_conversations where id = $1 and user_id = $2`, [id.data, user.id]);
    if (!conversation.length) throw new ApiError(404, "Conversa não encontrada.");
    const data = await rows<{ role: string; content: string }>(
      `select role, content from public.mentor_messages where conversation_id = $1 and user_id = $2 order by created_at desc limit 40`,
      [id.data, user.id],
    );
    return json({ messages: data.reverse().map(({ role, content }) => ({ role, content })) });
  });
}

export function POST(request: Request) {
  return handleRoute(async () => {
    const input = await readJson(request, mentorRequestSchema);
    const { user, state } = await requireContext();
    if (!state.consents.sensitiveData || !state.consents.ai) throw new ApiError(403, "Autorize o uso de IA nas configurações para conversar com o Mentor.", "AI_CONSENT_REQUIRED");
    const urgent = urgentSupport(input.message);
    if (urgent) return json({ ...urgent, conversationId: null });
    await consumeLimit(user.id, "mentor_minute", 3, 60);
    await consumeLimit(user.id, "mentor_daily", state.plan.mentorDailyLimit, 86400);
    if (input.conversationId) {
      if (!state.consents.history) throw new ApiError(403, "O histórico de conversas está desativado.");
      const conversation = await rows<{ id: string }>(`select id from public.mentor_conversations where id = $1 and user_id = $2`, [input.conversationId, user.id]);
      if (!conversation.length) throw new ApiError(404, "Conversa não encontrada.");
      const history = await rows<{ role: "user" | "assistant"; content: string }>(
        `select role, content from public.mentor_messages where conversation_id = $1 and user_id = $2 order by created_at desc limit 8`,
        [input.conversationId, user.id],
      );
      input.history = history.reverse().map(({ role, content }) => ({ role, content: String(content).slice(0, 1800) }));
    }
    const output = await generateMentorReply(input, state, await loadMentorLibrary());
    await recordAnalytics(user.id, "mentor_message", { plan: state.plan.code });
    let conversationId: string | null = null;
    if (state.consents.history) {
      const assistantContent = [output.reply, ...output.references, ...output.questions].join("\n\n");
      try {
        conversationId = await call<string>("save_mentor_exchange", [user.id, input.conversationId ?? null, input.message, assistantContent]);
      } catch (error) {
        if (error instanceof ApiError && error.code === "RATE_LIMITED") throw new ApiError(429, "Limite de histórico atingido. Tente novamente mais tarde.", "RATE_LIMITED");
        if (error instanceof ApiError && error.code === "FORBIDDEN") throw new ApiError(409, "A resposta não foi salva. Confira seus consentimentos e tente novamente.", "HISTORY_CHANGED");
        throw error;
      }
    }
    return json({ ...output, conversationId });
  });
}
