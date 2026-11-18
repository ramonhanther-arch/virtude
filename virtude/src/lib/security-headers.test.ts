import { expect, it } from "vitest";
import { contentSecurityPolicy } from "./security-headers";

it("CSP de produção usa nonce, bloqueia frames/objects e não permite eval ou script inline genérico", () => {
  const policy = contentSecurityPolicy("nonce-exemplo", false);
  expect(policy).toContain("'nonce-nonce-exemplo'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy.split(";").find((part) => part.trim().startsWith("script-src"))).not.toContain("unsafe-inline");
});
