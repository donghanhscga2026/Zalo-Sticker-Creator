export async function processStickerWithCanvas(
  imgSrc: string,
  options: {
    borderWidth?: number;
    borderColor?: string;
    caption?: string;
    captionBgColor?: string;
    rotation?: number;
    index?: number;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const borderWidth = options.borderWidth !== undefined ? options.borderWidth : 16;
      const borderColor = options.borderColor || "#ffffff";
      const caption = options.caption || "";
      const index = options.index || 0;
      // Give each sticker a slightly unique playful tilt if rotation not explicitly provided
      const rotation = options.rotation !== undefined ? options.rotation : ((index * 3) % 11) - 5;

      const padding = borderWidth + 14;
      const captionHeight = caption ? 36 : 0;
      const width = img.width + padding * 2;
      const height = img.height + padding * 2 + captionHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, (height - captionHeight) / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const drawX = -img.width / 2;
      const drawY = -(height - captionHeight) / 2 + padding;

      // Draw white outline/border using multi-pass offset shadow
      ctx.save();
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = borderWidth;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const angle = (i * 2 * Math.PI) / steps;
        const dx = Math.cos(angle) * borderWidth;
        const dy = Math.sin(angle) * borderWidth;
        ctx.drawImage(img, drawX + dx, drawY + dy, img.width, img.height);
      }
      ctx.restore();

      // Draw original image on top
      ctx.drawImage(img, drawX, drawY, img.width, img.height);

      // Draw unique sticker decorative emoji/badge based on caption or index
      ctx.save();
      const capLower = caption.toLowerCase();
      
      // Helper to draw a cute badge circle with emoji symbol
      const drawBadge = (emoji: string, bx: number, by: number, bgCol = "#ef4444") => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 22, 0, 2 * Math.PI);
        ctx.fillStyle = bgCol;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, bx, by);
        ctx.restore();
      };

      if (capLower.includes("tim") || capLower.includes("yêu") || index % 5 === 1) {
        drawBadge("❤️", img.width / 2 - 10, -img.height / 2 + 20, "#ef4444");
        drawBadge("💖", -img.width / 2 + 10, img.height / 3, "#ec4899");
      } else if (capLower.includes("cười") || capLower.includes("haha") || index % 5 === 0) {
        drawBadge("✨", img.width / 2 - 10, -img.height / 2 + 20, "#f59e0b");
        drawBadge("😆", -img.width / 2 + 15, img.height / 3, "#3b82f6");
      } else if (capLower.includes("buồn") || capLower.includes("khóc") || index % 5 === 2) {
        drawBadge("💧", img.width / 2 - 15, -img.height / 2 + 25, "#0ea5e9");
        drawBadge("🥺", -img.width / 2 + 15, img.height / 3, "#6366f1");
      } else if (capLower.includes("cool") || capLower.includes("ngầu") || index % 5 === 3) {
        drawBadge("😎", img.width / 2 - 15, -img.height / 2 + 20, "#1e293b");
        drawBadge("🔥", -img.width / 2 + 15, img.height / 3, "#f97316");
      } else {
        drawBadge("⭐", img.width / 2 - 15, -img.height / 2 + 20, "#eab308");
        drawBadge("✌️", -img.width / 2 + 15, img.height / 3, "#10b981");
      }

      ctx.restore();
      ctx.restore();

      // Draw caption pill if present
      if (caption) {
        ctx.save();
        ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textMetrics = ctx.measureText(caption);
        const pillWidth = textMetrics.width + 36;
        const pillHeight = 34;
        const pillX = width / 2 - pillWidth / 2;
        const pillY = height - captionHeight - 2;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 17);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.fillText(caption, width / 2, pillY + pillHeight / 2);
        ctx.restore();
      }

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = (err) => reject(err);
    img.src = imgSrc;
  });
}
