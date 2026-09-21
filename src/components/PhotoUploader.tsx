import React, { useState } from "react";
import { Upload, Sparkles, Image as ImageIcon, Check, Sliders, AlertCircle, RefreshCw } from "lucide-react";

interface PhotoUploaderProps {
  onGenerate: (image: string, count: number, packName: string, preset: string) => void;
  isLoading: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onGenerate, isLoading }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stickerCount, setStickerCount] = useState<number>(12);
  const [packName, setPackName] = useState<string>("Bộ Sticker Đáng Yêu");
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [generationPreset, setGenerationPreset] = useState<string>("instantid_conservative");
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng tải lên tệp hình ảnh hợp lệ (PNG, JPG)");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng tải lên tệp hình ảnh hợp lệ (PNG, JPG)");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      setError("Vui lòng tải lên ảnh cá nhân của bạn trước");
      return;
    }
    onGenerate(selectedImage, stickerCount, packName || "Bộ Sticker Của Tôi", generationPreset);
  };

  // Sample preset demo images if user wants to test quickly
  const handleUseDemo = () => {
    setSelectedImage("https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop");
    setPackName("Cô Gái Dễ Thương");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tạo sticker tùy chỉnh cho Zalo & Facebook</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Tạo Bộ Sticker Tách Nền Viền Trắng
        </h2>
        <p className="mt-3 text-base text-slate-600 max-w-xl mx-auto">
          Tải ảnh cá nhân của bạn lên, hệ thống sẽ tự động tách nền, tạo các biểu cảm phong phú và bo viền trắng chuẩn sticker Zalo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* Pack Name & Count Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tên bộ sticker
            </label>
            <input
              type="text"
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
              placeholder="Ví dụ: Bé Meo Đáng Yêu"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 text-sm outline-none transition-all"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">
                Số lượng sticker ({stickerCount} ảnh)
              </label>
              <span className="text-xs text-slate-500 font-medium">Khoảng 9 đến 15 ảnh</span>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="9"
                max="15"
                step="1"
                value={stickerCount}
                onChange={(e) => setStickerCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="w-10 text-center font-bold text-blue-600 bg-blue-50 py-1.5 rounded-lg border border-blue-100">
                {stickerCount}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Chế độ giữ khuôn mặt / AI engine</label>
          <select value={generationPreset} onChange={(e) => setGenerationPreset(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm">
            <option value="instantid_balanced">InstantID — Cân bằng (bản test trước)</option>
            <option value="instantid_fidelity">InstantID — Giữ mặt cao</option>
            <option value="instantid_conservative">InstantID — Bảo thủ / giữ mặt tối đa</option>
            <option value="faceid_plus">IP-Adapter FaceID Plus — thử nghiệm</option>
            <option value="pulid_fidelity">PuLID Fidelity — thử nghiệm</option>
            <option value="original_face">Giữ mặt gốc — không sinh lại khuôn mặt</option>
          </select>
          <p className="mt-2 text-xs text-slate-500">Các cấu hình cũ được giữ lại để so sánh. FaceID/PuLID dùng ZeroGPU công cộng nên có thể phải chờ hoặc hết quota.</p>
        </div>

        {/* Upload Area */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Ảnh chân dung cá nhân của bạn
          </label>
          
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all relative overflow-hidden group ${
              dragOver
                ? "border-blue-500 bg-blue-50/50"
                : selectedImage
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
            }`}
          >
            {selectedImage ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-md border-4 border-white">
                  <img
                    src={selectedImage}
                    alt="Uploaded preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-md">Thay đổi</span>
                  </div>
                </div>
                <div className="text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
                    <Check className="w-4 h-4" />
                    <span>Đã tải lên ảnh thành công</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sẵn sàng tạo {stickerCount} sticker biểu cảm độc đáo với viền trắng nổi bật.
                  </p>
                  <label className="inline-block mt-2 cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 underline">
                    Tải ảnh khác lên
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Kéo và thả ảnh của bạn vào đây, hoặc{" "}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                      chọn tệp
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ định dạng PNG, JPG, WEBP (Khuyên dùng ảnh chân dung rõ mặt)
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleUseDemo}
                    className="text-xs font-medium text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    Hoặc dùng ảnh mẫu có sẵn để thử ngay
                  </button>
                </div>
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !selectedImage}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all ${
            isLoading || !selectedImage
              ? "bg-slate-300 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Đang tách nền & tạo bộ {stickerCount} sticker... (Vui lòng đợi)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Bắt Đầu Tạo {stickerCount} Sticker Ngay</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
