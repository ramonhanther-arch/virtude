import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, appOrigin, assertSameOrigin, databaseError, handleRoute, json, readJson } from "@/lib/server/http";
import { onboardingSchema, settingsSchema } from "@/lib/server/schemas";
import { consumeLimit } from "@/lib/server/rate-limit";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rows: vi.fn(), call: vi.fn(), catalog: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/server/db", () => ({ rows: mocks.rows, call: mocks.call }));
vi.mock("@/content/missions", () => ({ getMission: mocks.catalog }));
import { assertMissionAvailable, findMission, requireSession } from "@/lib/server/context";

beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_APP_URL","https://virtude.example"); vi.stubEnv("NODE_ENV","test"); vi.stubEnv("ALLOW_UNREVIEWED_CONTENT","false"); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (body: string, headers: Record<string,string> = {}) => new Request("https://virtude.example/api/test", { method: "POST", body, headers: { origin: "https://virtude.example", "content-type": "application/json", ...headers } });
describe("private HTTP boundary", () => {
 it("requires the configured exact origin and rejects missing origin", () => {
  expect(() => assertSameOrigin(new Request("https://virtude.example/api/test"))).toThrow(ApiError);
  expect(() => assertSameOrigin(request("{}",{origin:"https://evil.example"}))).toThrow(ApiError);
  expect(() => assertSameOrigin(request("{}",{"sec-fetch-site":"cross-site"}))).toThrow(ApiError);
  expect(() => assertSameOrigin(request("{}"))).not.toThrow();
 });
 it("fails closed without configuration or with insecure production origin", () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL",""); expect(() => appOrigin()).toThrow(ApiError);
  vi.stubEnv("NEXT_PUBLIC_APP_URL","http://virtude.example"); vi.stubEnv("NODE_ENV","production"); expect(() => appOrigin()).toThrow(ApiError);
 });
 it("validates input and rejects prototype-like extra privilege fields", async () => {
  expect(await readJson(request('{"name":"Ramon"}'),z.object({name:z.string()}).strict())).toEqual({name:"Ramon"});
  await expect(readJson(request('{"name":"Ramon","premium":true}'),z.object({name:z.string()}).strict())).rejects.toMatchObject({status:400});
  await expect(readJson(request('{bad}'),z.object({}))).rejects.toMatchObject({status:400});
  await expect(readJson(request('{}',{"content-type":"text/plain"}),z.object({}))).rejects.toMatchObject({status:415});
 });
 it("bounds actual streamed bytes even with an understated Content-Length", async () => {
  await expect(readJson(request(JSON.stringify({text:"x".repeat(32769)}),{"content-length":"2"}),z.object({text:z.string()}))).rejects.toMatchObject({status:413});
  await expect(readJson(request('{}',{"content-length":"65536"}),z.object({}))).rejects.toMatchObject({status:413});
 });
 it("returns no-store JSON and never leaks database errors", async () => {
  const success=json({ok:true}); expect(success.headers.get("cache-control")).toContain("no-store");
  const failed=await handleRoute(async()=>{throw new Error("password=secret sensitive personal story");});
  expect(failed.status).toBe(500); expect(await failed.text()).not.toMatch(/secret|personal|password/);
  const known=await handleRoute(async()=>{throw new ApiError(401,"Entre.","UNAUTHENTICATED");});
  expect(await known.json()).toEqual({error:"Entre.",code:"UNAUTHENTICATED"});
 });
 it("requires explicit independent consent and rejects unexpected plan fields", () => {
  const input={displayName:"A",focus:"self_control",difficulty:"D",goal:"G",preferredTime:"08:00",sensitiveDataConsent:true,aiConsent:false,historyConsent:true,journeyContextConsent:false};
  expect(onboardingSchema.safeParse(input).success).toBe(true);
  expect(onboardingSchema.safeParse({...input,sensitiveDataConsent:false}).success).toBe(false);
  expect(onboardingSchema.safeParse({...input,plan:"premium"}).success).toBe(false);
  expect(settingsSchema.safeParse({consents:{ai:false}}).success).toBe(true);
  expect(settingsSchema.safeParse({consents:{sensitiveData:"true"}}).success).toBe(false);
 });
});
describe("real sessions", () => {
 it("requires Auth.js before checking the database session", async()=>{
  mocks.auth.mockResolvedValue(null);
  await expect(requireSession()).rejects.toMatchObject({status:401});
  expect(mocks.rows).not.toHaveBeenCalled();
 });
 it("rejects a revoked session despite a valid user identity", async()=>{
  mocks.auth.mockResolvedValue({ user: { id: "A", email: "a@example.test" }, sessionToken: "token" });
  mocks.rows.mockResolvedValue([]);
  await expect(requireSession()).rejects.toMatchObject({status:401,code:"SESSION_REVOKED"});
 });
 it("fails closed when the real-session check is unavailable", async()=>{
  mocks.auth.mockResolvedValue({ user: { id: "A" }, sessionToken: "token" });
  mocks.rows.mockRejectedValue(new ApiError(503, "Serviço indisponível.", "DATABASE_UNAVAILABLE"));
  await expect(requireSession()).rejects.toMatchObject({status:503,code:"SESSION_CHECK_UNAVAILABLE"});
 });
 it("allows only a verified user with a live session", async()=>{
  mocks.auth.mockResolvedValue({ user: { id: "A", email: "a@example.test", createdAt: "2026-11-05T00:00:00.000Z", role: "user" }, sessionToken: "token" });
  mocks.rows.mockResolvedValue([{ expires: "2099-01-01T00:00:00.000Z" }]);
  expect((await requireSession()).user.id).toBe("A");
  expect(mocks.rows).toHaveBeenCalledWith(expect.stringContaining("sessions"), ["token", "A"]);
 });
});
describe("persistent quotas and publication gate",()=>{
 it("maps database storage quota to safe HTTP 429 without exposing the database message",async()=>{
  const result=await handleRoute(async()=>{databaseError({code:"P0429",message:"private database details"});return json({ok:true});});
  expect(result.status).toBe(429);expect(await result.json()).toEqual({error:"Limite atingido. Tente novamente mais tarde.",code:"RATE_LIMITED"});
 });
 it("sends user-bound parameters and translates exhausted quota to 429",async()=>{
  mocks.call.mockResolvedValue(false);
  await expect(consumeLimit("A","mentor_daily",5,86400)).rejects.toMatchObject({status:429});
  expect(mocks.call).toHaveBeenCalledWith("consume_rate_limit",["A","mentor_daily",5,86400]);
 });
 it("fails closed if the quota database is unavailable",async()=>{
  mocks.call.mockRejectedValue(new ApiError(503,"Serviço indisponível.","DATABASE_UNAVAILABLE"));
  await expect(consumeLimit("A","export",3,3600)).rejects.toMatchObject({status:503});
 });
 it("never permits pending catalog content in production even with the opt-in flag",async()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("ALLOW_UNREVIEWED_CONTENT","true");
  mocks.rows.mockResolvedValue([]);
  mocks.catalog.mockReturnValue({reviewStatus:"pending_review"});
  await expect(assertMissionAvailable("self_control",1)).rejects.toMatchObject({status:503,code:"CONTENT_PENDING_REVIEW"});
 });
 it("uses human-approved database copy as production source of truth",async()=>{
  vi.stubEnv("NODE_ENV","production");
  mocks.rows.mockResolvedValue([{id:"approved",title:"Revisado",phase:"P",reference:"R",context:"C",principle:"I",practice:"A",simplified:"S",deepened:"D",reflection_question:"Q"}]);
  expect(await findMission("self_control",1)).toMatchObject({id:"approved",title:"Revisado",reviewStatus:"approved",reflectionQuestion:"Q"});
  expect(mocks.catalog).not.toHaveBeenCalled();
 });
 it("requires explicit development opt-in for catalog fallback",async()=>{
  mocks.rows.mockResolvedValue([]);
  mocks.catalog.mockReturnValue({id:"dev",reviewStatus:"pending_review"});
  expect(await findMission("self_control",1)).toBeUndefined();
  vi.stubEnv("ALLOW_UNREVIEWED_CONTENT","true");
  expect(await findMission("self_control",1)).toMatchObject({id:"dev"});
 });
});
