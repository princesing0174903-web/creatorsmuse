import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Creator's Muse" },
      { name: "description", content: "How Creator's Muse collects, uses, and protects your data." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="May 2026">
      <Section title="What we collect">
        Account data (email, display name), content you submit to AI generation (prompts, topics, optional file names), usage metrics (credits consumed per month), and basic technical logs needed to operate the Service.
      </Section>
      <Section title="How we use it">
        To authenticate you, deliver AI output, enforce plan quotas, prevent abuse, and improve product quality. We do not sell your data.
      </Section>
      <Section title="AI providers">
        Prompts you submit are forwarded to third-party model providers (e.g. Google Gemini, OpenAI) to generate responses. Providers process the request under their own privacy terms and do not receive your account identity.
      </Section>
      <Section title="Storage & retention">
        Account and usage data are stored in our managed backend with row-level security. You can request deletion at any time by contacting us.
      </Section>
      <Section title="Cookies">
        We use only the cookies and local storage required to keep you signed in and remember UI preferences. No third-party advertising trackers.
      </Section>
      <Section title="Your rights">
        You may access, correct, export, or delete your personal data. Contact us via the <a href="/contact" className="text-primary hover:underline">contact page</a>.
      </Section>
      <Section title="Changes">
        We will post material changes to this policy on this page and update the "last updated" date.
      </Section>
    </LegalPageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
