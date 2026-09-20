import { Sticker, ExpressionOption } from "../types";

export const STICKER_EXPRESSIONS: ExpressionOption[] = [
  { id: "1", name: "Cười Thả Ga (Thumbs Up)", prompt: "thumbs up gesture, smiling joyfully, energy", defaultCaption: "OK" },
  { id: "2", name: "Bắn Tim (Mini Heart)", prompt: "finger heart gesture, sweet cute smile", defaultCaption: "Yêu" },
  { id: "3", name: "Chống Cằm (Cute Cheeks)", prompt: "hands resting under chin, sweet expression", defaultCaption: "Hihi" },
  { id: "4", name: "Cool Ngầu (Sunglasses)", prompt: "wearing cool black sunglasses, pointing gesture", defaultCaption: "Cool" },
  { id: "5", name: "Suy Tư (Thinking)", prompt: "hand on chin looking thoughtfully, question mark", defaultCaption: "Hmm..." },
  { id: "6", name: "Ngạc Hân (Shocked)", prompt: "hands on cheeks in delightful shock, wide eyes", defaultCaption: "Ôi!" },
  { id: "7", name: "Thưởng Thức (Coffee)", prompt: "holding smiley coffee cup, relaxed smile", defaultCaption: "Chill" },
  { id: "8", name: "Cười Tít Mắt (Haha)", prompt: "laughing with eyes closed, happy laughter", defaultCaption: "Haha" },
  { id: "9", name: "Chào Sếp (Salute)", prompt: "military salute pose, sunglasses", defaultCaption: "Roài" },
  { id: "10", name: "Hai Tim (Double Hearts)", prompt: "double finger hearts, loving look", defaultCaption: "Muaah" },
  { id: "11", name: "Nhìn Nghiêng (Side Profile)", prompt: "head turned looking back, gentle smile", defaultCaption: "Đẹp" },
  { id: "12", name: "Ôm Tim (Big Heart)", prompt: "holding large red heart, affectionate smile", defaultCaption: "Love" },
  { id: "13", name: "Cố Lên (Fighting)", prompt: "determined fighting pose, fist raised", defaultCaption: "Cố lên" },
  { id: "14", name: "Ngượng Ngùng (Blushing)", prompt: "shy smile, pink cheeks, sparkling sparkles", defaultCaption: "Ái chà" },
  { id: "15", name: "Vẫy Tay (Hello)", prompt: "friendly wave, bright enthusiastic smile", defaultCaption: "Hello" }
];

export async function generateExpressiveStickers(
  sourceImageSrc: string,
  count: number = 12
): Promise<Sticker[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const stickers: Sticker[] = [];
      const expressions = STICKER_EXPRESSIONS.slice(0, count);

      for (let i = 0; i < expressions.length; i++) {
        const exp = expressions[i];
        
        const canvas = document.createElement("canvas");
        const size = 340;
        canvas.width = size;
        canvas.height = size + 48; 
        const ctx = canvas.getContext("2d");

        if (!ctx) continue;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw white die-cut sticker background shape with thick bold outline and soft shadow
        ctx.save();
        ctx.translate(size / 2, size / 2);
        
        const rotation = ((i * 5) % 13) - 6;
        ctx.rotate((rotation * Math.PI) / 180);

        const radius = size / 2 - 32;
        
        // Multi-pass shadow for sticker sticker outline
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        
        for (let s = 0; s < 14; s++) {
          const angle = (s * 2 * Math.PI) / 14;
          const dx = Math.cos(angle) * 14;
          const dy = Math.sin(angle) * 14;
          ctx.beginPath();
          ctx.arc(dx, dy, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        ctx.restore();

        // Solid white border circle
        ctx.beginPath();
        ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#e2e8f0";
        ctx.stroke();

        // Clip circular portrait area
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip();

        // Draw image with distinct crop offsets, zoom and variations per sticker index so they look unique
        const zoomFactor = 1.1 + ((i * 7) % 4) * 0.08; 
        const hRatio = (size * zoomFactor) / img.width;
        const vRatio = (size * zoomFactor) / img.height;
        const ratio = Math.max(hRatio, vRatio);
        
        // Dynamic offset shift per sticker index for facial framing variety
        const shiftXMap = [0, -15, 10, -5, 15, -10, 5, 0, -12, 12, -8, 8, 0, -5, 10];
        const shiftYMap = [-10, 5, -5, 10, -8, 8, -12, 12, 0, -5, 5, -10, 8, -8, 0];
        
        const offsetX = shiftXMap[i % shiftXMap.length];
        const offsetY = shiftYMap[i % shiftYMap.length];

        const centerShiftX = (size - img.width * ratio) / 2 + offsetX;
        const centerShiftY = (size - img.height * ratio) / 2 + offsetY;
        
        // Apply slight distinct tint or contrast per sticker variant
        ctx.save();
        if (i % 4 === 1) {
          ctx.filter = "saturate(1.15) brightness(1.05)";
        } else if (i % 4 === 2) {
          ctx.filter = "contrast(1.1) brightness(1.02)";
        } else if (i % 4 === 3) {
          ctx.filter = "sepia(0.15) saturate(1.1)";
        }

        ctx.drawImage(img, centerShiftX - size/2, centerShiftY - size/2, img.width * ratio, img.height * ratio);
        ctx.restore();

        ctx.restore(); // restore clip & translation

        // Draw distinctive sticker accessories, props, and expression stickers (like heart, cup, sunglasses, sparks)
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        drawAdvancedStickerProps(ctx, i, radius);

        ctx.restore();

        // Draw caption pill at bottom with clean typography
        ctx.save();
        const caption = exp.defaultCaption;
        ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textMetrics = ctx.measureText(caption);
        const pillWidth = textMetrics.width + 40;
        const pillHeight = 38;
        const pillX = size / 2 - pillWidth / 2;
        const pillY = size + 5;

        // Pill shadow
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 19);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#0f172a";
        ctx.fillText(caption, size / 2, pillY + pillHeight / 2);
        ctx.restore();

        stickers.push({
          id: `sticker_${i + 1}`,
          title: exp.name,
          imageUrl: canvas.toDataURL("image/png"),
          caption: exp.defaultCaption,
          rotation: rotation,
        });
      }

      resolve(stickers);
    };

    img.onerror = () => resolve([]);
    img.src = sourceImageSrc;
  });
}

function drawAdvancedStickerProps(ctx: CanvasRenderingContext2D, index: number, radius: number) {
  const r = radius - 10;
  
  switch (index % 15) {
    case 0: // Thumbs up
      drawBadgeBubble(ctx, "👍", r - 15, -r + 15, 46, "#10b981");
      drawSparkles(ctx, -r + 10, -r + 20, "#f59e0b");
      break;
    case 1: // Mini Heart
      drawBadgeBubble(ctx, "🫰", r - 15, -r + 15, 46, "#ef4444");
      drawBadgeBubble(ctx, "💖", -r + 15, r - 15, 38, "#ec4899");
      break;
    case 2: // Cute Cheeks
      drawBadgeBubble(ctx, "🌸", r - 15, -r + 20, 40, "#fb7185");
      drawBadgeBubble(ctx, "✨", -r + 15, -r + 25, 36, "#f59e0b");
      break;
    case 3: // Cool Sunglasses
      drawBadgeBubble(ctx, "😎", r - 15, -r + 15, 46, "#1e293b");
      drawBadgeBubble(ctx, "🔥", -r + 15, r - 15, 38, "#f97316");
      break;
    case 4: // Thinking
      drawBadgeBubble(ctx, "❓", r - 15, -r + 15, 46, "#3b82f6");
      drawBadgeBubble(ctx, "💡", -r + 15, -r + 25, 38, "#eab308");
      break;
    case 5: // Shocked
      drawBadgeBubble(ctx, "😲", r - 15, -r + 15, 46, "#8b5cf6");
      drawSparkles(ctx, -r + 15, -r + 25, "#ef4444");
      break;
    case 6: // Coffee
      drawBadgeBubble(ctx, "☕", r - 15, -r + 15, 46, "#d97706");
      drawBadgeBubble(ctx, "✨", -r + 15, r - 15, 36, "#10b981");
      break;
    case 7: // Haha
      drawBadgeBubble(ctx, "😆", r - 15, -r + 15, 46, "#f59e0b");
      drawTextBadge(ctx, "HA HA", -r + 30, -r + 35, "#ef4444");
      break;
    case 8: // Salute
      drawBadgeBubble(ctx, "🫡", r - 15, -r + 15, 46, "#0ea5e9");
      drawBadgeBubble(ctx, "⭐", -r + 15, r - 15, 36, "#eab308");
      break;
    case 9: // Double Hearts
      drawBadgeBubble(ctx, "💖", r - 15, -r + 15, 40, "#ec4899");
      drawBadgeBubble(ctx, "❤️", -r + 15, -r + 20, 40, "#ef4444");
      break;
    case 10: // Side Profile
      drawBadgeBubble(ctx, "✨", r - 15, -r + 15, 40, "#eab308");
      drawBadgeBubble(ctx, "👍", -r + 15, r - 15, 36, "#10b981");
      break;
    case 11: // Big Heart
      drawBadgeBubble(ctx, "❤️", r - 15, -r + 15, 46, "#ef4444");
      drawBadgeBubble(ctx, "💌", -r + 15, r - 15, 38, "#f43f5e");
      break;
    case 12: // Fighting
      drawBadgeBubble(ctx, "💪", r - 15, -r + 15, 46, "#10b981");
      drawBadgeBubble(ctx, "🔥", -r + 15, -r + 25, 38, "#f97316");
      break;
    case 13: // Blushing
      drawBadgeBubble(ctx, "😳", r - 15, -r + 15, 46, "#f43f5e");
      drawBadgeBubble(ctx, "🌸", -r + 15, r - 15, 36, "#fb7185");
      break;
    case 14: // Hello
      drawBadgeBubble(ctx, "👋", r - 15, -r + 15, 46, "#06b6d4");
      drawBadgeBubble(ctx, "⭐", -r + 15, r - 15, 36, "#f59e0b");
      break;
  }
}

function drawBadgeBubble(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number, borderColor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.2)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = `${size * 0.65}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, y + 1);
  ctx.restore();
}

function drawSparkles(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "24px sans-serif";
  ctx.fillText("✨", x, y);
  ctx.restore();
}

function drawTextBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.save();
  ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
