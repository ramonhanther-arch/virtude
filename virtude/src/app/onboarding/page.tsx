import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { RequireOnboarding, SessionProvider } from "@/components/session";
import { SimpleHeader } from "@/components/site";

export const metadata: Metadata = { title: "Começar" };

export default function Page() {
  return (
    <>
      <SimpleHeader />
      <SessionProvider>
        <RequireOnboarding>
          <OnboardingWizard />
        </RequireOnboarding>
      </SessionProvider>
    </>
  );
}
