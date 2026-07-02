import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { consumeCredit } from "./usage.server";

const InputSchema = z.object({
  topic: z.string().trim().min(1).max(2000),
  fileName: z.string().trim().max(300).optional(),
  projectId: z.string().uuid().nullish(),
  parentId: z.string().uuid().nullish(),
});

const ScoredItem = z.object({
  text: z.string().min(1),
  virality: z.number().min(0).max(100),
  engagement: z.number().min(0).max(100),
  emotion: z.number().min(0).max(100),
  hookStrength: z.number().min(0).max(100),
  trendAlignment: z.number().min(0).max(100),
  audienceRetention: z.number().min(0).max(100),
});

const OutputSchema = z.object({
  hooks: z.array(ScoredItem).length(5),
  captions: z.array(ScoredItem).length(5),
  posts: z.array(ScoredItem).length(5),
  shorts: z.array(ScoredItem).length(5),
});

export type ScoredAsset = z.infer<typeof ScoredItem>;
export type GeneratedAssets = z.infer<typeof OutputSchema>;
export type GenerateResult = {
  generationId: string;
  assets: GeneratedAssets;
};

const SYSTEM_PROMPT = `You are a senior short-form content strategist for top creators (YouTube Shorts, TikTok, Reels, X/Twitter).
Given a topic + optional video filename context, produce platform-ready, niche-specific assets.

Hard rules:
- Output EXACTLY 5 items per category.
- Each item must be distinct in angle, structure, and opening word. No template repetition.
- Speak in the creator's voice: punchy, specific, opinionated. No corporate fluff, no emoji spam (max 1 per item, optional).
- Use concrete nouns/numbers/names tied to the topic's niche. Avoid generic phrases like "in 2026", "everything you know is wrong", "the brutal truth".
- Hooks: 1 sentence, designed for the first 1.5s. Mix curiosity gap, contrarian, stat, story open, question.
- Captions: 1–2 sentences ready to paste under a Reel/Short. Hook + payoff or CTA.
- Posts: 1 standalone tweet OR a thread starter (mark threads with "🧵" prefix). Mix formats.
- Shorts: a one-line VISUAL/structural angle (b-roll, hook frame, edit style, on-screen text idea) — not just a topic restatement.

Scoring (per item, integers 0-100, be discriminating — do NOT cluster everything 80-95):
- virality: predicted ceiling reach / share-ability based on hook strength, novelty, controversy, pattern interrupt.
- engagement: predicted comments + saves + watch-through, based on specificity, debate potential, CTA strength.
- emotion: emotional intensity (curiosity, anger, awe, FOMO, joy). Calm/informational = low. Visceral = high.
- hookStrength: how hard the FIRST 5 words pull attention. Pattern interrupt, specificity, stakes. Generic openers = low.
- trendAlignment: how well the angle rides current platform/cultural trends right now (formats, sounds, debates). Evergreen but flat = low. On-the-nose timely = high.
- audienceRetention: predicted % of viewers who stay through. Strong payoff loop, escalating tension, tight pacing = high. Front-loaded with no payoff = low.
Spread scores realistically: a flat list with one 92, one 88, one 74, one 61, one 48 is more useful than five 90s.
`;

const MODEL_ID = "openai/gpt-5-mini";

const KIND_TO_ASSET_TYPE = {
  hooks: "hook",
  captions: "caption",
  posts: "post",
  shorts: "short",
} as const;

export const generateAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<GenerateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // Server-side quota enforcement — prevents client-side bypass.
    await consumeCredit(context.userId, 1);

    const userPrompt = `Topic / context:\n${data.topic}${
      data.fileName ? `\n\nUploaded video filename (for tone hints only): ${data.fileName}` : ""
    }\n\nReturn 5 hooks, 5 captions, 5 posts, 5 shorts angles. All distinct, niche-specific.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_assets",
              description: "Return the 4 categories of creator assets.",
              parameters: (() => {
                const item = {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    virality: { type: "integer", minimum: 0, maximum: 100 },
                    engagement: { type: "integer", minimum: 0, maximum: 100 },
                    emotion: { type: "integer", minimum: 0, maximum: 100 },
                    hookStrength: { type: "integer", minimum: 0, maximum: 100 },
                    trendAlignment: { type: "integer", minimum: 0, maximum: 100 },
                    audienceRetention: { type: "integer", minimum: 0, maximum: 100 },
                  },
                  required: [
                    "text", "virality", "engagement", "emotion",
                    "hookStrength", "trendAlignment", "audienceRetention",
                  ],
                  additionalProperties: false,
                };
                const arr = { type: "array", items: item, minItems: 5, maxItems: 5 };
                return {
                  type: "object",
                  properties: { hooks: arr, captions: arr, posts: arr, shorts: arr },
                  required: ["hooks", "captions", "posts", "shorts"],
                  additionalProperties: false,
                };
              })(),
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_assets" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit hit. Please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      const text = await res.text();
      console.error("AI gateway error:", res.status, text);
      throw new Error(`AI gateway error (${res.status})`);
    }

    const json = await res.json();
    const argsRaw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsRaw) throw new Error("AI returned no structured output");
    const parsed = OutputSchema.parse(JSON.parse(argsRaw));

    // --- Persistence: save the generation + expand into library assets. ---
    const { supabase, userId } = context;
    const projectId = data.projectId ?? null;

    const { data: gen, error: genErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        project_id: projectId,
        kind: "assets",
        topic: data.topic,
        input: { topic: data.topic, fileName: data.fileName ?? null } as Json,
        output: parsed as unknown as Json,
        model: MODEL_ID,
        status: "complete",
        credits_used: 1,
        parent_id: data.parentId ?? null,
      })
      .select("id")
      .single();
    if (genErr) {
      console.error("Failed to persist generation:", genErr);
      throw new Error("Generation succeeded but persistence failed");
    }

    // Expand each item into a library_asset row for searchability.
    type LibRow = {
      user_id: string;
      project_id: string | null;
      generation_id: string;
      asset_type: string;
      content: string;
      title: string | null;
      scores: Json;
      tags: string[];
      metadata: Json;
    };
    const rows: LibRow[] = [];
    for (const key of ["hooks", "captions", "posts", "shorts"] as const) {
      for (const item of parsed[key]) {
        rows.push({
          user_id: userId,
          project_id: projectId,
          generation_id: gen.id,
          asset_type: KIND_TO_ASSET_TYPE[key],
          content: item.text,
          title: null,
          scores: {
            virality: item.virality,
            engagement: item.engagement,
            emotion: item.emotion,
            hookStrength: item.hookStrength,
            trendAlignment: item.trendAlignment,
            audienceRetention: item.audienceRetention,
          } as Json,
          tags: [],
          metadata: { topic: data.topic, source: "workbench" } as Json,
        });
      }
    }
    if (rows.length) {
      const { error: libErr } = await supabase.from("library_assets").insert(rows);
      if (libErr) console.error("Library expansion failed (non-fatal):", libErr);
    }

    // Update preferences: last-selected project + recent prompt (best-effort).
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        preferences: {
          last_project_id: projectId,
          last_topic: data.topic,
          last_generated_at: new Date().toISOString(),
        },
      },
      { onConflict: "user_id" },
    );

    return { generationId: gen.id, assets: parsed };
  });