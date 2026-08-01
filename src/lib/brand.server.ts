/**
 * Brand Intelligence Engine — server-only.
 *
 * Responsibilities:
 *  1. Load + cache a user's active Brand Brain (profile + learned insights).
 *  2. Retrieve relevant knowledge-base chunks via embeddings (RAG).
 *  3. Orchestrate the final system prompt (request + brand + context + rules).
 *  4. Score generation quality and feed the learning loop.
 *
 * Never import this from client code.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const EMBED_MODEL = "google/gemini-embedding-2";
const QUALITY_MODEL = "openai/gpt-5.6-sol";

export type BrandProfile = {
  id: string;
  name: string;
  mission: string | null;
  vision: string | null;
  target_audience: string | null;
  tone: string | null;
  writing_style: string | null;
  cta_style: string | null;
  emoji_rules: string;
  formatting_preferences: string | null;
  reading_level: string | null;
  vocabulary: string[];
  hashtags: string[];
  competitors: string[];
  content_pillars: string[];
  keywords: string[];
  banned_words: string[];
  approved_phrases: string[];
  platform_rules: Record<string, unknown>;
  learned_insights: Record<string, unknown>;
  memory_version: number;
};

// ---------------------------------------------------------------- cache ----
type CacheEntry = { value: BrandProfile | null; expires: number };
const brandCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

export function invalidateBrandCache(userId: string) {
  for (const key of brandCache.keys()) {
    if (key.startsWith(`${userId}:`)) brandCache.delete(key);
  }
}

/** Resolve the brand for a request: explicit → project-linked → default → none. */
export async function resolveBrand(args: {
  userId: string;
  brandId?: string | null;
  projectId?: string | null;
}): Promise<BrandProfile | null> {
  const cacheKey = `${args.userId}:${args.brandId ?? ""}:${args.projectId ?? ""}`;
  const hit = brandCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value;

  let brandId = args.brandId ?? null;

  if (!brandId && args.projectId) {
    const { data: proj } = await supabaseAdmin
      .from("projects")
      .select("brand_id")
      .eq("id", args.projectId)
      .eq("user_id", args.userId)
      .maybeSingle();
    brandId = (proj as { brand_id?: string | null } | null)?.brand_id ?? null;
  }

  let query = supabaseAdmin
    .from("brand_profiles")
    .select("*")
    .eq("user_id", args.userId)
    .limit(1);
  query = brandId ? query.eq("id", brandId) : query.eq("is_default", true);

  const { data } = await query.maybeSingle();
  const value = (data as BrandProfile | null) ?? null;
  brandCache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

// ------------------------------------------------------------ embeddings ----
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += 100) {
    const batch = inputs.slice(i, i + 100);
    const res = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Embedding failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    for (const d of sorted) out.push(d.embedding);
  }
  return out;
}

/** Split long text into overlapping ~1200-char chunks on paragraph boundaries. */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const brk = clean.lastIndexOf("\n\n", end);
      if (brk > start + size * 0.5) end = brk;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

async function retrieveKnowledge(args: {
  userId: string;
  brandId: string | null;
  query: string;
  limit?: number;
}): Promise<string[]> {
  try {
    const [vec] = await embedTexts([args.query.slice(0, 4000)]);
    if (!vec) return [];
    const { data, error } = await supabaseAdmin.rpc("match_brand_knowledge", {
      p_user_id: args.userId,
      p_brand_id: args.brandId as unknown as string,
      query_embedding: vec as unknown as string,
      match_count: args.limit ?? 6,
    });
    if (error) return [];
    return ((data ?? []) as Array<{ content: string }>).map((r) => r.content);
  } catch (e) {
    console.error("Knowledge retrieval failed (non-fatal):", e);
    return [];
  }
}

// -------------------------------------------------------- learning engine ----
export type LearningDigest = {
  winners: string[];
  losers: string[];
  editPatterns: string[];
};

/** Derive actionable guidance from recent behavioural signals. Deterministic — no AI call. */
export async function buildLearningDigest(args: {
  userId: string;
  brandId: string | null;
}): Promise<LearningDigest> {
  let q = supabaseAdmin
    .from("brand_learning_signals")
    .select("signal, weight, original_text, final_text, asset_type")
    .eq("user_id", args.userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (args.brandId) q = q.eq("brand_id", args.brandId);
  const { data } = await q;
  const rows = (data ?? []) as Array<{
    signal: string;
    original_text: string | null;
    final_text: string | null;
    asset_type: string | null;
  }>;

  const winners: string[] = [];
  const losers: string[] = [];
  const editPatterns: string[] = [];

  for (const r of rows) {
    const positive = ["favorite", "pin", "save", "export", "publish", "approve"].includes(r.signal);
    const negative = ["delete", "trash", "reject", "archive"].includes(r.signal);
    const text = (r.final_text ?? r.original_text ?? "").trim();
    if (!text) continue;
    if (positive && winners.length < 8) winners.push(text.slice(0, 220));
    else if (negative && losers.length < 6) losers.push(text.slice(0, 160));
    if (r.signal === "edit" && r.original_text && r.final_text && editPatterns.length < 6) {
      editPatterns.push(
        `was: "${r.original_text.slice(0, 120)}" -> became: "${r.final_text.slice(0, 120)}"`,
      );
    }
  }
  return { winners, losers, editPatterns };
}

// ------------------------------------------------------ prompt orchestrator ----
export type OrchestratedPrompt = {
  systemPrompt: string;
  brandId: string | null;
  usedKnowledge: number;
  usedSignals: number;
};

/**
 * Layer the final system prompt:
 *   base craft rules → brand identity → learned behaviour → knowledge base → hard constraints
 */
export async function orchestratePrompt(args: {
  userId: string;
  basePrompt: string;
  topic: string;
  brandId?: string | null;
  projectId?: string | null;
  platform?: string | null;
}): Promise<OrchestratedPrompt> {
  const brand = await resolveBrand({
    userId: args.userId,
    brandId: args.brandId ?? null,
    projectId: args.projectId ?? null,
  });

  if (!brand) {
    return { systemPrompt: args.basePrompt, brandId: null, usedKnowledge: 0, usedSignals: 0 };
  }

  const [digest, knowledge] = await Promise.all([
    buildLearningDigest({ userId: args.userId, brandId: brand.id }),
    retrieveKnowledge({ userId: args.userId, brandId: brand.id, query: args.topic }),
  ]);

  const L = (label: string, value?: string | null) =>
    value && value.trim() ? `- ${label}: ${value.trim()}` : null;
  const A = (label: string, arr?: string[]) =>
    arr && arr.length ? `- ${label}: ${arr.slice(0, 25).join(", ")}` : null;

  const identity = [
    L("Brand", brand.name),
    L("Mission", brand.mission),
    L("Vision", brand.vision),
    L("Audience", brand.target_audience),
    L("Tone", brand.tone),
    L("Writing style", brand.writing_style),
    L("CTA style", brand.cta_style),
    L("Emoji policy", brand.emoji_rules),
    L("Formatting", brand.formatting_preferences),
    L("Reading level", brand.reading_level),
    A("Signature vocabulary", brand.vocabulary),
    A("Content pillars", brand.content_pillars),
    A("Priority keywords", brand.keywords),
    A("Approved phrases", brand.approved_phrases),
    A("Hashtags", brand.hashtags),
    A("Competitors to differentiate from", brand.competitors),
  ].filter(Boolean) as string[];

  const platformRule =
    args.platform && (brand.platform_rules as Record<string, string>)?.[args.platform];

  const sections: string[] = [args.basePrompt];

  if (identity.length) {
    sections.push(`## BRAND BRAIN (v${brand.memory_version}) — obey this identity in every line\n${identity.join("\n")}`);
  }
  if (platformRule) sections.push(`## PLATFORM RULE (${args.platform})\n${platformRule}`);

  if (digest.winners.length || digest.losers.length || digest.editPatterns.length) {
    const learn: string[] = ["## LEARNED FROM THIS CREATOR'S BEHAVIOUR"];
    if (digest.winners.length)
      learn.push(`These were kept, favorited or published — match their rhythm and specificity:\n${digest.winners.map((w) => `  • ${w}`).join("\n")}`);
    if (digest.losers.length)
      learn.push(`These were deleted or rejected — avoid this style:\n${digest.losers.map((w) => `  • ${w}`).join("\n")}`);
    if (digest.editPatterns.length)
      learn.push(`The creator rewrote outputs like this — pre-apply those edits:\n${digest.editPatterns.map((w) => `  • ${w}`).join("\n")}`);
    sections.push(learn.join("\n"));
  }

  if (knowledge.length) {
    sections.push(
      `## BRAND KNOWLEDGE BASE (verbatim source material — prefer these facts over assumptions)\n${knowledge
        .map((k, i) => `[${i + 1}] ${k.slice(0, 1200)}`)
        .join("\n\n")}`,
    );
  }

  const hard: string[] = [];
  if (brand.banned_words.length)
    hard.push(`NEVER use these words or phrases: ${brand.banned_words.join(", ")}.`);
  if (brand.emoji_rules === "none") hard.push("Use ZERO emoji.");
  hard.push("Never contradict the brand mission, tone, or audience defined above.");
  sections.push(`## HARD CONSTRAINTS\n${hard.map((h) => `- ${h}`).join("\n")}`);

  return {
    systemPrompt: sections.join("\n\n"),
    brandId: brand.id,
    usedKnowledge: knowledge.length,
    usedSignals: digest.winners.length + digest.losers.length + digest.editPatterns.length,
  };
}

// ------------------------------------------------------------ quality loop ----
export type QualityScores = {
  brand_consistency: number;
  tone_match: number;
  grammar: number;
  readability: number;
  cta_quality: number;
  platform_optimization: number;
  overall: number;
  notes: string;
};

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/** Grade a batch of generated text against the brand. Non-fatal on failure. */
export async function evaluateQuality(args: {
  userId: string;
  generationId: string;
  brandId: string | null;
  samples: string[];
}): Promise<QualityScores | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || args.samples.length === 0) return null;

  const brand = args.brandId
    ? await resolveBrand({ userId: args.userId, brandId: args.brandId })
    : null;

  const brandBrief = brand
    ? `Brand: ${brand.name}\nTone: ${brand.tone ?? "n/a"}\nAudience: ${brand.target_audience ?? "n/a"}\nBanned: ${brand.banned_words.join(", ") || "none"}`
    : "No brand profile configured — grade on general craft quality.";

  try {
    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: QUALITY_MODEL,
        reasoning_effort: "none",
        messages: [
          {
            role: "system",
            content:
              "You are a ruthless brand editor. Grade the supplied content 0-100 on six axes. Be discriminating — do not cluster scores. Return only the tool call.",
          },
          {
            role: "user",
            content: `${brandBrief}\n\nCONTENT:\n${args.samples.slice(0, 12).map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_quality",
              parameters: {
                type: "object",
                properties: {
                  brand_consistency: { type: "integer", minimum: 0, maximum: 100 },
                  tone_match: { type: "integer", minimum: 0, maximum: 100 },
                  grammar: { type: "integer", minimum: 0, maximum: 100 },
                  readability: { type: "integer", minimum: 0, maximum: 100 },
                  cta_quality: { type: "integer", minimum: 0, maximum: 100 },
                  platform_optimization: { type: "integer", minimum: 0, maximum: 100 },
                  notes: { type: "string" },
                },
                required: [
                  "brand_consistency", "tone_match", "grammar", "readability",
                  "cta_quality", "platform_optimization", "notes",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_quality" } },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const scores: QualityScores = {
      brand_consistency: clamp(p.brand_consistency),
      tone_match: clamp(p.tone_match),
      grammar: clamp(p.grammar),
      readability: clamp(p.readability),
      cta_quality: clamp(p.cta_quality),
      platform_optimization: clamp(p.platform_optimization),
      overall: 0,
      notes: String(p.notes ?? "").slice(0, 1000),
    };
    scores.overall = Math.round(
      (scores.brand_consistency + scores.tone_match + scores.grammar +
        scores.readability + scores.cta_quality + scores.platform_optimization) / 6,
    );

    await supabaseAdmin.from("generation_quality").upsert(
      {
        generation_id: args.generationId,
        user_id: args.userId,
        brand_id: args.brandId,
        ...scores,
        detail: { model: QUALITY_MODEL, sampled: args.samples.length } as Json,
      },
      { onConflict: "generation_id" },
    );
    return scores;
  } catch (e) {
    console.error("Quality evaluation failed (non-fatal):", e);
    return null;
  }
}
