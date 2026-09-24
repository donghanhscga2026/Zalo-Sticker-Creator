import React, { useState } from "react";
import { Upload, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";

interface PhotoUploaderProps {
  onGenerate: (image: string, count: number, packName: string, style: string) => void;
  isLoading: boolean;
}

const COUNT_OPTIONS = [9, 12, 15];
const STYLE_OPTIONS = [
  { id: "photo_real", label: "Ảnh thật", description: "Ưu tiên giữ khuôn mặt và chất ảnh tự nhiên." },
  { id: "cute_soft", label: "Cute nhẹ", description: "Dễ thương hơn nhưng vẫn giữ nhận diện khuôn mặt." },
  { id: "sticker_clean", label: "Sticker rõ nét", description: "Bố cục sạch, viền chủ thể rõ, hợp dùng làm sticker." },
];

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onGenerate, isLoading }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stickerCount, setStickerCount] = useState<number>(12);
  const [packName, setPackName] = useState<string>("Bộ Sticker Của Tôi");
  const [style, setStyle] = useState<string>("photo_real");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng tải lên ảnh PNG, JPG hoặc WEBP.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => setSelectedImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedImage) {
      setError("Hãy tải lên một ảnh chân dung trước.");
      return;
    }
    onGenerate(selectedImage, stickerCount, packName.trim() || "Bộ Sticker Của Tôi", style);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zalo Sticker Creator Lite</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Một ảnh gốc → cả bộ sticker
        </h2>
        <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto">
          Tải ảnh chân dung, chọn số lượng và phong cách. Hệ thống sẽ tạo lần lượt các biểu cảm và giữ lại từng ảnh đã hoàn thành.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Tên bộ sticker</label>
          <input
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Ví dụ: Bộ Sticker Của Tôi"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Số lượng sticker</label>
          <div className="grid grid-cols-3 gap-3">
            {COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setStickerCount(count)}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                  stickerCount === count ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {count} ảnh
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Phong cách</label>
          <div className="grid sm:grid-cols-3 gap-3">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStyle(option.id)}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  style === option.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="font-bold text-sm text-slate-900">{option.label}</div>
                <div className="mt-1 text-xs text-slate-500">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ảnh chân dung gốc</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); readImage(e.dataTransfer.files?.[0]); }}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
              dragOver ? "border-blue-500 bg-blue-50" : selectedImage ? "border-emerald-300 bg-emerald-50/30" : "border-slate-300 bg-slate-50/50"
            }`}
          >
            {selectedImage ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <img src={selectedImage} alt="Ảnh gốc" className="w-40 h-40 object-cover rounded-2xl border-4 border-white shadow-md" />
                <div className="text-left">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                    <Check className="w-4 h-4" /> Ảnh đã sẵn sàng
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Nên dùng ảnh rõ mặt, ánh sáng tốt, không che mắt hoặc khuôn mặt.</p>
                  <label className="inline-block mt-3 text-sm text-blue-600 underline cursor-pointer">
                    Chọn ảnh khác
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Kéo thả ảnh vào đây hoặc{" "}
                  <label className="text-blue-600 underline cursor-pointer">
                    chọn tệp
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0])} />
                  </label>
                </p>
                <p className="text-xs text-slate-500">PNG, JPG, WEBP · ưu tiên ảnh chân dung rõ nét.</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !selectedImage}
          className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 disabled:from-slate-300 disabled:to-slate-300 shadow-lg flex items-center justify-center gap-2"
        >
          {isLoading ? <><RefreshCw className="w-5 h-5 animate-spin" /> Đang tạo sticker...</> : <><Sparkles className="w-5 h-5" /> Tạo {stickerCount} sticker</>}
        </button>
      </form>
    </div>
  );
};
