# Reel Studio — production, AI refinement, publishing

Today `/reels` only shows AI-scored *ideas*. We'll wire a full "Start this reel" flow so each candidate becomes a producible asset with a storyboard, generated cover, editable copy, an AI chat that refines it, and a publish hub for TikTok, Instagram, YouTube Shorts, and X.

## What ships

### 1. "Start this reel" on each reel card
- New primary button on each `ReelCard` in `/reels`.
- Clicking hands the reel off (sessionStorage) and routes to `/reels/studio`.

### 2. New route — `/reels/studio` (Reel Studio)
A three-pane workbench:

- **Left: Storyboard + cover**
  - AI-generated 5-scene shot list: timecode, on-screen text, b-roll, voiceover.
  - AI-generated 9:16 cover image (Lovable AI image gen).
  - Aspect-ratio + tone presets (Cinematic / Punchy / Educational / Story).
- **Center: Editable reel sheet**
  - Title, hook, caption, hashtags, CTA — all editable.
  - Live virality + score badges from the source candidate.
  - Tabs: Storyboard · Captions · Hashtags · Music vibe.
- **Right: AI Refiner chat**
  - Persistent chat sidebar streaming from Lovable AI Gateway.
  - User says "make it more emotional / shorten the hook / add a stat" → AI returns a structured patch applied to the reel sheet (title/hook/caption/hashtags).
  - Chat history kept in component state for the session.

### 3. Publish hub (bottom of Studio)
Honest about what we can/can't do without each platform's OAuth:
- One card per platform: **TikTok**, **Instagram Reels**, **YouTube Shorts**, **X**.
- Each card offers: Copy caption + hashtags, Download cover image, Open uploader.
  - X uses a real web-intent deep link (pre-fills caption).
  - TikTok/IG/YT open the official upload pages in a new tab.
- A "Direct publishing coming soon" badge on the platforms requiring OAuth, with a note that we'll wire native publishing once the user connects accounts.

### 4. Server functions (TanStack `createServerFn`)
- `produceReel` — input: source reel candidate → output: `{ storyboard[], cover (image URL/base64), captionPack, hashtags[] }`. Uses Lovable AI:
  - `google/gemini-3-flash-preview` (structured tool call) for storyboard + captions/hashtags.
  - `google/gemini-3.1-flash-image-preview` via `/v1/images/generations` for the cover.
  - Quota: `consumeCredit(userId, 2)` — production costs 2 credits.
- `refineReel` — input: current reel sheet + chat turn → output: structured patch `{ title?, hook?, caption?, hashtags?, scenes?, reply }`. Uses `google/gemini-3-flash-preview`. Quota: 1 credit per refinement.

### 5. UI polish (billion-dollar-SaaS feel)
- Matches existing dark / mono / glow aesthetic in `src/styles.css`.
- Fade-up scene reveal, shimmer on cover while generating.
- Sticky chat composer, streaming token cursor, copy-to-clipboard everywhere.
- Mobile: panes stack vertically; chat becomes a sheet.

## Out of scope (called out to user)
- Real OAuth publishing into TikTok/Instagram/YouTube — those need each platform's API + business approval. We deep-link to their uploaders today and clearly badge them "Direct publish — coming soon."
- Full video rendering (we generate cover image + storyboard + copy; the user uploads their source clip with our caption/hashtags to the chosen platform).

## Technical notes
- New files: `src/lib/reel-studio.functions.ts` (`produceReel`, `refineReel`), `src/routes/reels.studio.tsx`, `src/components/reel-studio/*` (Storyboard, Sheet, ChatPanel, PublishHub, CoverPreview).
- Handoff from `/reels` → `/reels/studio` via `sessionStorage["nexus.reel.studio.candidate"]` to avoid bloating the URL.
- Both server fns reuse `consumeCredit` and `requireSupabaseAuth`.
- Cover image returned as `data:image/png;base64,...` from Gateway and rendered inline; user can download via a blob URL.
- No DB schema changes — Studio session is client-side state. (Persisted reel library can be a follow-up.)
