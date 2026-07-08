import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-background/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <BrandLogo variant="mark" imgClassName="size-7" showWordmark />
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
            The AI operating system built for creators who ship faster than the algorithm changes.
          </p>
        </div>

        <FooterCol title="Product">
          <FooterLink to="/dashboard">Workbench</FooterLink>
          <FooterLink to="/reels">Reel Generator</FooterLink>
          <FooterLink to="/workflow">Workflow OS</FooterLink>
          <FooterLink to="/pricing">Pricing</FooterLink>
        </FooterCol>

        <FooterCol title="Company">
          <FooterLink to="/contact">Contact</FooterLink>
          <FooterLink to="/terms">Terms</FooterLink>
          <FooterLink to="/privacy">Privacy</FooterLink>
        </FooterCol>

        <FooterCol title="Get started">
          <FooterLink to="/login">Sign in</FooterLink>
          <FooterLink to="/login">Create account</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Creator's Muse. All rights reserved.</p>
          <p className="font-mono uppercase tracking-[0.2em]">v3.1 · AI engine online</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo variant="mark" imgClassName="size-8" showWordmark />
        </Link>
        <Link
          to="/login"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          Launch app
        </Link>
      </header>
      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Last updated · {updated}
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
