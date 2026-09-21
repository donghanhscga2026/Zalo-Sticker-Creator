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
const PULID_SPACE = "https://yanze-pulid.hf.space";
const PULID_FLUX_SPACE = "https://yanze-pulid-flux.hf.space";

type GenerationPreset = "instantid_balanced" | "instantid_fidelity" | "instantid_conservative" | "faceid_plus" | "pulid_fidelity" | "pulid_flux_fidelity" | "original_face";
const INSTANTID_PRESETS = {
  instantid_balanced: { steps: 20, identity: 1.1, adapter: 1.1, cfg: 4.5 },
  instantid_fidelity: { steps: 30, identity: 1.35, adapter: 1.25, cfg: 3.5 },
  instantid_conservative: { steps: 30, identity: 1.45, adapter: 1.35, cfg: 2.5 },
} as const;

async function generateOne(source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number, preset: GenerationPreset = "instantid_conservative") {
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

  const cfg = INSTANTID_PRESETS[preset as keyof typeof INSTANTID_PRESETS] || INSTANTID_PRESETS.instantid_conservative;
  const prompt = `Unedited RAW photorealistic portrait of the EXACT SAME PERSON in the reference. Treat the reference face as fixed identity, not inspiration. Keep the face nearly unchanged: identical head shape, facial proportions, eye size and spacing, eyelids, eyebrows, nose width and shape, lips and mouth proportions, cheeks, jawline, chin, ears, skin tone, apparent age, hairline and hairstyle. Keep natural pores, skin texture, asymmetry and distinctive facial features. NO beautification and NO cosmetic redesign. Keep the EXACT SAME clothing and accessories from the reference. Change ONLY the arm and hand gesture to: ${pose.prompt}. Keep head angle and facial expression close to the reference, with only a subtle natural smile if needed. Real camera photo, neutral soft light, upper body, anatomically correct hand, plain clean white background, no sticker decorations, no symbols, no writing.`;
  const negativePrompt = "different person, identity drift, changed face, face swap, altered facial geometry, enlarged eyes, doll eyes, narrowed jaw, V-shaped jaw, smaller nose, reshaped nose, fuller lips, changed mouth, changed eyebrows, changed cheeks, younger face, beauty filter, skin smoothing, airbrushed skin, porcelain skin, glamour retouching, excessive makeup, lipstick change, doll face, cartoon, anime, illustration, 3d render, stylized face, changed hairstyle, changed hairline, changed clothing, costume, red clothing, cheek sticker, face sticker, emoji, hearts, comic rays, decorations, symbols, text, letters, characters, logo, watermark, deformed face, bad hands, extra fingers, extra limbs, blurry, low quality";

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
        "(No style)",
        30,
        1.35,
        1.25,
        0.0,
        0.0,
        [],
        3.5,
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

  // Modern Gradio FileData often returns /gradio_api/file=<path> or a full URL.
  // Older Spaces used /file=<path>. Try the exact reference first, then both
  // Gradio file routes before failing.
  const normalizeInstantIdFileRef = (ref: string): string[] => {
    const refs: string[] = [];

    // The public Space currently returns a queue-scoped URL such as
    // /call/gen/file=/tmp/gradio/.../image.webp. That route is not a public
    // file-serving endpoint. Extract the underlying Gradio temp path and
    // rebuild it against the actual file endpoints.
    const fileMarker = "file=";
    const markerIndex = ref.indexOf(fileMarker);
    const rawPath = markerIndex >= 0 ? ref.slice(markerIndex + fileMarker.length) : ref;

    if (ref.startsWith("http")) refs.push(ref);
    else if (ref.startsWith("/") && markerIndex < 0) refs.push(`${INSTANTID_SPACE}${ref}`);

    if (rawPath) {
      refs.push(`${INSTANTID_SPACE}/gradio_api/file=${encodeURI(rawPath)}`);
      refs.push(`${INSTANTID_SPACE}/file=${encodeURI(rawPath)}`);
    }

    return [...new Set(refs)];
  };

  const candidates = normalizeInstantIdFileRef(imageUrl);

  let imageResponse: Response | null = null;
  let lastStatus = 0;
  for (const candidate of candidates) {
    const attempt = await fetch(candidate, { headers: authHeaders });
    lastStatus = attempt.status;
    if (attempt.ok) {
      imageResponse = attempt;
      break;
    }
  }
  if (!imageResponse) {
    console.error("InstantID image reference:", imageUrl);
    throw new Error(`Không tải được ảnh InstantID (HTTP ${lastStatus}). Ref: ${imageUrl.slice(0, 300)}`);
  }
  const outputType = imageResponse.headers.get("content-type") || "image/png";
  const outputBytes = Buffer.from(await imageResponse.arrayBuffer());

  return {
    id: `sticker_${index + 1}`,
    title: pose.name,
    imageUrl: `data:${outputType.split(";")[0]};base64,${outputBytes.toString("base64")}`,
    caption: pose.caption,
  };
}


async function generatePulidFidelity(source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number) {
  const hfToken = process.env.HF_TOKEN;
  const authHeaders: Record<string, string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};
  const uploadForm = new FormData();
  uploadForm.append("files", new Blob([Buffer.from(source.data, "base64")], { type: source.mimeType }), "portrait.jpg");
  const uploadResponse = await fetch(`${PULID_SPACE}/gradio_api/upload`, { method: "POST", headers: authHeaders, body: uploadForm });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    throw Object.assign(new Error(`PuLID upload HTTP ${uploadResponse.status}: ${detail.slice(0, 500)}`), { status: uploadResponse.status });
  }
  const uploaded: any = await uploadResponse.json();
  const uploadedPath = Array.isArray(uploaded) ? uploaded[0] : uploaded?.[0] || uploaded?.path;
  if (!uploadedPath) throw new Error("PuLID upload không trả về đường dẫn ảnh.");

  const prompt = `photorealistic portrait, exact same person and facial identity as reference, same age, hairstyle, skin tone and clothing, ${pose.prompt}, upper body, realistic skin texture, clean white background, no text, no decorations`;
  const negativePrompt = "different person, changed identity, beauty filter, altered face, doll face, cartoon, text, watermark, deformed face, bad eyes, bad hands, extra fingers, extra limbs, blurry";
  const data = [
    { path: uploadedPath, meta: { _type: "gradio.FileData" } },
    null, null, null, prompt, negativePrompt,
    1.2, 1, 42 + index, 8, 1024, 768, 1.2, "fidelity", false
  ];
  const callResponse = await fetch(`${PULID_SPACE}/gradio_api/call/run`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!callResponse.ok) {
    const detail = await callResponse.text();
    throw Object.assign(new Error(`PuLID call HTTP ${callResponse.status}: ${detail.slice(0, 700)}`), { status: callResponse.status });
  }
  const callData: any = await callResponse.json();
  if (!callData?.event_id) throw new Error("PuLID không trả về event_id.");
  const resultResponse = await fetch(`${PULID_SPACE}/gradio_api/call/run/${callData.event_id}`, { headers: authHeaders });
  if (!resultResponse.ok) throw Object.assign(new Error(`PuLID result HTTP ${resultResponse.status}`), { status: resultResponse.status });
  const eventText = await resultResponse.text();
  const dataLines = eventText.split("\n").filter((line) => line.startsWith("data: "));
  if (!dataLines.length) throw new Error(`PuLID không trả về ảnh: ${eventText.slice(-700)}`);
  const payload: any = JSON.parse(dataLines[dataLines.length - 1].slice(6));

  const findImageRef = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      return value.startsWith("http://") || value.startsWith("https://") ||
        lower.includes(".png") || lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".webp") ? value : null;
    }
    if (Array.isArray(value)) {
      for (const item of value) { const found = findImageRef(item); if (found) return found; }
      return null;
    }
    if (typeof value === "object") {
      if (typeof value.url === "string") return value.url;
      if (typeof value.path === "string") return value.path;
      for (const child of Object.values(value)) { const found = findImageRef(child); if (found) return found; }
    }
    return null;
  };
  const imageRef = findImageRef(payload);
  if (!imageRef) throw new Error(`Không đọc được ảnh PuLID. Payload: ${JSON.stringify(payload).slice(0, 700)}`);
  const marker = imageRef.indexOf("file=");
  const rawPath = marker >= 0 ? imageRef.slice(marker + 5) : imageRef;
  const candidates = [
    ...(imageRef.startsWith("http") ? [imageRef] : []),
    `${PULID_SPACE}/gradio_api/file=${encodeURI(rawPath)}`,
    `${PULID_SPACE}/file=${encodeURI(rawPath)}`,
  ];
  let imageResponse: Response | null = null;
  for (const candidate of [...new Set(candidates)]) {
    const attempt = await fetch(candidate, { headers: authHeaders });
    if (attempt.ok) { imageResponse = attempt; break; }
  }
  if (!imageResponse) throw new Error(`Không tải được ảnh PuLID. Ref: ${imageRef.slice(0, 300)}`);
  const outputType = imageResponse.headers.get("content-type") || "image/png";
  const outputBytes = Buffer.from(await imageResponse.arrayBuffer());
  return {
    id: `sticker_${index + 1}`,
    title: `${pose.name} · PuLID Fidelity`,
    imageUrl: `data:${outputType.split(";")[0]};base64,${outputBytes.toString("base64")}`,
    caption: pose.caption,
  };
}


async function generatePulidFluxFidelity(source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number) {
  const hfToken = process.env.HF_TOKEN;
  const authHeaders: Record<string, string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};

  // Verify the live Gradio schema before spending a ZeroGPU generation.
  const infoResponse = await fetch(`${PULID_FLUX_SPACE}/gradio_api/info`, { headers: authHeaders });
  if (!infoResponse.ok) {
    const detail = await infoResponse.text();
    throw Object.assign(new Error(`PuLID-FLUX schema HTTP ${infoResponse.status}: ${detail.slice(0, 500)}`), { status: infoResponse.status });
  }
  const infoText = await infoResponse.text();
  if (!infoText.includes("generate_image")) {
    throw new Error("PuLID-FLUX API schema đã thay đổi: không tìm thấy endpoint generate_image.");
  }

  const uploadForm = new FormData();
  uploadForm.append("files", new Blob([Buffer.from(source.data, "base64")], { type: source.mimeType }), "portrait.jpg");
  const uploadResponse = await fetch(`${PULID_FLUX_SPACE}/gradio_api/upload`, {
    method: "POST",
    headers: authHeaders,
    body: uploadForm,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    throw Object.assign(new Error(`PuLID-FLUX upload HTTP ${uploadResponse.status}: ${detail.slice(0, 500)}`), { status: uploadResponse.status });
  }
  const uploaded: any = await uploadResponse.json();
  const uploadedPath = Array.isArray(uploaded) ? uploaded[0] : uploaded?.[0] || uploaded?.path;
  if (!uploadedPath) throw new Error("PuLID-FLUX upload không trả về đường dẫn ảnh.");

  const prompt = `RAW photorealistic portrait of the exact same person in the reference photo. Preserve facial identity, age, facial proportions, hairstyle, hairline, skin tone, natural skin texture, clothing and accessories. Change only the body/arm gesture to: ${pose.prompt}. Upper-body real camera photo, natural anatomy, clean neutral background, no text, no logo, no decorative stickers.`;
  const negativePrompt = "different person, identity drift, changed facial geometry, beauty filter, enlarged eyes, V-shaped jaw, reshaped nose, fuller lips, changed hairstyle, changed clothing, cartoon, anime, illustration, text, watermark, bad hands, extra fingers, extra limbs, blurry, low quality";

  // Current official PuLID-FLUX generate_image signature:
  // prompt, id_image, start_step, guidance, seed, true_cfg,
  // width, height, num_steps, id_weight, neg_prompt,
  // timestep_to_start_cfg, max_sequence_length.
  const data = [
    prompt,
    { path: uploadedPath, orig_name: "portrait.jpg", meta: { _type: "gradio.FileData" } },
    2,
    4,
    42 + index,
    1,
    896,
    1152,
    28,
    1.0,
    negativePrompt,
    1,
    512,
  ];

  // Use the compatibility call route supported across Gradio 5/6.
  const callResponse = await fetch(`${PULID_FLUX_SPACE}/gradio_api/call/generate_image`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!callResponse.ok) {
    const detail = await callResponse.text();
    throw Object.assign(new Error(`PuLID-FLUX call HTTP ${callResponse.status}: ${detail.slice(0, 700)}`), { status: callResponse.status });
  }
  const callData: any = await callResponse.json();
  if (!callData?.event_id) throw new Error("PuLID-FLUX không trả về event_id.");

  const resultResponse = await fetch(
    `${PULID_FLUX_SPACE}/gradio_api/call/generate_image/${callData.event_id}`,
    { headers: authHeaders },
  );
  if (!resultResponse.ok) {
    const detail = await resultResponse.text();
    throw Object.assign(new Error(`PuLID-FLUX result HTTP ${resultResponse.status}: ${detail.slice(0, 700)}`), { status: resultResponse.status });
  }
  const eventText = await resultResponse.text();
  const dataLines = eventText.split("\n").filter((line) => line.startsWith("data: "));
  if (!dataLines.length) throw new Error(`PuLID-FLUX không trả về ảnh: ${eventText.slice(-700)}`);
  const payload: any = JSON.parse(dataLines[dataLines.length - 1].slice(6));

  const findImageRef = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      return value.startsWith("http://") || value.startsWith("https://") ||
        lower.includes(".png") || lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".webp")
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
      for (const child of Object.values(value)) {
        const found = findImageRef(child);
        if (found) return found;
      }
    }
    return null;
  };

  const imageRef = findImageRef(payload);
  if (!imageRef) throw new Error(`Không đọc được ảnh PuLID-FLUX. Payload: ${JSON.stringify(payload).slice(0, 700)}`);
  const marker = imageRef.indexOf("file=");
  const rawPath = marker >= 0 ? imageRef.slice(marker + 5) : imageRef;
  const candidates = [
    ...(imageRef.startsWith("http") ? [imageRef] : []),
    `${PULID_FLUX_SPACE}/gradio_api/file=${encodeURI(rawPath)}`,
    `${PULID_FLUX_SPACE}/file=${encodeURI(rawPath)}`,
  ];

  let imageResponse: Response | null = null;
  for (const candidate of [...new Set(candidates)]) {
    const attempt = await fetch(candidate, { headers: authHeaders });
    if (attempt.ok) {
      imageResponse = attempt;
      break;
    }
  }
  if (!imageResponse) throw new Error(`Không tải được ảnh PuLID-FLUX. Ref: ${imageRef.slice(0, 300)}`);

  const outputType = imageResponse.headers.get("content-type") || "image/png";
  const outputBytes = Buffer.from(await imageResponse.arrayBuffer());
  return {
    id: `sticker_${index + 1}`,
    title: `${pose.name} · PuLID-FLUX Fidelity`,
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
    const { image, count = 12, preset = "instantid_conservative" } = req.body as { image?: string; count?: number; preset?: GenerationPreset };
    if (!image) return res.status(400).json({ error: "Chưa có ảnh nguồn." });
    if (preset === "faceid_plus" || preset === "original_face") {
      return res.status(501).json({ error: "Preset này đang ở chế độ thử nghiệm và chưa được kích hoạt an toàn. Hãy dùng một trong 3 preset InstantID trong lúc tích hợp provider được xác minh." });
    }
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
          results[index] = preset === "pulid_flux_fidelity"
            ? await generatePulidFluxFidelity(source, poses[index], index)
            : preset === "pulid_fidelity"
              ? await generatePulidFidelity(source, poses[index], index)
              : await generateOne(source, poses[index], index, preset);
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
