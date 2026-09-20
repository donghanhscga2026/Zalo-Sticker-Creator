# Zalo Sticker Creator - AI generation fix

## Root cause found
`src/App.tsx` never called `/api/generate-stickers`. It always called `generateExpressiveStickers()` in `src/lib/stickerGenerator.ts`, which only drew the same uploaded photo repeatedly on an HTML canvas with different crops, filters and emoji overlays. Therefore no prompt could make the person's pose, hands or facial expression change.

The server route did contain AI code, but it was effectively dead code from the UI. It also used `gemini-3.6-flash`, a general multimodal model, instead of the native image-generation/editing model, and silently substituted the original uploaded photo whenever generation failed. That made failures look like successful sticker generation.

## Changes
- `src/App.tsx` now POSTs the source image and count to `/api/generate-stickers`.
- `server.ts` now uses `gemini-3.1-flash-image` for image-to-image generation.
- 12 core sticker poses have explicit, distinct pose/expression instructions.
- Identity preservation, blue polo continuity, hand anatomy, no-circle composition and 1:1 output are explicitly prompted.
- Generation runs with a 3-worker pool and one retry per sticker.
- Failed AI calls are no longer disguised by returning the original photo.
- `/api/health` reports whether the API key is configured and which image model is used.

## AI Studio setup
Add `GEMINI_API_KEY` in AI Studio Secrets. Do not put the real key in source code or `.env.example`.

After importing the project, first open `/api/health` (or inspect it through the app runtime) and confirm `apiKeyConfigured: true`.
