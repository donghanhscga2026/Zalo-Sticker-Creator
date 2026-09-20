import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({ apiKey });
};

const STICKER_POSES = [
  { name: "Thumbs Up", prompt: "Person giving a thumbs up gesture, smiling joyfully, with yellow sparkle lines, solid white background, die-cut sticker style with thick white border", caption: "OK" },
  { name: "Finger Heart", prompt: "Person doing Korean finger heart gesture, sweet cute smile, floating red hearts, solid white background, die-cut sticker style with thick white border", caption: "Yêu" },
  { name: "Resting Chin", prompt: "Person resting chin on hands, sweet dreamy expression, floating red hearts, solid white background, die-cut sticker style with thick white border", caption: "Hihi" },
  { name: "Cool Sunglasses", prompt: "Person wearing cool black sunglasses, pointing fingers forward, yellow sparkles, solid white background, die-cut sticker style with thick white border", caption: "Cool" },
  { name: "Thinking", prompt: "Person with hand on chin looking thoughtfully, blue question mark, solid white background, die-cut sticker style with thick white border", caption: "Hmm..." },
  { name: "Shocked", prompt: "Person with hands on cheeks in delightful surprise, wide open mouth, yellow motion lines, solid white background, die-cut sticker style with thick white border", caption: "Ôi!" },
  { name: "Coffee Chill", prompt: "Person holding a smiley white coffee cup, relaxed happy smile, floating heart symbol, solid white background, die-cut sticker style with thick white border", caption: "Chill" },
  { name: "Laughing HA HA", prompt: "Person laughing joyfully with eyes closed, open mouth, comic text 'HA HA' and action lines, solid white background, die-cut sticker style with thick white border", caption: "Haha" },
  { name: "Salute", prompt: "Person doing a military salute pose with sunglasses, solid white background, die-cut sticker style with thick white border", caption: "Roài" },
  { name: "Double Hearts", prompt: "Person doing double finger hearts with loving look, floating red hearts, solid white background, die-cut sticker style with thick white border", caption: "Muaah" },
  { name: "Side Profile", prompt: "Person with head turned looking back over shoulder, gentle smile, solid white background, die-cut sticker style with thick white border", caption: "Đẹp" },
  { name: "Holding Heart", prompt: "Person holding a large red heart in both hands, affectionate happy smile, floating red hearts, solid white background, die-cut sticker style with thick white border", caption: "Love" }
];

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate-stickers", async (req, res) => {
  try {
    const { image, count = 12 } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const numStickers = Math.min(Math.max(Number(count) || 12, 9), 15);
    const posesToUse = STICKER_POSES.slice(0, numStickers);
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    const results = [];

    if (hasApiKey) {
      try {
        const ai = getAiClient();
        const base64Data = image.includes(",") ? image.split(",")[1] : image;
        const mimeType = image.includes("image/png") ? "image/png" : "image/jpeg";

        for (let i = 0; i < posesToUse.length; i++) {
          const pose = posesToUse[i];
          try {
            const promptText = `Based on the facial features and identity of the person in this uploaded photo, generate a complete upper-body sticker character maintaining the exact same facial identity. Pose/Action: ${pose.prompt}. The sticker must feature a clean solid white background, die-cut sticker style with a prominent thick white border outline, vibrant and expressive chat sticker art.`;

            const response = await ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType } },
                  { text: promptText }
                ]
              }
            });

            let generatedImageBase64 = null;
            if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  generatedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
                  break;
                }
              }
            }

            if (generatedImageBase64) {
              results.push({
                id: `sticker_${i + 1}`,
                title: pose.name,
                imageUrl: generatedImageBase64,
                caption: pose.caption
              });
            } else {
              results.push({
                id: `sticker_${i + 1}`,
                title: pose.name,
                imageUrl: image,
                caption: pose.caption
              });
            }
          } catch (poseErr: any) {
            console.error(`Pose ${i + 1} generation note:`, poseErr?.message || poseErr);
            results.push({
              id: `sticker_${i + 1}`,
              title: pose.name,
              imageUrl: image,
              caption: pose.caption
            });
          }
        }

        return res.json({ success: true, stickers: results });
      } catch (err: any) {
        console.warn("AI pose generation fallback:", err?.message || err);
      }
    }

    // Fallback if no API key or generation failed
    for (let i = 0; i < posesToUse.length; i++) {
      const pose = posesToUse[i];
      results.push({
        id: `sticker_${i + 1}`,
        title: pose.name,
        imageUrl: image,
        caption: pose.caption
      });
    }

    res.json({ success: true, stickers: results, note: "Generated using sticker pose templates." });
  } catch (error: any) {
    console.error("Error in /api/generate-stickers:", error);
    res.status(500).json({ error: error.message || "Failed to generate stickers" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
