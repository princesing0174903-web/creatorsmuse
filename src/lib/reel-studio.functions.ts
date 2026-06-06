import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeCredit } from "./usage.server";

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

const ReelCandidateSchema = z.object({
  title: z.string().min(1).max(200),
  hook: z.string().min(1).max(500),
  caption: z.string().min(1).max(2000),
  reason: z.string().min(1).max(1000),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  virality: z.number().min(0).max(100),
  topic: z.string().min(1).max(2000),
});
export type ReelCandidate = z.infer<typeof ReelCandidateSchema>;

const SceneSchema = z.object({
  index: z.number().int().min(1),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  onScreenText: z.string().min(1).max(160),
  bRoll: z.string().min(1).max(220),
  voiceover: z.string().min(1).max(280),
});
export type ReelScene = z.infer<typeof SceneSchema>;

const ProductionSchema = z.object({
  title: z.string().min(1),
  hook: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).min(3).max(15),
  cta: z.string().min(1),
  musicVibe: z.string().min(1),
  scenes: z.array(SceneSchema).min(4).max(6),
});
export type ReelProduction = z.infer<typeof ProductionSchema>;

/* ------------------------------------------------------------------ */
/* produceReel — turn a candidate into a full reel package             */
/* ------------------------------------------------------------------ */

const ProduceInput = z.object({
  candidate: ReelCandidateSchema,
  tone: z.enum(["cinematic", "punchy", "educational", "story"]).default("punchy"),
});

const PRODUCE_SYSTEM = `You are an award-winning short-form video director. You break a viral reel candidate down into a production-ready package: a punchy storyboard (4-6 scenes, each 2-12s, on-screen text + b-roll + voiceover), a refined caption, a CTA, a music vibe, and platform-ready hashtags. Write with rhythm and bite. No fluff, no emoji-spam, no hashtag-spam. Hashtags must be a-z0-9 only and start with the # character.`;

const PRODUCE_TOOL = {
  type: "function" as const,
  function: {
    name: "emit_reel_production",
    description: "Return the full production package for a reel.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        hook: { type: "string" },
        caption: { type: "string" },
        hashtags: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 12 },
        cta: { type: "string" },
        musicVibe: { type: "string" },
        scenes: {
          type: "array",
          minItems: 4,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              index: { type: "integer", minimum: 1 },
              startSec: { type: "number", minimum: 0 },
              endSec: { type: "number", minimum: 0 },
              onScreenText: { type: "string" },
              bRoll: { type: "string" },
              voiceover: { type: "string" },
            },
            required: ["index", "startSec", "endSec", "onScreenText", "bRoll", "voiceover"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "hook", "caption", "hashtags", "cta", "musicVibe", "scenes"],
      additionalProperties: false,
    },
  },
};

async function callGateway(body: unknown, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit hit. Please wait and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    const text = await res.text();
    console.error("AI gateway error:", res.status, text);
    throw new Error(`AI gateway error (${res.status})`);
  }
  return res.json();
}

async function generateCover(candidate: ReelCandidate, tone: string, apiKey: string): Promise<string | null> {
  const palette =
    tone === "cinematic" ? "cinematic teal-and-orange grading, soft volumetric lighting"
    : tone === "educational" ? "clean editorial flat design, bold geometric shapes, restrained palette"
    : tone === "story" ? "warm filmic tones, shallow depth of field, intimate framing"
    : "high-contrast punchy palette, neon accents, dynamic angles";

  const prompt = `Vertical 9:16 social-reel cover artwork. Topic: ${candidate.topic}. Hook overlay concept (do NOT render text): "${candidate.hook}". Style: ${palette}. Bold focal subject, plenty of negative space at the top for a hook headline, no watermarks, no logos, no readable text.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Cover image gen failed:", res.status, text);
      return null;
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json as string | undefined;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.error("Cover image gen exception:", err);
    return null;
  }
}

export const produceReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProduceInput.parse(input))
  .handler(async ({ data, context }): Promise<{ production: ReelProduction; cover: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // Production is heavier than a single reel idea — 2 credits.
    await consumeCredit(context.userId, 2);

    const userPrompt = `Topic / context:\n${data.candidate.topic}\n\nReel candidate:\n- Title: ${data.candidate.title}\n- Hook: ${data.candidate.hook}\n- Caption: ${data.candidate.caption}\n- Why it works: ${data.candidate.reason}\n- Source timecodes: ${data.candidate.startSec}s → ${data.candidate.endSec}s\n- Tone preset: ${data.tone}\n\nProduce the full reel package.`;

    const [textJson, cover] = await Promise.all([
      callGateway(
        {
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: PRODUCE_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          tools: [PRODUCE_TOOL],
          tool_choice: { type: "function", function: { name: "emit_reel_production" } },
        },
        apiKey,
      ),
      generateCover(data.candidate, data.tone, apiKey),
    ]);

    const argsRaw = textJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsRaw) throw new Error("AI returned no structured production");
    const production = ProductionSchema.parse(JSON.parse(argsRaw));
    return { production, cover };
  });

/* ------------------------------------------------------------------ */
/* refineReel — chat-driven patches                                    */
/* ------------------------------------------------------------------ */

const RefineInput = z.object({
  production: ProductionSchema,
  userMessage: z.string().trim().min(1).max(800),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .max(20)
    .default([]),
});

const REFINE_SYSTEM = `You are a senior content director iterating on a short-form reel. The user will request changes (shorter hook, more emotion, add a stat, swap CTA, etc.). Always return:
- a short conversational reply (max 2 sentences, no markdown lists)
- a PATCH object containing ONLY the fields you actually changed; omit any field you left untouched.
Never invent metrics or sources. Keep the brand voice tight, modern, premium.`;

const PatchSchema = z.object({
  reply: z.string().min(1).max(800),
  patch: z
    .object({
      title: z.string().min(1).optional(),
      hook: z.string().min(1).optional(),
      caption: z.string().min(1).optional(),
      cta: z.string().min(1).optional(),
      musicVibe: z.string().min(1).optional(),
      hashtags: z.array(z.string()).min(3).max(15).optional(),
      scenes: z.array(SceneSchema).min(4).max(6).optional(),
    })
    .default({}),
});
export type ReelPatch = z.infer<typeof PatchSchema>;

const REFINE_TOOL = {
  type: "function" as const,
  function: {
    name: "emit_reel_patch",
    description: "Return a conversational reply and a JSON patch of fields to change.",
    parameters: {
      type: "object",
      properties: {
        reply: { type: "string" },
        patch: {
          type: "object",
          properties: {
            title: { type: "string" },
            hook: { type: "string" },
            caption: { type: "string" },
            cta: { type: "string" },
            musicVibe: { type: "string" },
            hashtags: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 15 },
            scenes: {
              type: "array",
              minItems: 4,
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  index: { type: "integer", minimum: 1 },
                  startSec: { type: "number", minimum: 0 },
                  endSec: { type: "number", minimum: 0 },
                  onScreenText: { type: "string" },
                  bRoll: { type: "string" },
                  voiceover: { type: "string" },
                },
                required: ["index", "startSec", "endSec", "onScreenText", "bRoll", "voiceover"],
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
      required: ["reply", "patch"],
      additionalProperties: false,
    },
  },
};

export const refineReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RefineInput.parse(input))
  .handler(async ({ data, context }): Promise<ReelPatch> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    await consumeCredit(context.userId, 1);

    const snapshot = JSON.stringify(data.production);
    const messages = [
      { role: "system", content: REFINE_SYSTEM },
      {
        role: "system",
        content: `Current reel JSON (authoritative state):\n${snapshot}`,
      },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.userMessage },
    ];

    const json = await callGateway(
      {
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [REFINE_TOOL],
        tool_choice: { type: "function", function: { name: "emit_reel_patch" } },
      },
      apiKey,
    );
    const argsRaw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsRaw) throw new Error("AI returned no refinement");
    return PatchSchema.parse(JSON.parse(argsRaw));
  });