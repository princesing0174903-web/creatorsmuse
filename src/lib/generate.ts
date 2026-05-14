export type GeneratedAssets = {
  hooks: string[];
  captions: string[];
  posts: string[];
  shorts: string[];
};

const HOOKS = [
  (t: string) => `I spent 100 hours on ${t}. Here's the one truth nobody talks about.`,
  (t: string) => `Stop doing ${t} the old way. This is what actually works in 2026.`,
  (t: string) => `Everything you know about ${t} is about to change in 90 seconds.`,
  (t: string) => `The brutal truth about ${t} that creators won't admit.`,
  (t: string) => `${t}? I tried it for 30 days. The result shocked me.`,
];

const CAPTIONS = [
  (t: string) => `The era of guessing is over. Here's the system I use for ${t}. Save this.`,
  (t: string) => `If you create content about ${t}, this changes everything. Read to the end.`,
  (t: string) => `Most people fail at ${t} for one reason. Let me show you the fix.`,
];

const POSTS = [
  (t: string) => `🧵 Thread: 7 things I wish I knew before starting with ${t}. (1/7)`,
  (t: string) => `Hot take: ${t} is the most underrated skill in the creator economy right now.`,
  (t: string) => `Built a framework around ${t} that 10x'd my output. Sharing the full breakdown 👇`,
];

const SHORTS = [
  (t: string) => `Split-screen reaction: expectation vs reality of ${t}, with countdown timer overlay.`,
  (t: string) => `Fast-cut montage: 3 myths about ${t}, busted in under 30 seconds.`,
  (t: string) => `POV cinematic open: zoom into laptop screen mid-${t}, hard cut to insight.`,
  (t: string) => `Whiteboard explainer: draw the 3-step ${t} loop with hand-drawn arrows.`,
];

export async function generateAssets(topic: string): Promise<GeneratedAssets> {
  const t = topic.trim() || "your next viral idea";
  await new Promise((r) => setTimeout(r, 1400));
  return {
    hooks: HOOKS.map((f) => f(t)),
    captions: CAPTIONS.map((f) => f(t)),
    posts: POSTS.map((f) => f(t)),
    shorts: SHORTS.map((f) => f(t)),
  };
}