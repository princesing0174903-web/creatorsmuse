import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  topic: z.string().trim().min(1).max(2000),
  fileName: z.string().trim().max(300).optional(),
  durationSec: z.number().int().min(15).max(3600).optional(),
});

const ReelSchema = z.object({
  title: z.string().min(1),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  hook: z.string().min(1),
  caption: z.string().min(1),
  reason: z.string().min(1),
  virality: z.number().min(0).max(100),
  engagement: z.number().min(0).max(100),
  emotion: z.number().min(0).max(100),
  hookStrength: z.number().min(0).max(100),
});

const OutputSchema = z.object({
  reels: z.array(ReelSchema).length(5),
});

export type GeneratedReel = z.infer<typeof ReelSchema>;
export type GeneratedReels = z.infer<typeof OutputSchema>;

const SYSTEM_PROMPT = `You are an elite short-form video editor and viral strategist. Given a source video's topic + filename (and approximate duration), propose the 5 BEST reel-worthy segments to cut for TikTok / Shorts / Reels.

Rules:
- Output EXACTLY 5 reel segments.
- Each segment 15–60 seconds long (endSec - startSec).
- Segments must NOT all start at 0; spread them across the video timeline using the given duration.
- Each reel needs: a punchy title (max 60 chars), a strong opening hook line (spoken in first 1.5s), a ready-to-paste caption, and a one-sentence "reason" explaining WHY this moment is reel-worthy (story beat, emotional spike, contrarian take, payoff, etc.).
- Distinct angles per reel — no repetition.
- Score each reel (integers 0-100, spread realistically — avoid clustering 80-95):
  - virality, engagement, emotion, hookStrength (how hard the first 5 words pull attention).
`;

export const generateReels = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedReels> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const duration = data.durationSec ?? 600;
    const userPrompt = `Source video topic / description:\n${data.topic}${
      data.fileName ? `\n\nFilename: ${data.fileName}` : ""
    }\n\nApproximate source duration: ${duration} seconds.\n\nReturn 5 reel segments spread across the timeline.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
              name: "emit_reels",
              description: "Return 5 reel segments.",
              parameters: {
                type: "object",
                properties: {
                  reels: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        startSec: { type: "number", minimum: 0 },
                        endSec: { type: "number", minimum: 0 },
                        hook: { type: "string" },
                        caption: { type: "string" },
                        reason: { type: "string" },
                        virality: { type: "integer", minimum: 0, maximum: 100 },
                        engagement: { type: "integer", minimum: 0, maximum: 100 },
                        emotion: { type: "integer", minimum: 0, maximum: 100 },
                        hookStrength: { type: "integer", minimum: 0, maximum: 100 },
                      },
                      required: [
                        "title", "startSec", "endSec", "hook", "caption", "reason",
                        "virality", "engagement", "emotion", "hookStrength",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["reels"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_reels" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit hit. Please wait and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      const text = await res.text();
      console.error("AI gateway error:", res.status, text);
      throw new Error(`AI gateway error (${res.status})`);
    }
    const json = await res.json();
    const argsRaw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsRaw) throw new Error("AI returned no structured output");
    return OutputSchema.parse(JSON.parse(argsRaw));
  });