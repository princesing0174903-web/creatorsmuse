import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  topic: z.string().trim().min(1).max(2000),
  fileName: z.string().trim().max(300).optional(),
});

const ScoredItem = z.object({
  text: z.string().min(1),
  virality: z.number().min(0).max(100),
  engagement: z.number().min(0).max(100),
  emotion: z.number().min(0).max(100),
});

const OutputSchema = z.object({
  hooks: z.array(ScoredItem).length(5),
  captions: z.array(ScoredItem).length(5),
  posts: z.array(ScoredItem).length(5),
  shorts: z.array(ScoredItem).length(5),
});

export type ScoredAsset = z.infer<typeof ScoredItem>;
export type GeneratedAssets = z.infer<typeof OutputSchema>;

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
Spread scores realistically: a flat list with one 92, one 88, one 74, one 61, one 48 is more useful than five 90s.
`;

export const generateAssets = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedAssets> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

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
        model: "openai/gpt-5-mini",
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
                  },
                  required: ["text", "virality", "engagement", "emotion"],
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
    return parsed;
  });