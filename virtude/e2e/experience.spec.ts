import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { focusLabels, getMission } from "../src/content/missions";
import { fallbackPersonalization } from "../src/lib/personalize";
import { conversationId, mockAccount, noHorizontalOverflow, sampleState } from "./fixtures";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }, testInfo) => {
  const errors = browserErrors.get(page) ?? [];
  if (testInfo.status !== testInfo.expectedStatus || errors.length) {
    await page.screenshot({ path: testInfo.outputPath("failure.png"), fullPage: true });
    if (errors.length) await testInfo.attach("browser-errors", { body: JSON.stringify(errors), contentType: "application/json" });
  }
  expect(errors, "Unhandled browser exceptions").toEqual([]);
});

test("landing: links públicos, âncoras e FAQ operam", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprender a vivê-la");
  for (const name of ["Jornadas", "Planos"]) {
    const link = page.getByRole("navigation", { name: "Páginas públicas" }).getByRole("link", { name, exact: true });
    await link.click();
    const hash = await link.getAttribute("href");
    await expect(page.locator(hash!)).toBeVisible();
  }
  for (const details of await page.locator("details").all()) {
    await details.locator("summary").click();
    await expect(details.locator("p")).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Ver uma amostra", exact: true }).first()).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("navigation", { name: "Páginas públicas" }).getByRole("link", { name: "Entrar", exact: true })).toHaveAttribute("href", "/entrar");
  await noHorizontalOverflow(page);
});

test("demo: navegação local nunca chama API privada", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/api/**", (route) => { requests.push(route.request().url()); return route.fulfill({ status: 500, json: { error: "Demo must stay local" } }); });
  await page.goto("/demo");
  const disclosure = page.locator("summary").filter({ hasText: "Demonstração sintética · dados efêmeros, sem conta." });
  await expect(disclosure).toBeVisible();
  await disclosure.click();
  await expect(page.getByText(/^Demonstração sintética\. Os dados/)).toBeVisible();
  await disclosure.click();
  for (const name of ["Jornada", "Mentor", "Evolução", "Ajustes", "Hoje"]) {
    await page.getByRole("link", { name, exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noHorizontalOverflow(page);
  }
  await page.getByRole("link", { name: "Jornada", exact: true }).filter({ visible: true }).click();
  await page.getByRole("radio", { name: "Tentei", exact: true }).check();
  await page.getByLabel(getMission("self_control", 1)!.reflectionQuestion).fill("Registro sintético local da demonstração.");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("button", { name: "Atualizar registro" })).toBeVisible();
  await page.getByRole("link", { name: "Ajustes", exact: true }).filter({ visible: true }).click();
  await page.getByRole("checkbox", { name: "Permitir que o Mentor use inteligência artificial." }).check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferências salvas" })).toBeVisible();
  await page.getByRole("link", { name: "Mentor", exact: true }).filter({ visible: true }).click();
  await page.getByRole("radio", { name: "Ensaio, simulação" }).check();
  await page.getByLabel("Sua mensagem").fill("Ensaio sintético local.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/Simulação da demonstração:/)).toBeVisible();
  await page.getByRole("button", { name: "Incluir esta atividade" }).click();
  await expect(page.getByRole("button", { name: "Atividade incluída" })).toBeDisabled();
  expect(requests).toEqual([]);
});

test("demo: evolução mantém a jornada atual em curso e os registros dos recomeços", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/api/**", (route) => { requests.push(route.request().url()); return route.fulfill({ status: 500, json: { error: "Demo must stay local" } }); });
  await page.goto("/demo?tela=evolucao");
  await expect(page.getByRole("heading", { name: "O que foi registrado", exact: true })).toBeVisible();
  await expect(page.getByText("Em curso · jornada em tela · dia 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/Arquivada/)).toHaveCount(0);
  for (const index of [1, 2]) {
    await page.getByRole("link", { name: "Jornada", exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(focusLabels.self_control);
    await page.getByRole("radio", { name: "Tentei", exact: true }).check();
    await page.getByLabel(getMission("self_control", 1)!.reflectionQuestion).fill(`Registro sintético do recomeço ${index}.`);
    await page.getByRole("button", { name: "Salvar registro", exact: true }).click();
    await expect(page.getByRole("button", { name: "Atualizar registro", exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Recomeçar ${focusLabels.self_control}`, exact: true }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "A amostra recomeçou no dia 1." })).toBeVisible();
  }
  await page.getByRole("link", { name: "Evolução", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: "O que foi registrado", exact: true })).toBeVisible();
  const journeys = page.getByRole("article");
  await expect(journeys).toHaveCount(3);
  await expect(journeys.first().getByText("Em curso · jornada em tela · dia 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Arquivada · dia 1", { exact: true })).toHaveCount(2);
  for (const index of [1, 2]) await expect(page.getByText(`Registro sintético do recomeço ${index}.`, { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

for (const [status, label] of [["completed", "Realizei"], ["attempted", "Tentei"], ["skipped", "Não realizei"]] as const) {
  test(`jornada: check-in ${status}, adaptação e progressão explícita`, async ({ page }) => {
    const api = await mockAccount(page);
    await page.goto("/app/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(focusLabels.self_control);
    const advance = page.getByRole("button", { name: "Avançar para o próximo dia" });
    await expect(advance).toBeDisabled();
    await page.getByRole("radio", { name: label, exact: true }).check();
    await page.getByLabel(getMission("self_control", 1)!.reflectionQuestion).fill("Relato sintético: ouvi antes de responder.");
    await page.getByLabel("O que você percebeu, se quiser registrar").fill("Uma pausa ajudou.");
    await page.getByRole("button", { name: "Salvar registro" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Registro salvo" })).toBeVisible();
    expect(api.calls.find((call) => call.path === "/api/checkins")?.body).toEqual({ assignmentId: sampleState().today!.assignmentId, status, reflection: "Relato sintético: ouvi antes de responder.", learned: "Uma pausa ajudou." });
    expect(api.calls.filter((call) => call.path === "/api/journey")).toHaveLength(0);
    await expect(page.getByText("Dia 1 de 21", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Usar alternativa simplificada" }).click();
    await expect(page.getByRole("button", { name: "Alternativa já em uso" })).toBeDisabled();
    await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: getMission("self_control", 1)!.title, exact: true }) }).getByText(getMission("self_control", 1)!.simplified, { exact: true })).toBeVisible();
    await advance.click();
    await expect(page.getByText("Dia 2 de 21", { exact: false })).toBeVisible();
    await expect(advance).toBeDisabled();
    expect(api.calls.filter((call) => call.path === "/api/journey").map((call) => call.body)).toEqual([{ action: "adapt" }, { action: "advance" }]);
    expect(api.unexpected).toEqual([]);
    await noHorizontalOverflow(page);
  });
}

test("jornada: erro não confirma registro e pausa não envia mutação", async ({ page }) => {
  const api = await mockAccount(page);
  api.failures["/api/checkins"] = { status: 429, error: "Limite temporário. Tente mais tarde." };
  await page.goto("/app/jornada");
  await page.getByRole("radio", { name: "Tentei", exact: true }).check();
  await page.getByLabel(getMission("self_control", 1)!.reflectionQuestion).fill("Relato sintético breve.");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Limite temporário. Tente mais tarde.");
  await expect(page.getByRole("button", { name: "Avançar para o próximo dia" })).toBeDisabled();
  await page.getByText("Pausar sem punição", { exact: true }).click();
  await page.getByRole("button", { name: "Vou pausar hoje" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Nada foi enviado" })).toBeVisible();
  expect(api.calls.filter((call) => call.method !== "GET")).toHaveLength(1);
});

test("jornada: troca e recomeço pedem confirmação", async ({ page }) => {
  const api = await mockAccount(page);
  await page.goto("/app/jornada");
  await page.getByRole("button", { name: `Começar ${focusLabels.relationships}` }).click();
  expect(api.calls.filter((call) => call.path === "/api/journey")).toHaveLength(0);
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(focusLabels.relationships);
  await page.getByRole("button", { name: `Recomeçar ${focusLabels.relationships}` }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "recomeçou" })).toBeVisible();
  expect(api.calls.filter((call) => call.path === "/api/journey").map((call) => call.body)).toEqual([{ action: "switch", focus: "relationships" }, { action: "restart" }]);
});

test("mentor: IA desligada bloqueia envio e oferece configurações", async ({ page }) => {
  const api = await mockAccount(page);
  await page.goto("/app/mentor");
  await expect(page.getByRole("heading", { name: "O Mentor está desligado" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Sua mensagem" })).toHaveCount(0);
  await page.getByRole("link", { name: "Abrir configurações" }).click();
  await expect(page).toHaveURL(/\/app\/configuracoes$/);
  expect(api.calls.filter((call) => call.path === "/api/mentor")).toHaveLength(0);
});

test("mentor: conversa salva, ensaio explícito e atividade só após confirmar", async ({ page }) => {
  const state = sampleState();
  state.consents = { sensitiveData: true, ai: true, history: true, journeyContext: false };
  state.conversations = [{ id: conversationId, title: "Conversa sintética anterior", createdAt: "2026-10-27T12:00:00Z" }];
  const api = await mockAccount(page, state);
  await page.goto("/app/mentor");
  await page.getByRole("button", { name: "Conversa sintética anterior" }).click();
  await expect(page.getByText("Resposta sintética salva", { exact: true })).toBeVisible();
  expect(api.calls.find((call) => call.method === "GET" && call.path === "/api/mentor")?.search).toBe(`?conversationId=${conversationId}`);
  await page.getByRole("radio", { name: "Ensaio, simulação" }).check();
  await expect(page.getByText(/Isto é uma simulação textual/)).toBeVisible();
  await page.getByLabel("Sua mensagem").fill("Quero ensaiar uma conversa com respeito.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(api.reply.reply, { exact: true })).toBeVisible();
  expect(api.calls.find((call) => call.method === "POST" && call.path === "/api/mentor")?.body).toEqual({ message: "Quero ensaiar uma conversa com respeito.", mode: "rehearsal", conversationId });
  expect(api.calls.filter((call) => call.path === "/api/activities")).toHaveLength(0);
  await page.getByRole("button", { name: "Incluir esta atividade" }).click();
  await expect(page.getByRole("button", { name: "Atividade incluída" })).toBeDisabled();
  expect(api.calls.find((call) => call.path === "/api/activities")?.body).toEqual({ ...api.reply.suggestedActivity, confirmed: true });
  await expect(page.getByRole("heading", { name: "Atividades confirmadas" })).toBeVisible();
  expect(api.unexpected).toEqual([]);
  await noHorizontalOverflow(page);
});

test("mentor: erro preserva mensagem sem adicionar atividade", async ({ page }) => {
  const state = sampleState(); state.consents.ai = true;
  const api = await mockAccount(page, state);
  api.failures["/api/mentor"] = { status: 429, error: "Limite diário atingido." };
  await page.goto("/app/mentor");
  await page.getByLabel("Sua mensagem").fill("Mensagem sintética para tentar depois.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Limite diário atingido.");
  await expect(page.getByLabel("Sua mensagem")).toHaveValue("Mensagem sintética para tentar depois.");
  expect(api.calls.filter((call) => call.path === "/api/activities")).toHaveLength(0);
});

test("configurações: opt-in independente, revogação, exportação e exclusão", async ({ page }) => {
  const api = await mockAccount(page);
  await page.goto("/app/configuracoes");
  const ai = page.getByRole("checkbox", { name: "Permitir que o Mentor use inteligência artificial." });
  const history = page.getByRole("checkbox", { name: "Guardar o histórico das conversas." });
  const context = page.getByRole("checkbox", { name: "Compartilhar o contexto da jornada atual com o Mentor." });
  for (const checkbox of [ai, history, context]) await expect(checkbox).not.toBeChecked();
  await ai.check(); await history.check();
  await page.getByLabel("Nome", { exact: true }).fill("Nome sintético atualizado");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /salv|atualiz/i })).toBeVisible();
  expect(api.calls.find((call) => call.path === "/api/settings")?.body).toEqual({ displayName: "Nome sintético atualizado", preferredTime: "08:00", reminderEmail: false, consents: { ai: true, history: true, journeyContext: false } });
  await history.uncheck();
  await expect(page.getByText(/histórico apaga as conversas/)).toBeVisible();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(history).not.toBeChecked();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar dados" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("synthetic-virtude.json");
  const path = await download.path(); expect(path).toBeTruthy();
  expect(JSON.parse(await readFile(path!, "utf8")).synthetic).toBe(true);
  await page.getByRole("button", { name: "Quero excluir" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar exclusão" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  expect(api.calls.filter((call) => call.path === "/api/account")).toHaveLength(0);
  await page.getByRole("button", { name: "Quero excluir" }).click();
  await dialog.getByLabel("Digite EXCLUIR").fill("EXCLUIR");
  await dialog.getByLabel("Senha", { exact: true }).fill("synthetic-password-only");
  await dialog.getByRole("button", { name: "Excluir conta", exact: true }).click();
  await expect(page).toHaveURL(/\/(entrar|cadastro|\?)/);
  expect(api.calls.find((call) => call.path === "/api/account")?.body).toEqual({ confirmation: "EXCLUIR", password: "synthetic-password-only" });
  expect(api.unexpected).toEqual([]);
});

for (const path of ["/", "/entrar", "/cadastro", "/onboarding", "/app", "/app/jornada", "/app/mentor", "/app/evolucao", "/app/configuracoes", "/demo"]) {
  test(`acessibilidade WCAG A/AA e overflow: ${path}`, async ({ page }, testInfo) => {
    const state = sampleState();
    state.consents.ai = true;
    if (path === "/onboarding") { state.journey = null; state.today = null; }
    const api = await mockAccount(page, state);
    if (path === "/entrar" || path === "/cadastro") api.failures["/api/state"] = { status: 401, error: "Entre na sua conta." };
    const response = await page.goto(path);
    expect(response?.status(), `HTTP status for ${path}`).toBe(200);
    const expectedHeading = path === "/" ? /Aprender a vivê-la/ : path === "/entrar" ? "Entrar" : path === "/cadastro" ? "Criar conta" : path === "/onboarding" ? "Etapa 1 de 3" : path === "/app/jornada" ? focusLabels.self_control : path === "/app/mentor" ? "Uma conversa, com limite." : path === "/app/evolucao" ? "O que foi registrado" : path === "/app/configuracoes" ? "Sua conta e seus consentimentos" : /o gesto de hoje/;
    await expect(page.getByRole("heading", { level: 1 })).toContainText(expectedHeading);
    await noHorizontalOverflow(page);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    if (result.violations.length) {
      await page.screenshot({ path: testInfo.outputPath("accessibility.png"), fullPage: true });
      await testInfo.attach("axe-violations", { body: JSON.stringify(result.violations, null, 2), contentType: "application/json" });
    }
    expect(result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) }))).toEqual([]);
    expect(api.unexpected).toEqual([]);
  });
}

test("onboarding: consentimentos começam desmarcados e só o sensível é necessário", async ({ page }) => {
  const state = sampleState(); state.journey = null; state.today = null;
  const api = await mockAccount(page, state);
  await page.goto("/onboarding");
  await expect(page.getByRole("group", { name: "Qual área da sua vida você mais deseja transformar à luz dos ensinamentos de Cristo?", exact: true })).toBeVisible();
  await page.getByLabel("Como você quer ser chamado").fill("  Nome sintético  ");
  await page.getByRole("radio", { name: focusLabels.self_control, exact: true }).check();
  await expect(page.getByRole("radio", { name: "Vida espiritual", exact: true })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "O que você gostaria de melhorar nas próximas semanas?", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Etapa 2 de 3" })).toBeVisible();
  const difficulty = page.getByLabel("Qual sua principal dificuldade nessa área?", { exact: true });
  const goal = page.getByLabel("O que você gostaria de melhorar nas próximas semanas?", { exact: true });
  await expect(difficulty).toHaveAttribute("maxlength", "600");
  await expect(goal).toHaveAttribute("maxlength", "600");
  await difficulty.fill("   ");
  await goal.fill("  Ouvir com calma  ");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Descreva a dificuldade em até 600 caracteres.");
  await difficulty.fill("  Interrompo antes de ouvir uma frase inteira.  ");
  await goal.fill("   ");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Escreva um objetivo de até 600 caracteres.");
  await goal.fill("  Ouvir com calma  ");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Etapa 3 de 3" })).toBeVisible();
  await expect(page.getByText("Desligar o histórico apaga as conversas salvas.", { exact: false })).toContainText("Desligar a IA impede novas respostas e a gravação de novas conversas, mas permite ler o histórico enquanto ele estiver autorizado.");
  const checkboxes = page.getByRole("checkbox");
  await expect(checkboxes).toHaveCount(5);
  for (const checkbox of await checkboxes.all()) await expect(checkbox).not.toBeChecked();
  await page.getByRole("button", { name: "Começar a jornada" }).click();
  expect(api.calls.filter((call) => call.path === "/api/onboarding")).toHaveLength(0);
  await page.getByRole("checkbox", { name: /Autorizo o tratamento dos dados sensíveis/ }).check();
  await page.getByRole("button", { name: "Começar a jornada" }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(api.calls.filter((call) => call.path === "/api/onboarding").map((call) => call.body)).toEqual([{ displayName: "Nome sintético", focus: "self_control", difficulty: "Interrompo antes de ouvir uma frase inteira.", goal: "Ouvir com calma", preferredTime: "08:00", reminderEmail: false, sensitiveDataConsent: true, aiConsent: false, historyConsent: false, journeyContextConsent: false }]);
});

test("estado: loading, erro recuperável, revisão bloqueada e sessão ausente", async ({ page }) => {
  const api = await mockAccount(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/state", async (route) => { await pending; await route.fulfill({ status: 500, json: { error: "Falha sintética de leitura." } }); });
  await page.goto("/app");
  await expect(page.getByRole("status").filter({ hasText: "Carregando" })).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Não foi possível carregar" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Falha sintética de leitura.");
  await page.unroute("**/api/state");
  api.state.today = null;
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("heading", { name: "A prática de hoje ainda não abre" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrar este dia" })).toHaveCount(0);
  api.failures["/api/state"] = { status: 401, error: "Entre na sua conta." };
  await page.goto("/app/jornada");
  await expect(page).toHaveURL(/\/entrar\?next=/);
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
});

test("evolução: três status, dias em branco e reflexão aparecem sem sequência punitiva", async ({ page }) => {
  const state = sampleState();
  state.checkins = (["completed", "attempted", "skipped"] as const).map((status, index) => ({ id: `synthetic-record-${index}`, assignmentId: `synthetic-assignment-${index}`, day: index + 1, status, reflection: `Reflexão sintética dia ${index + 1}`, learned: null, createdAt: "2026-10-27T12:00:00Z" }));
  const api = await mockAccount(page, state);
  await page.goto("/app/evolucao");
  await expect(page.getByRole("heading", { name: "O que foi registrado" })).toBeVisible();
  for (const [day, status] of [[1, "Realizei"], [2, "Tentei"], [3, "Não realizei"], [4, "Em branco"]]) {
    await expect(page.getByRole("listitem", { name: `Dia ${day}, ${status}`, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Reflexão sintética dia 1", { exact: true })).toBeVisible();
  expect(api.calls.find((call) => call.path === "/api/evolution")).toBeTruthy();
  await noHorizontalOverflow(page);
});

test("mentor: sem histórico envia contexto transitório e nunca opta pelo compartilhamento", async ({ page }) => {
  const state = sampleState(); state.consents.ai = true;
  const api = await mockAccount(page, state);
  api.reply.conversationId = null;
  await page.goto("/app/mentor");
  await expect(page.getByText(/histórico da conta está desligado/)).toBeVisible();
  await page.getByLabel("Sua mensagem").fill("Primeira mensagem sintética.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(api.reply.reply, { exact: true })).toBeVisible();
  await page.getByLabel("Sua mensagem").fill("Segunda mensagem sintética.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText("Segunda mensagem sintética.", { exact: true })).toBeVisible();
  const calls = api.calls.filter((call) => call.path === "/api/mentor" && call.method === "POST");
  expect(calls[0].body).toEqual({ message: "Primeira mensagem sintética.", mode: "reflection" });
  expect(calls[1].body).toEqual({ message: "Segunda mensagem sintética.", mode: "reflection", history: [{ role: "user", content: "Primeira mensagem sintética." }, { role: "assistant", content: api.reply.reply }] });
  expect(api.calls.some((call) => call.path === "/api/settings")).toBe(false);
});

for (const [path, action, submit] of [["/entrar", "login", "Entrar"], ["/cadastro", "signup", "Criar conta"], ["/recuperar", "forgot", "Enviar instruções"]] as const) {
  test(`acesso: ${action} envia campos e apresenta erro do servidor`, async ({ page }) => {
    const api = await mockAccount(page);
    api.failures["/api/state"] = { status: 401, error: "Entre na sua conta." };
    api.failures["/api/auth"] = { status: 429, error: "Aguarde antes de tentar novamente." };
    await page.goto(path);
    await page.getByLabel("E-mail", { exact: true }).fill("qa-synthetic@example.test");
    if (action !== "forgot") {
      await page.getByLabel("Senha", { exact: true }).fill("synthetic-password-only");
      await page.getByRole("button", { name: "Mostrar senha" }).click();
      await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Ocultar senha" }).click();
    }
    await page.getByRole("button", { name: submit, exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Aguarde antes de tentar novamente.");
    expect(api.calls.find((call) => call.path === "/api/auth")?.body).toEqual({ action, email: "qa-synthetic@example.test", ...(action !== "forgot" ? { password: "synthetic-password-only" } : {}) });
    await expect(page.getByRole("button", { name: submit, exact: true })).toBeEnabled();
  });
}

test("acesso: login bem-sucedido abre conta mockada e mantém navegação da aplicação", async ({ page }) => {
  const api = await mockAccount(page);
  api.failures["/api/state"] = { status: 401, error: "Entre na sua conta." };
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("qa-synthetic@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("synthetic-password-only");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pessoa de teste");
  await page.getByRole("link", { name: "Registrar este dia" }).click();
  await expect(page).toHaveURL(/\/app\/jornada$/);
  expect(api.calls.find((call) => call.path === "/api/auth")?.body).toEqual({ action: "login", email: "qa-synthetic@example.test", password: "synthetic-password-only" });
});

test("configurações: falha de exclusão não informa sucesso nem navega", async ({ page }) => {
  const api = await mockAccount(page);
  api.failures["/api/account"] = { status: 400, error: "Não foi possível confirmar a senha." };
  await page.goto("/app/configuracoes");
  await page.getByRole("button", { name: "Quero excluir" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar exclusão" });
  await dialog.getByLabel("Digite EXCLUIR").fill("EXCLUIR");
  await dialog.getByLabel("Senha", { exact: true }).fill("synthetic-wrong-password");
  await dialog.getByRole("button", { name: "Excluir conta", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Não foi possível confirmar a senha.");
  await expect(page).toHaveURL(/\/app\/configuracoes$/);
  await expect(dialog).toBeVisible();
});

test("jornada: controles ocupados impedem mutação duplicada", async ({ page }) => {
  await mockAccount(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/journey", async (route) => { await pending; await route.fallback(); });
  await page.goto("/app/jornada");
  const request = page.waitForRequest("**/api/journey");
  await page.getByRole("button", { name: "Usar alternativa simplificada" }).click();
  await request;
  try {
    const busy = page.locator('button[aria-busy="true"]');
    await expect(busy.first()).toBeVisible();
    for (const button of await busy.all()) await expect(button).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole("button", { name: "Alternativa já em uso" })).toBeDisabled();
});

test("layout: nome e objetivo longos válidos não criam rolagem horizontal", async ({ page }) => {
  const state = sampleState();
  state.profile.displayName = "N".repeat(80);
  state.journey!.goal = "G".repeat(600);
  await mockAccount(page, state);
  await page.goto("/app");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText(state.profile.displayName);
  await noHorizontalOverflow(page);
  const clipped = await heading.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()].filter((rect) => rect.right > innerWidth + 1 || rect.left < -1).map((rect) => ({ left: rect.left, right: rect.right, viewport: innerWidth }));
  });
  expect(clipped, "Heading text must remain readable within viewport even when horizontal scrolling is clipped").toEqual([]);
});

test("evidência visual: lote solicitado pelo coordenador", async ({ page }, testInfo) => {
  test.skip(process.env.VIRTUDE_CAPTURE_REVIEW !== "1", "Capture opt-in, run once after UI fixes");
  await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  const dir = resolve(".impeccable/review");
  await mkdir(dir, { recursive: true });
  const requests: string[] = [];
  await page.route("**/api/**", (route) => { requests.push(route.request().url()); return route.fulfill({ status: 500, json: { error: "Demo must stay local" } }); });
  const captureHeadings = {
    landing: /Aprender a vivê-la/,
    hoje: /o gesto de hoje/,
    jornada: focusLabels.self_control,
    evolucao: "O que foi registrado",
    configuracoes: "Sua conta e seus consentimentos",
    mentor: "Uma conversa, com limite.",
  };
  async function capture(name: keyof typeof captureHeadings) {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(captureHeadings[name]);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      scrollTo(0, 0);
      await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    });
    await page.screenshot({ path: resolve(dir, `${name}-${testInfo.project.name}.png`), fullPage: false, scale: "css" });
  }
  async function open(name: "Jornada" | "Evolução" | "Ajustes" | "Mentor") {
    const headings = { Jornada: captureHeadings.jornada, Evolução: captureHeadings.evolucao, Ajustes: captureHeadings.configuracoes, Mentor: captureHeadings.mentor };
    await page.getByRole("link", { name, exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(headings[name]);
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprender a vivê-la");
  await capture("landing");
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("o gesto de hoje");
  await capture("hoje");
  await open("Jornada");
  await page.getByRole("radio", { name: "Tentei", exact: true }).check();
  await page.getByLabel(getMission("self_control", 1)!.reflectionQuestion).fill("Ouvi com calma antes de responder. Este registro é uma amostra sintética.");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("button", { name: "Atualizar registro" })).toBeVisible();
  await capture("jornada");
  await open("Evolução");
  await capture("evolucao");
  await open("Ajustes");
  await page.getByRole("checkbox", { name: "Permitir que o Mentor use inteligência artificial." }).check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferências salvas" })).toBeVisible();
  await capture("configuracoes");
  await open("Mentor");
  await page.getByRole("radio", { name: "Ensaio, simulação" }).check();
  await page.getByLabel("Sua mensagem").fill("Quero ensaiar uma conversa com calma e respeito.");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/Simulação da demonstração:/)).toBeVisible();
  await capture("mentor");
  expect(requests).toEqual([]);
});

test("consentimentos: desligar IA preserva leitura do histórico autorizado sem envio", async ({ page }) => {
  const state = sampleState();
  state.consents = { sensitiveData: true, ai: true, history: true, journeyContext: false };
  state.conversations = [{ id: conversationId, title: "Histórico sintético autorizado", createdAt: "2026-10-27T12:00:00Z" }];
  const api = await mockAccount(page, state);
  await page.goto("/app/configuracoes");
  await page.getByRole("checkbox", { name: "Permitir que o Mentor use inteligência artificial." }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Guardar o histórico das conversas." })).toBeChecked();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /salv/i })).toBeVisible();
  expect(api.calls.find((call) => call.path === "/api/settings")?.body).toMatchObject({ consents: { ai: false, history: true, journeyContext: false } });
  await page.getByRole("link", { name: "Mentor", exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Histórico sintético autorizado" }).click();
  await expect(page.getByText("Resposta sintética salva", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Sua mensagem" })).toHaveCount(0);
  expect(api.calls.filter((call) => call.path === "/api/mentor" && call.method === "POST")).toHaveLength(0);
  expect(api.calls.find((call) => call.path === "/api/mentor" && call.method === "GET")?.search).toBe(`?conversationId=${conversationId}`);
});

test("objetivo: editar dificuldade e meta não reinicia o dia nem envia ação de jornada", async ({ page }) => {
  const state = sampleState();
  state.journey!.currentDay = 3;
  state.journey!.difficulty = "Interrompo quando discordo durante uma conversa.";
  state.today = { ...getMission("self_control", 3)!, assignmentId: "synthetic-assignment-day-3", variant: "standard", ...fallbackPersonalization({ goal: state.journey!.goal, difficulty: state.journey!.difficulty }) };
  state.checkins = [{ id: "synthetic-previous-checkin", assignmentId: "synthetic-assignment-day-1", day: 1, status: "attempted", reflection: "Registro sintético anterior preservado.", learned: null, createdAt: "2026-10-27T12:00:00Z" }];
  const api = await mockAccount(page, state);
  await page.goto("/app/configuracoes");
  const difficulty = page.getByLabel("Qual sua principal dificuldade nessa área?", { exact: true });
  await expect(difficulty).toHaveValue(state.journey!.difficulty);
  await expect(difficulty).toHaveAttribute("maxlength", "600");
  await page.getByLabel("Objetivo", { exact: true }).fill("  Quero ouvir uma frase inteira antes de responder.  ");
  await difficulty.fill("  Respondo por impulso quando recebo uma crítica.  ");
  await page.getByRole("button", { name: "Salvar objetivo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Objetivo atualizado" })).toBeVisible();
  const calls = api.calls.filter((call) => call.path === "/api/goal");
  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe("PATCH");
  expect(calls[0].body).toEqual({ goal: "Quero ouvir uma frase inteira antes de responder.", difficulty: "Respondo por impulso quando recebo uma crítica." });
  await expect(difficulty).toHaveValue("Respondo por impulso quando recebo uma crítica.");
  expect(api.state.journey!.currentDay).toBe(3);
  expect(api.state.today!.assignmentId).toBe(state.today.assignmentId);
  expect(api.state.checkins).toEqual(state.checkins);
  expect(api.calls.filter((call) => call.path === "/api/journey")).toHaveLength(0);
  await page.getByRole("link", { name: "Hoje", exact: true }).filter({ visible: true }).click();
  await expect(page.getByText("Quero ouvir uma frase inteira antes de responder.", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByText(/^Dia 3 ·/)).toBeVisible();
  await expect(page.getByRole("heading", { name: getMission("self_control", 3)!.title })).toBeVisible();
  expect(api.unexpected).toEqual([]);
});
