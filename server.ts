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

const INSTANTID_SPACE = "https://instantx-instantid.hf.space";

async function generateOne(source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number) {
  const hfToken = process.env.HF_TOKEN;
  const authHeaders: Record<string, string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};

  // Upload the reference portrait to the official public InstantID Gradio Space.
  const uploadForm = new FormData();
  const imageBytes = Buffer.from(source.data, "base64");
  uploadForm.append("files", new Blob([imageBytes], { type: source.mimeType }), "portrait.jpg");
  const uploadResponse = await fetch(`${INSTANTID_SPACE}/upload`, {
    method: "POST",
    headers: authHeaders,
    body: uploadForm,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    const error: any = new Error(`InstantID upload HTTP ${uploadResponse.status}: ${detail.slice(0, 500)}`);
    error.status = uploadResponse.status;
    throw error;
  }
  const uploaded: any = await uploadResponse.json();
  const uploadedPath = Array.isArray(uploaded) ? uploaded[0] : uploaded?.[0] || uploaded?.path;
  if (!uploadedPath) throw new Error("InstantID upload không trả về đường dẫn ảnh.");

  const prompt = `photorealistic messaging sticker, same person and identity, same clothing, ${pose.prompt}, upper body, natural anatomy and hands, clean white background, centered`;
  const negativePrompt = "different person, changed identity, deformed face, distorted face, bad eyes, bad hands, extra fingers, extra limbs, low quality, blurry, text, watermark";

  // The official InstantID Space exposes this named Gradio endpoint.
  // IdentityNet and adapter strengths are deliberately high to prioritize likeness.
  const callResponse = await fetch(`${INSTANTID_SPACE}/call/generate_image`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        { path: uploadedPath, meta: { _type: "gradio.FileData" } },
        null,
        prompt,
        negativePrompt,
        "Spring Festival",
        20,
        1.1,
        1.1,
        0.0,
        0.0,
        [],
        4.5,
        42 + index,
        "EulerDiscreteScheduler",
        false,
        true
      ]
    }),
  });
  if (!callResponse.ok) {
    const detail = await callResponse.text();
    const error: any = new Error(`InstantID call HTTP ${callResponse.status}: ${detail.slice(0, 700)}`);
    error.status = callResponse.status;
    throw error;
  }
  const callData: any = await callResponse.json();
  if (!callData?.event_id) throw new Error("InstantID không trả về event_id.");

  // Gradio returns generation results as server-sent events.
  const resultResponse = await fetch(`${INSTANTID_SPACE}/call/generate_image/${callData.event_id}`, {
    headers: authHeaders,
  });
  if (!resultResponse.ok) {
    const detail = await resultResponse.text();
    const error: any = new Error(`InstantID result HTTP ${resultResponse.status}: ${detail.slice(0, 700)}`);
    error.status = resultResponse.status;
    throw error;
  }
  const eventText = await resultResponse.text();
  const dataLines = eventText.split("\n").filter(line => line.startsWith("data: "));
  if (!dataLines.length) throw new Error(`InstantID không trả về ảnh: ${eventText.slice(-700)}`);
  const payload: any = JSON.parse(dataLines[dataLines.length - 1].slice(6));

  // Gradio versions can wrap outputs as [FileData, update], {data:[...]},
  // or nested arrays. Find the first actual image FileData recursively.
  const findImageRef = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      return value.startsWith("http://") ||
        value.startsWith("https://") ||
        lower.includes(".png") ||
        lower.includes(".jpg") ||
        lower.includes(".jpeg") ||
        lower.includes(".webp")
        ? value
        : null;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findImageRef(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof value === "object") {
      if (typeof value.url === "string") return value.url;
      if (typeof value.path === "string") return value.path;
      if (value.data) {
        const found = findImageRef(value.data);
        if (found) return found;
      }
      for (const child of Object.values(value)) {
        const found = findImageRef(child);
        if (found) return found;
      }
    }
    return null;
  };

  const imageUrl = findImageRef(payload);
  if (!imageUrl) {
    console.error("InstantID raw SSE tail:", eventText.slice(-2000));
    throw new Error(`Không đọc được URL ảnh từ InstantID. Payload: ${JSON.stringify(payload).slice(0, 700)}`);
  }

  const absoluteUrl = imageUrl.startsWith("http") ? imageUrl : `${INSTANTID_SPACE}/file=${imageUrl}`;
  const imageResponse = await fetch(absoluteUrl, { headers: authHeaders });
  if (!imageResponse.ok) throw new Error(`Không tải được ảnh InstantID (HTTP ${imageResponse.status}).`);
  const outputType = imageResponse.headers.get("content-type") || "image/png";
  const outputBytes = Buffer.from(await imageResponse.arrayBuffer());

  return {
    id: `sticker_${index + 1}`,
    title: pose.name,
    imageUrl: `data:${outputType.split(";")[0]};base64,${outputBytes.toString("base64")}`,
    caption: pose.caption,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    imageProvider: "huggingface-instantid-public-space",
    imageModel: "InstantX/InstantID",
    configured: true,
    hfTokenConfigured: Boolean(process.env.HF_TOKEN),
  });
});

app.post("/api/generate-stickers", async (req, res) => {
  try {
    const { image, count = 12 } = req.body as { image?: string; count?: number };
    if (!image) return res.status(400).json({ error: "Chưa có ảnh nguồn." });
    // Public ZeroGPU test: exactly one sticker per request.
    const numStickers = 1;
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
      return res.status(502).json({
        error: `InstantID public Space lỗi: ${fatalError?.message || "unknown error"}`,
        code: "INSTANTID_PUBLIC_SPACE_ERROR",
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
