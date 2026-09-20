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
const FACEID_SPACE = "https://multimodalart-ip-adapter-faceid.hf.space";
const PULID_SPACE = "https://yanze-pulid.hf.space";

type GenerationPreset = "instantid_balanced" | "instantid_fidelity" | "instantid_conservative" | "faceid_plus" | "pulid_fidelity" | "original_face";

const INSTANTID_PRESETS = {
  instantid_balanced: { style: "(No style)", steps: 20, identity: 1.1, adapter: 1.1, cfg: 4.5, promptMode: "balanced" },
  instantid_fidelity: { style: "(No style)", steps: 30, identity: 1.35, adapter: 1.25, cfg: 3.5, promptMode: "fidelity" },
  instantid_conservative: { style: "(No style)", steps: 30, identity: 1.45, adapter: 1.35, cfg: 2.5, promptMode: "conservative" },
} as const;



async function generateOne(source: { mimeType: string; data: string }, pose: typeof STICKER_POSES[number], index: number, preset: GenerationPreset) {
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
  const balancedPrompt = `photorealistic messaging sticker, same person and identity, same clothing, ${pose.prompt}, upper body, natural anatomy and hands, clean white background, centered`;
  const fidelityPrompt = `RAW photorealistic portrait photo of the EXACT SAME PERSON from the reference image. Preserve facial identity with highest priority: same facial proportions, face shape, eyes, eyelids, eyebrows, nose, lips, jawline, skin tone, age, hairstyle and hairline. Preserve the EXACT SAME clothing and accessories. Do not beautify or redesign the person. Only change the gesture to: ${pose.prompt}. Natural subtle expression, realistic skin texture, clean white background, no decorations, symbols or writing.`;
  const conservativePrompt = `Unedited RAW photorealistic portrait of the EXACT SAME PERSON in the reference. Treat the reference face as fixed identity, not inspiration. Keep the face nearly unchanged: identical head shape, facial proportions, eye size and spacing, eyelids, eyebrows, nose width and shape, lips and mouth proportions, cheeks, jawline, chin, ears, skin tone, apparent age, hairline and hairstyle. Keep natural pores, skin texture, asymmetry and distinctive facial features. NO beautification. Keep EXACT SAME clothing and accessories. Change ONLY the arm and hand gesture to: ${pose.prompt}. Keep head angle and expression close to reference. Plain white background, no decorations, symbols or writing.`;
  const prompt = cfg.promptMode === "balanced" ? balancedPrompt : cfg.promptMode === "fidelity" ? fidelityPrompt : conservativePrompt;
  const negativePrompt = "different person, identity drift, changed face, face swap, altered facial geometry, enlarged eyes, doll eyes, narrowed jaw, V-shaped jaw, reshaped nose, fuller lips, beauty filter, skin smoothing, glamour retouching, excessive makeup, doll face, cartoon, anime, illustration, 3d render, changed hairstyle, changed clothing, cheek sticker, emoji, decorations, symbols, text, logo, watermark, deformed face, bad hands, extra fingers, extra limbs, blurry, low quality";
async function callPublicGradio(space: string, endpoint: string, data: any[], authHeaders: Record<string,string>) {
  const call = await fetch(`${space}/call/${endpoint}`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  if (!call.ok) throw Object.assign(new Error(`Public Space HTTP ${call.status}: ${(await call.text()).slice(0,500)}`), { status: call.status });
  const info: any = await call.json();
  const result = await fetch(`${space}/call/${endpoint}/${info.event_id}`, { headers: authHeaders });
  if (!result.ok) throw Object.assign(new Error(`Public Space result HTTP ${result.status}`), { status: result.status });
  const text = await result.text();
  const lines = text.split("\n").filter(x => x.startsWith("data: "));
  if (!lines.length) throw new Error(`Public Space returned no image: ${text.slice(-700)}`);
  return JSON.parse(lines[lines.length - 1].slice(6));
}

async function generateExperimentalFaceProvider(source: {mimeType:string;data:string}, pose: typeof STICKER_POSES[number], index:number, preset: GenerationPreset) {
  const hfToken = process.env.HF_TOKEN;
  const authHeaders: Record<string,string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};
  const space = preset === "faceid_plus" ? FACEID_SPACE : PULID_SPACE;
  const upload = new FormData();
  upload.append("files", new Blob([Buffer.from(source.data,"base64")], {type:source.mimeType}), "portrait.jpg");
  const up = await fetch(`${space}/upload`, {method:"POST",headers:authHeaders,body:upload});
  if(!up.ok) throw Object.assign(new Error(`${preset} upload HTTP ${up.status}: ${(await up.text()).slice(0,500)}`),{status:up.status});
  const uj:any=await up.json(); const path=Array.isArray(uj)?uj[0]:uj?.[0]||uj?.path;
  const prompt=`photorealistic exact same person, preserve identity and clothing, ${pose.prompt}, plain white background, no text`;
  const neg="different person, changed face, beauty filter, cartoon, text, watermark, deformed, bad hands";
  // Public Spaces expose different Gradio signatures. Keep provider calls isolated so
  // future endpoint changes never destroy the working InstantID presets.
  const payload = preset === "faceid_plus"
    ? [[{path,meta:{_type:"gradio.FileData"}}], prompt, neg, true, 1.5, 1.2, ""]
    : [{path,meta:{_type:"gradio.FileData"}}, null, null, null, prompt, neg, 1.2, 1, 42+index, 30, 768, 768, 1.2, "fidelity", false];
  const endpoint = preset === "faceid_plus" ? "generate_image" : "run";
  const result:any=await callPublicGradio(space,endpoint,payload,authHeaders);
  const find=(v:any):string|null=>{ if(!v)return null;if(typeof v==="string"&&(v.startsWith("http")||/\\.(png|jpg|jpeg|webp)/i.test(v)))return v;if(Array.isArray(v)){for(const x of v){const r=find(x);if(r)return r;}}else if(typeof v==="object"){if(typeof v.url==="string")return v.url;if(typeof v.path==="string")return v.path;for(const x of Object.values(v)){const r=find(x);if(r)return r;}}return null;};
  const ref=find(result); if(!ref) throw new Error(`${preset} không trả về ảnh.`);
  const marker=ref.indexOf("file="); const raw=marker>=0?ref.slice(marker+5):ref;
  const urls=ref.startsWith("http")?[ref,`${space}/gradio_api/file=${encodeURI(raw)}`]:[`${space}/gradio_api/file=${encodeURI(raw)}`,`${space}/file=${encodeURI(raw)}`];
  let resp:Response|null=null; for(const url of [...new Set(urls)]){const r=await fetch(url,{headers:authHeaders});if(r.ok){resp=r;break;}}
  if(!resp) throw new Error(`${preset}: không tải được ảnh kết quả.`);
  const bytes=Buffer.from(await resp.arrayBuffer()); const type=resp.headers.get("content-type")||"image/png";
  return {id:`sticker_${index+1}`,title:pose.name,imageUrl:`data:${type.split(";")[0]};base64,${bytes.toString("base64")}`,caption:pose.caption};
}

function originalFaceSticker(source:{mimeType:string;data:string}, pose:typeof STICKER_POSES[number], index:number){
  return {id:`sticker_${index+1}`,title:`${pose.name} · Original Face`,imageUrl:`data:${source.mimeType};base64,${source.data}`,caption:pose.caption};
}


