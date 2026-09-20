import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

function getCloudflareConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("Chưa cấu hình CLOUDFLARE_ACCOUNT_ID và CLOUDFLARE_API_TOKEN trong AI Studio Secrets.");
  }
  return { accountId, apiToken };
}

const STICKER_POSES = [
  { name: "Thumbs Up", prompt: "joyful big smile, one hand clearly giving a thumbs-up toward camera; yellow comic excitement rays", caption: "OK" },
  { name: "Finger Heart", prompt: "playful wink, one hand making a clear Korean finger-heart; several small red hearts", caption: "Yêu" },
  { name: "Cute Cheeks", prompt: "eyes happily closed, both open palms cupping the cheeks symmetrically; dreamy red hearts", caption: "Hihi" },
  { name: "Cool", prompt: "wearing black sunglasses, smiling, both hands doing playful finger-guns; golden sparkles", caption: "Cool" },
  { name: "Thinking", prompt: "thoughtful sideways glance, one hand under chin; large blue question mark", caption: "Hmm..." },
  { name: "Surprised", prompt: "wide surprised eyes and O-shaped mouth, both palms on cheeks; yellow comic surprise rays", caption: "Ôi!" },
  { name: "Coffee", prompt: "relaxed warm smile while holding a small white coffee mug with a simple smiley face", caption: "Chill" },
  { name: "Laughing", prompt: "laughing hard with eyes squeezed closed and head tilted slightly; black comic HA HA lettering beside the head", caption: "Haha" },
  { name: "Salute", prompt: "black sunglasses and a crisp playful salute with one hand; cheerful smile", caption: "Roài" },
  { name: "Double Hearts", prompt: "both hands visible, each hand making a Korean finger-heart; bright affectionate smile; red hearts", caption: "Muaah" },
  { name: "Look Back", prompt: "upper body turned away about 45 degrees, looking back over the shoulder at camera with a gentle smile; yellow accent rays", caption: "Đẹp" },
  { name: "Big Heart", prompt: "holding one large flat red heart prop with both hands in front of chest, playful wink and smile; floating red hearts", caption: "Love" },
  { name: "Fighting", prompt: "determined but cute smile, one clenched fist raised in an encouraging fighting pose; energetic comic rays", caption: "Cố lên" },
  { name: "Shy", prompt: "shy bashful smile, slightly rosy cheeks, shoulders tucked in; tiny pink hearts and sparkles", caption: "Ái chà" },
  { name: "Hello", prompt: "friendly enthusiastic wave with one open hand, bright welcoming smile; cheerful motion lines", caption: "Hello" },
];

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: "image/jpeg", data: dataUrl };
}

async function generateOne(source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number) {
  const { accountId, apiToken } = getCloudflareConfig();
  const prompt = `Create ONE square photorealistic messaging sticker by EDITING input_image_0. Keep the SAME recognizable person and preserve identity, face shape, eyes, eyebrows, nose, mouth, skin tone, hairstyle/hairline and the same clothing from the reference. Change only the expression/pose as requested: ${pose.prompt}. Upper-body framing, natural anatomy and hands, clean white background, thick white die-cut outline, subtle shadow, centered composition. No circular frame, no caption pill, no extra text unless explicitly requested.`;

  // FLUX.2 Klein image editing uses multipart input. The reference image field
  // must be named input_image_0 rather than sent as JSON image_b64.
  const form = new FormData();
  form.append("prompt", prompt);
  const imageBytes = Buffer.from(source.data, "base64");
  form.append("input_image_0", new Blob([imageBytes], { type: source.mimeType }), "reference.jpg");
  form.append("width", "1024");
  form.append("height", "1024");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_MODEL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    const error: any = new Error(`Cloudflare Workers AI HTTP ${response.status}: ${detail.slice(0, 700)}`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "application/json";
  if (contentType.includes("application/json")) {
    const data: any = await response.json();
    const b64 = data?.result?.image || data?.result?.image_b64 || data?.image;
    if (!b64) throw new Error("Cloudflare FLUX.2 không trả về dữ liệu ảnh.");
    return { id: `sticker_${index + 1}`, title: pose.name, imageUrl: `data:image/png;base64,${b64}`, caption: pose.caption };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return { id: `sticker_${index + 1}`, title: pose.name, imageUrl: `data:${contentType.split(";")[0]};base64,${bytes.toString("base64")}`, caption: pose.caption };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    imageProvider: "cloudflare-workers-ai",
    imageModel: CLOUDFLARE_MODEL,
    configured: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
  });
});

app.post("/api/generate-stickers", async (req, res) => {
  try {
    const { image, count = 12 } = req.body as { image?: string; count?: number };
    if (!image) return res.status(400).json({ error: "Chưa có ảnh nguồn." });
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return res.status(503).json({ error: "Chưa cấu hình CLOUDFLARE_ACCOUNT_ID và CLOUDFLARE_API_TOKEN trong AI Studio Secrets." });
    }

    const numStickers = Math.min(Math.max(Number(count) || 12, 1), 15);
    const poses = STICKER_POSES.slice(0, numStickers);
    const source = parseDataUrl(image);
    const results = new Array<any>(poses.length);
    const failures: { index: number; message: string }[] = [];
    let next = 0;
    let fatalError: any = null;
    const worker = async () => {
      while (!fatalError) {
        const index = next++;
        if (index >= poses.length) return;
        try {
          results[index] = await generateOne(source, poses[index], index);
        } catch (err: any) {
          console.error(`Sticker ${index + 1} failed:`, err?.message || err);
          if (err?.status === 400 || err?.status === 401 || err?.status === 403 || err?.status === 429) {
            fatalError = err;
            return;
          }
          failures.push({ index, message: err?.message || "Generation failed" });
        }
      }
    };
    // Start with one request at a time: safer for free-tier capacity and prevents
    // multiple wasted generations when the provider rejects a model/account.
    await worker();

    if (fatalError) {
      const status = fatalError?.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: fatalError?.status === 429
          ? "Cloudflare Workers AI đã chạm giới hạn miễn phí hiện tại. Hãy thử lại sau khi quota được làm mới."
          : `Cloudflare Workers AI không chấp nhận yêu cầu: ${fatalError?.message || "kiểm tra model, Account ID và API Token."}`,
        code: fatalError?.status === 429 ? "CLOUDFLARE_QUOTA_EXCEEDED" : "CLOUDFLARE_AUTH_ERROR",
      });
    }

    const stickers = results.filter(Boolean);
    if (!stickers.length) {
      return res.status(502).json({ error: `AI không tạo được ảnh. ${failures[0]?.message || "Kiểm tra Cloudflare Workers AI token/quota/model access."}` });
    }

    res.json({ success: true, stickers, requested: poses.length, generated: stickers.length, failures });
  } catch (error: any) {
    console.error("Error in /api/generate-stickers:", error);
    res.status(500).json({ error: error?.message || "Failed to generate stickers" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
