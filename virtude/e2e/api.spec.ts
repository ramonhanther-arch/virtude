import { expect, test } from "@playwright/test";

test("endpoints privados negam usuário sem sessão no servidor", async ({ request }) => {
  for (const endpoint of ["state", "export", "evolution", "mentor?conversationId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]) {
    const response = await request.get(`/api/${endpoint}`);
    expect(response.status(), endpoint).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.text();
    expect(body).not.toMatch(/stack|service_role|Error:|postgres|password=/i);
  }
  const mutations = [
    { endpoint: "checkins", method: "POST", data: { assignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "completed" } },
    { endpoint: "journey", method: "POST", data: { action: "advance" } },
    { endpoint: "mentor", method: "POST", data: { message: "Leia outra conta", mode: "reflection" } },
    { endpoint: "activities", method: "POST", data: { title: "Prática", description: "Escutar uma pessoa", confirmed: true } },
    { endpoint: "settings", method: "PATCH", data: { consents: { ai: true } } },
    { endpoint: "goal", method: "PATCH", data: { goal: "Ouvir com atenção", difficulty: "Responder no impulso" } },
    { endpoint: "account", method: "DELETE", data: { confirmation: "EXCLUIR", password: "synthetic-test-password" } },
    { endpoint: "onboarding", method: "POST", data: { displayName: "Teste", focus: "self_control", difficulty: "Escutar", goal: "Pausar", preferredTime: "08:00", sensitiveDataConsent: true, aiConsent: false, historyConsent: false, journeyContextConsent: false } },
    { endpoint: "auth", method: "POST", data: { action: "logout" } },
  ];
  for (const mutation of mutations) {
    const response = await request.fetch(`/api/${mutation.endpoint}`, { method: mutation.method, data: mutation.data, headers: { origin: "http://127.0.0.1:3211" } });
    expect(response.status(), mutation.endpoint).toBe(401);
  }
});

test("mutações rejeitam origem cruzada e tentativa de alterar plano", async ({ request }) => {
  const crossed = await request.patch("/api/settings", { data: { displayName: "A" }, headers: { origin: "https://evil.example" } });
  expect(crossed.status()).toBe(403);
  const noOrigin = await request.post("/api/journey", { data: { action: "advance" } });
  expect(noOrigin.status()).toBe(403);
  const upgrade = await request.patch("/api/settings", { data: { plan: "premium" }, headers: { origin: "http://127.0.0.1:3211" } });
  expect(upgrade.status()).toBe(400);
});

test("cabeçalhos de segurança são entregues pela aplicação", async ({ request }) => {
  const response = await request.get("/api/state");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["content-security-policy"]).toContain("'nonce-");
});
