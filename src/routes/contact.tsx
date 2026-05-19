import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/site-footer";
import { Mail, MessageCircle, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — Creator's Muse" },
      { name: "description", content: "Get in touch with the Creator's Muse team for support, partnerships, or feedback." },
    ],
  }),
});

function ContactPage() {
  return (
    <LegalPageShell title="Get in touch" updated="May 2026">
      <p className="!text-base text-foreground">
        We're a small team obsessed with shipping the AI tools creators actually need. We read every message.
      </p>

      <div className="not-prose grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
        <ContactCard
          icon={Mail}
          label="Email"
          value="hello@creatorsmuse.app"
          href="mailto:hello@creatorsmuse.app"
        />
        <ContactCard
          icon={LifeBuoy}
          label="Support"
          value="support@creatorsmuse.app"
          href="mailto:support@creatorsmuse.app"
        />
        <ContactCard
          icon={MessageCircle}
          label="Partnerships"
          value="partners@creatorsmuse.app"
          href="mailto:partners@creatorsmuse.app"
        />
      </div>

      <p className="pt-4 text-xs text-muted-foreground">
        Typical response time: under 24 hours on business days.
      </p>
    </LegalPageShell>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-border bg-card/40 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
    >
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="size-4" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </a>
  );
}
