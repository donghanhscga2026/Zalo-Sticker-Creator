import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst";
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "medium";

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const STICKER_POSES = [
  { name: "Thumbs Up", caption: "OK", prompt: "bright happy smile, one hand clearly giving a thumbs-up toward the viewer" },
  { name: "Finger Heart", caption: "Yêu", prompt: "warm playful smile, one hand making a clear Korean finger-heart gesture" },
  { name: "Laughing", caption: "Haha", prompt: "laughing naturally with joyful eyes, lively friendly energy" },
  { name: "Surprised", caption: "Ôi!", prompt: "cute surprised expression with wide eyes and a small O-shaped mouth, hands near the cheeks" },
  { name: "Thinking", caption: "Hmm...", prompt: "thoughtful sideways glance, one hand gently under the chin" },
  { name: "Hello", caption: "Hello", prompt: "friendly enthusiastic wave with one open hand and a welcoming smile" },
  { name: "Cool", caption: "Cool", prompt: "confident playful smile wearing simple black sunglasses, relaxed cool pose" },
  { name: "Cute Cheeks", caption: "Hihi", prompt: "bashful happy smile, both open palms lightly framing the cheeks" },
  { name: "Big Heart", caption: "Love", prompt: "holding one large red heart prop with both hands in front of the chest, affectionate smile" },
  { name: "Fighting", caption: "Cố lên", prompt: "encouraging determined-but-cute smile with one clenched fist raised" },
  { name: "Shy", caption: "Ngại quá", prompt: "shy bashful smile, shoulders slightly tucked, gentle rosy-cheek expression" },
  { name: "Double Hearts", caption: "Muaah", prompt: "bright affectionate smile, both hands making Korean finger-heart gestures" },
  { name: "Salute", caption: "Roài", prompt: "cheerful playful salute with one hand, natural smile" },
  { name: "Sleepy", caption: "Buồn ngủ", prompt: "adorably sleepy expression, half-closed eyes, one hand near the cheek" },
  { name: "Crying Cute", caption: "Huhu", prompt: "cute emotional teary expression without distress, slightly pouting lips" },
] as const;

const STYLE_PROMPTS: Record<string, string> = {
  photo_real: "Photorealistic, natural skin texture, realistic proportions, soft studio lighting, premium camera-photo quality.",
  cute_soft: "Photorealistic identity with a gently cute, friendly expression and soft polished lighting; do not turn the face into a cartoon.",
  sticker_clean: "Photorealistic recognizable person, crisp clean sticker composition, clear silhouette, polished commercial messaging-sticker finish.",
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw Object.assign(new Error("Ảnh tải lên không đúng định dạng data URL."), { status: 400 });
  return { mimeType: match[1], data: match[2] };
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

function buildStickerPrompt(posePrompt: string, style: string) {
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.photo_real;
  return [
    "Create ONE square messaging sticker by editing the supplied reference portrait.",
    "The person must remain unmistakably the EXACT SAME PERSON as the reference image, not merely similar.",
    "Preserve facial identity with very high fidelity: face shape, eye shape and spacing, eyelids, eyebrows, nose shape, lips and mouth proportions, cheeks, jawline, chin, ears, skin tone, apparent age, distinctive asymmetry, hairline and hairstyle.",
    "Preserve the original clothing and accessories unless the requested gesture makes a tiny natural adjustment necessary.",
    "Do not beautify, redesign, de-age, change ethnicity, slim the jaw, enlarge the eyes, reshape the nose or lips, smooth away natural skin texture, or change hairstyle.",
    "Change ONLY the pose/expression/hand gesture needed for this sticker:",
    posePrompt + ".",
    stylePrompt,
    "Upper-body framing, natural anatomy, exactly two arms, realistic hands and fingers, subject centered with comfortable margin around the body.",
    "Use a transparent background with a clean isolated subject suitable for a sticker. Do not add text, letters, logos, watermarks, decorative captions, frames, or speech bubbles.",
  ].join(" ");
}

async function generateStickerWithOpenAI(
  source: { mimeType: string; data: string },
  pose: typeof STICKER_POSES[number],
  index: number,
  style: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("Chưa cấu hình OPENAI_API_KEY trên backend."), { status: 503 });

  const form = new FormData();
  form.append("model", OPENAI_IMAGE_MODEL);
  form.append("prompt", buildStickerPrompt(pose.prompt, style));
  form.append("size", "1024x1024");
  form.append("quality", OPENAI_IMAGE_QUALITY);
  form.append("background", "transparent");
  form.append("output_format", "png");
  const bytes = Buffer.from(source.data, "base64");
  form.append("image[]", new Blob([bytes], { type: source.mimeType }), `reference.${extensionFor(source.mimeType)}`);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(5 * 60 * 1000),
  });

  const requestId = response.headers.get("x-request-id") || undefined;
  if (!response.ok) {
    const detail = await response.text();
    const error: any = new Error(`OpenAI Image API HTTP ${response.status}: ${detail.slice(0, 900)}`);
    error.status = response.status;
    error.requestId = requestId;
    throw error;
  }

  const payload: any = await response.json();
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw Object.assign(new Error("OpenAI Image API không trả về dữ liệu ảnh."), { status: 502, requestId });

  return {
    id: `sticker_${index + 1}`,
    title: pose.name,
    caption: pose.caption,
    imageUrl: `data:image/png;base64,${b64}`,
    provider: "openai",
    requestId,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    imageProvider: "openai",
    imageModel: OPENAI_IMAGE_MODEL,
    imageQuality: OPENAI_IMAGE_QUALITY,
    configured: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/generate-stickers", async (req, res) => {
  try {
    const {
      image,
      count = 12,
      style = "photo_real",
      poseIndices,
    } = req.body as {
      image?: string;
      count?: number;
      style?: string;
      poseIndices?: number[];
    };

    if (!image) return res.status(400).json({ error: "Chưa có ảnh nguồn." });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "Backend chưa có OPENAI_API_KEY.", code: "OPENAI_NOT_CONFIGURED" });
    if (!(style in STYLE_PROMPTS)) return res.status(400).json({ error: "Style không hợp lệ." });

    const requestedCount = Math.min(Math.max(Math.round(Number(count) || 12), 1), STICKER_POSES.length);
    const indices = poseIndices
      ? [...new Set(poseIndices)].filter((i) => Number.isInteger(i) && i >= 0 && i < STICKER_POSES.length)
      : Array.from({ length: requestedCount }, (_, i) => i);

    if (!indices.length) return res.status(400).json({ error: "Danh sách biểu cảm không hợp lệ." });

    const source = parseDataUrl(image);
    const stickers: any[] = [];
    const failures: Array<{ index: number; message: string }> = [];

    for (const poseIndex of indices) {
      try {
        stickers.push(await generateStickerWithOpenAI(source, STICKER_POSES[poseIndex], poseIndex, style));
      } catch (error: any) {
        console.error(`Sticker ${poseIndex + 1} failed:`, error?.message || error);
        failures.push({ index: poseIndex, message: error?.message || "Generation failed" });
        if ([400, 401, 403, 429, 503].includes(error?.status)) {
          const status = error?.status === 429 ? 429 : error?.status === 503 ? 503 : 502;
          if (!stickers.length) {
            return res.status(status).json({
              error: error?.status === 429
                ? "OpenAI API đang chạm rate limit/quota của tài khoản. Hãy thử lại sau hoặc kiểm tra Billing/Limits."
                : error?.message || "OpenAI Image API từ chối yêu cầu.",
              code: error?.status === 429 ? "OPENAI_RATE_LIMIT" : "OPENAI_PROVIDER_ERROR",
              stickers,
              failures,
              remaining: indices.filter((i) => i >= poseIndex),
            });
          }
          break;
        }
      }
    }

    const completed = new Set(stickers.map((sticker) => Number(String(sticker.id).replace("sticker_", "")) - 1));
    const remaining = indices.filter((i) => !completed.has(i));

    res.json({
      success: true,
      stickers,
      requested: indices.length,
      generated: stickers.length,
      failures,
      remaining,
      warning: remaining.length ? "Đã giữ các ảnh tạo thành công. Bạn có thể tiếp tục phần còn thiếu." : undefined,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-stickers:", error);
    res.status(error?.status || 500).json({ error: error?.message || "Failed to generate stickers" });
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
