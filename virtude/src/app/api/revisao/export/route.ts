import { requireSession } from "@/lib/server/context";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { isContentReviewer } from "@/lib/server/review-access";
import { listReviews, reviewsToCsv } from "@/lib/server/review-service";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { user } = await requireSession();
    if (!isContentReviewer(user.email ?? undefined, { role: user.role })) throw new ApiError(403, "Esta revisão é restrita à equipe editorial.", "FORBIDDEN");
    const format = new URL(request.url).searchParams.get("format");
    const report = await listReviews();
    const generatedAt = new Date().toISOString();
    if (format === "csv") {
      return new Response(reviewsToCsv(report.items), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=\"virtude-revisao.csv\"",
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (format !== "json") throw new ApiError(400, "Escolha o formato json ou csv.", "INVALID_INPUT");
    return json({
      version: 1,
      generatedAt,
      policy: "Nenhuma missão é aprovada automaticamente. O status só muda com uma decisão humana registrada.",
      counts: report.counts,
      persistence: report.persistence,
      missions: report.items.map((item) => ({
        id: item.id, focus: item.focus, day: item.day, title: item.title, reference: item.reference,
        status: item.status, attention: item.attention, latest: item.latest,
      })),
    });
  });
}
