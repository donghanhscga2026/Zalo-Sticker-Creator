import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured. Add it in AI Studio > Secrets.");
  return new GoogleGenAI({ apiKey });
};

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

function isQuotaError(error: any) {
  const raw = typeof error?.message === "string" ? error.message : JSON.stringify(error ?? {});
  return error?.status === 429 || error?.code === 429 || raw.includes('"code":429') || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota");
}

function extractGeneratedImage(response: any): string | null {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part?.inlineData;
    if (inline?.data) return `data:${inline.mimeType || "image/png"};base64,${inline.data}`;
  }
  return null;
}

async function generateOne(ai: GoogleGenAI, source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number) {
  const prompt = `
Edit the uploaded portrait into ONE polished chat sticker. The uploaded person is the identity reference.

IDENTITY — highest priority:
- Keep the same recognizable person: facial proportions, eyes, eyebrows, nose, mouth, smile characteristics, skin tone, head shape and hairstyle/hairline.
- Do not replace the person with a generic lookalike and do not beautify them into a different face.
- Keep the same blue polo shirt from the reference unless an accessory in the requested pose requires otherwise.

POSE / EXPRESSION FOR THIS STICKER:
${pose.prompt}

COMPOSITION / STYLE:
- Photorealistic cutout sticker made from the same person, not a cartoon and not an illustration.
- Upper body / waist-up framing with hands fully visible when the pose uses hands. Correct anatomy: exactly two arms and two hands, five fingers per hand, no merged or duplicated fingers.
- Subject centered, large enough to read as a messaging sticker, with comfortable empty margin around the silhouette.
- Clean pure white background (#FFFFFF).
- Add a smooth thick white die-cut outline around the person's silhouette and props, plus a very subtle light-gray outer edge/shadow so the cutout is visible on white.
- Decorative hearts/rays/sparkles may sit around the person as requested.
- Do NOT add a circular portrait frame. Do NOT put the person inside a circle or badge.
- Do NOT add a caption pill at the bottom. Do not add any text except when the pose explicitly requests comic text such as HA HA.
- Square 1:1 sticker composition.

Return the edited/generated image only.`.trim();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { data: source.data, mimeType: source.mimeType } },
            { text: prompt },
          ],
        }],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1" },
        },
      } as any);

      const imageUrl = extractGeneratedImage(response);
      if (!imageUrl) throw new Error("Image model returned no image data");
      return { id: `sticker_${index + 1}`, title: pose.name, imageUrl, caption: pose.caption };
    } catch (err) {
      lastError = err;
      if (isQuotaError(err)) throw err;
      if (attempt === 0) await new Promise(r => setTimeout(r, 700));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unknown image generation error");
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", imageModel: "gemini-3.1-flash-image", apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/generate-stickers", async (req, res) => {
  try {
    const { image, count = 12 } = req.body as { image?: string; count?: number };
    if (!image) return res.status(400).json({ error: "Chưa có ảnh nguồn." });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "Chưa cấu hình GEMINI_API_KEY trong AI Studio Secrets. App sẽ không dùng ảnh gốc giả làm kết quả AI nữa." });
    }

    const numStickers = Math.min(Math.max(Number(count) || 12, 9), 15);
    const poses = STICKER_POSES.slice(0, numStickers);
    const source = parseDataUrl(image);
    const ai = getAiClient();

    const results = new Array<any>(poses.length);
    const failures: { index: number; message: string }[] = [];
    let next = 0;
    let quotaError: any = null;
    const worker = async () => {
      while (!quotaError) {
        const index = next++;
        if (index >= poses.length) return;
        try {
          results[index] = await generateOne(ai, source, poses[index], index);
        } catch (err: any) {
          console.error(`Sticker ${index + 1} failed:`, err?.message || err);
          if (isQuotaError(err)) {
            quotaError = err;
            return;
          }
          failures.push({ index, message: err?.message || "Generation failed" });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, poses.length) }, () => worker()));

    if (quotaError) {
      return res.status(429).json({
        error: "Gemini Image hiện không còn quota cho API key/project này. Hãy bật billing hoặc tăng quota cho Gemini API rồi thử lại.",
        code: "GEMINI_QUOTA_EXCEEDED",
      });
    }

    const stickers = results.filter(Boolean);
    if (!stickers.length) {
      return res.status(502).json({ error: `AI không tạo được ảnh. ${failures[0]?.message || "Kiểm tra API key/quota/model access."}` });
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
