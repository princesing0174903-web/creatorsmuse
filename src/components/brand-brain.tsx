import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain, Plus, Star, Trash2, History, RotateCcw, FileText, Upload, Loader2, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listBrands, createBrand, updateBrand, deleteBrand, setDefaultBrand,
  listBrandVersions, restoreBrandVersion,
  listKnowledgeDocs, addKnowledgeDoc, deleteKnowledgeDoc,
  getBrandIntelligence,
} from "@/lib/brand.functions";

type Brand = Awaited<ReturnType<typeof listBrands>>[number];

const TEXT_FIELDS = [
  ["mission", "Mission", "Why this brand exists."],
  ["vision", "Vision", "Where it's going."],
  ["target_audience", "Audience", "Who you're speaking to."],
  ["tone", "Tone", "e.g. blunt, warm, high-energy."],
  ["writing_style", "Writing style", "Sentence rhythm, POV, formatting."],
  ["cta_style", "CTA style", "How you ask for the click."],
  ["formatting_preferences", "Formatting", "Line breaks, caps, punctuation rules."],
  ["reading_level", "Reading level", "e.g. grade 6, expert."],
] as const;

const LIST_FIELDS = [
  ["content_pillars", "Content pillars"],
  ["keywords", "Priority keywords"],
  ["vocabulary", "Signature vocabulary"],
  ["approved_phrases", "Approved phrases"],
  ["banned_words", "Banned words"],
  ["hashtags", "Hashtags"],
  ["competitors", "Competitors"],
] as const;

export function BrandBrainPanel() {
  const qc = useQueryClient();
  const brandsFn = useServerFn(listBrands);
  const createFn = useServerFn(createBrand);
  const updateFn = useServerFn(updateBrand);
  const deleteFn = useServerFn(deleteBrand);
  const defaultFn = useServerFn(setDefaultBrand);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsFn({ data: undefined as never }),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo<Brand | undefined>(
    () => brands.find((b) => b.id === activeId) ?? brands[0],
    [brands, activeId],
  );

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const value = (k: string) =>
    (draft[k] ?? (active as unknown as Record<string, unknown>)?.[k] ?? "") as string;
  const listValue = (k: string) => {
    const v = draft[k] ?? (active as unknown as Record<string, unknown>)?.[k] ?? [];
    return Array.isArray(v) ? v.join(", ") : String(v);
  };
  const dirty = Object.keys(draft).length > 0;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["brands"] });
    void qc.invalidateQueries({ queryKey: ["brand-versions"] });
    void qc.invalidateQueries({ queryKey: ["brand-intel"] });
  };

  const create = useMutation({
    mutationFn: (name: string) => createFn({ data: { name } }),
    onSuccess: (row) => {
      setActiveId((row as Brand).id);
      setDraft({});
      invalidate();
      toast.success("Brand created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => updateFn({ data: { id: active!.id, ...draft } as never }),
    onSuccess: () => {
      setDraft({});
      invalidate();
      toast.success("Brand memory updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      setActiveId(null);
      setDraft({});
      invalidate();
      toast.success("Brand deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) => defaultFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Default brand set");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl border border-border bg-card/30" />;
  }

  return (
    <div className="space-y-5">
      {/* Brand switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setActiveId(b.id);
              setDraft({});
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              active?.id === b.id
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-card/30 text-muted-foreground hover:text-foreground",
            )}
          >
            {b.is_default && <Star className="size-3 fill-primary text-primary" />}
            {b.name}
            <span className="font-mono text-[9px] text-muted-foreground">v{b.memory_version}</span>
          </button>
        ))}
        <button
          onClick={() => {
            const name = window.prompt("Brand name");
            if (name?.trim()) create.mutate(name.trim());
          }}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="size-3" /> New brand
        </button>
      </div>

      {!active ? (
        <p className="rounded-xl border border-dashed border-border bg-card/20 p-6 text-center text-xs text-muted-foreground">
          Create a brand so every generation inherits your mission, tone, and rules automatically.
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <LabeledInput
              label="Brand name"
              value={value("name") || active.name}
              onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            />
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Emoji policy
              </p>
              <div className="mt-1.5 flex gap-1.5">
                {(["none", "sparing", "expressive"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDraft((d) => ({ ...d, emoji_rules: opt }))}
                    className={cn(
                      "rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                      (value("emoji_rules") || active.emoji_rules) === opt
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {TEXT_FIELDS.map(([key, label, hint]) => (
              <LabeledInput
                key={key}
                label={label}
                hint={hint}
                textarea={key === "mission" || key === "vision" || key === "target_audience"}
                value={value(key)}
                onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {LIST_FIELDS.map(([key, label]) => (
              <LabeledInput
                key={key}
                label={label}
                hint="Comma separated"
                value={listValue(key)}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    [key]: v.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
            >
              {save.isPending ? "Saving…" : dirty ? "Save memory" : "Saved"}
            </button>
            {!active.is_default && (
              <button
                onClick={() => makeDefault.mutate(active.id)}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Make default
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm(`Delete "${active.name}"? Its knowledge and history go too.`))
                  remove.mutate(active.id);
              }}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="size-3" /> Delete
            </button>
          </div>

          <KnowledgeBase brandId={active.id} />
          <VersionHistory brandId={active.id} onRestored={invalidate} />
          <IntelligenceStats brandId={active.id} />
        </>
      )}
    </div>
  );
}

function LabeledInput({
  label, hint, value, onChange, textarea,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block rounded-lg border border-border bg-background/40 px-3 py-2 focus-within:border-primary/40">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {textarea ? (
        <textarea
          rows={2}
          value={value}
          placeholder={hint}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
      ) : (
        <input
          value={value}
          placeholder={hint}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
      )}
    </label>
  );
}

function KnowledgeBase({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listKnowledgeDocs);
  const addFn = useServerFn(addKnowledgeDoc);
  const delFn = useServerFn(deleteKnowledgeDoc);
  const [busy, setBusy] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["brand-docs", brandId],
    queryFn: () => listFn({ data: { brandId } }),
  });

  const ingest = async (title: string, content: string, sourceType: "text" | "guide") => {
    setBusy(true);
    try {
      const r = await addFn({ data: { brandId, title, content, sourceType } });
      toast.success(`Indexed "${title}" · ${r.chunks} chunks`);
      void qc.invalidateQueries({ queryKey: ["brand-docs", brandId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ingestion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <FileText className="size-3 text-primary" /> Knowledge base
        </p>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
            <Upload className="size-3" /> Upload
            <input
              type="file"
              accept=".txt,.md,.csv,.json,text/*"
              className="hidden"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const text = await f.text();
                if (!text.trim()) return toast.error("File is empty");
                await ingest(f.name, text, "guide");
              }}
            />
          </label>
          <button
            disabled={busy}
            onClick={async () => {
              const title = window.prompt("Title for this knowledge");
              if (!title?.trim()) return;
              const content = window.prompt("Paste the content");
              if (!content?.trim()) return;
              await ingest(title.trim(), content.trim(), "text");
            }}
            className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Paste text
          </button>
        </div>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Embedding and indexing…
        </p>
      )}

      {docs.length === 0 && !busy ? (
        <p className="text-xs text-muted-foreground">
          Add brand guidelines, style guides, or product docs — the AI reads them before every generation.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-md border border-border bg-card/30 px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-xs">{d.title}</span>
              <span
                className={cn(
                  "font-mono text-[9px] uppercase tracking-widest",
                  d.status === "ready" ? "text-primary" : "text-muted-foreground",
                )}
              >
                {d.status} · {d.chunk_count}
              </span>
              <button
                onClick={async () => {
                  await delFn({ data: { id: d.id } });
                  void qc.invalidateQueries({ queryKey: ["brand-docs", brandId] });
                }}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VersionHistory({ brandId, onRestored }: { brandId: string; onRestored: () => void }) {
  const listFn = useServerFn(listBrandVersions);
  const restoreFn = useServerFn(restoreBrandVersion);
  const { data: versions = [] } = useQuery({
    queryKey: ["brand-versions", brandId],
    queryFn: () => listFn({ data: { brandId } }),
  });

  if (!versions.length) return null;

  return (
    <div className="rounded-xl border border-border bg-background/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <History className="size-3 text-primary" /> Memory history
      </p>
      <ul className="space-y-1.5">
        {versions.slice(0, 8).map((v) => (
          <li
            key={v.id}
            className="flex items-center gap-2 rounded-md border border-border bg-card/30 px-2.5 py-1.5"
          >
            <span className="font-mono text-[10px] text-primary">v{v.version}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
              {v.changed_fields.slice(0, 4).join(", ") || v.change_source}
            </span>
            <button
              onClick={async () => {
                await restoreFn({ data: { versionId: v.id } });
                toast.success(`Restored v${v.version}`);
                onRestored();
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IntelligenceStats({ brandId }: { brandId: string }) {
  const intelFn = useServerFn(getBrandIntelligence);
  const { data } = useQuery({
    queryKey: ["brand-intel", brandId],
    queryFn: () => intelFn({ data: { brandId } }),
  });
  if (!data) return null;

  const axes = [
    ["Brand consistency", data.quality.brand_consistency],
    ["Tone match", data.quality.tone_match],
    ["Grammar", data.quality.grammar],
    ["Readability", data.quality.readability],
    ["CTA quality", data.quality.cta_quality],
    ["Platform fit", data.quality.platform_optimization],
  ] as const;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/30 to-card/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Activity className="size-3 text-primary" /> Learning signal
        </p>
        <span className="font-mono text-[10px] text-muted-foreground">
          {data.totalSignals} signals · {data.knowledgeDocs} docs · {data.quality.samples} graded
        </span>
      </div>

      {data.quality.samples === 0 ? (
        <p className="text-xs text-muted-foreground">
          Generate content with this brand active — quality grading appears here after the first run.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-bold tracking-tight">
            {data.quality.overall}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/ 100 overall</span>
          </p>
          {axes.map(([label, v]) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{label}</span>
                <span className="font-mono">{v}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
