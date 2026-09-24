import React, { useState } from "react";
import { Upload, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";
import { GenerationPresetId } from "../types";

interface PhotoUploaderProps {
  onGenerate: (image: string, count: number, packName: string, preset: string) => void;
  onCompare: (image: string, packName: string, poseIndex: number, presets: GenerationPresetId[]) => void;
  isLoading: boolean;
}

const COMPARE_PRESETS: { id: GenerationPresetId; label: string }[] = [
  { id: "instantid_balanced", label: "InstantID — Cân bằng" },
  { id: "instantid_fidelity", label: "InstantID — Giữ mặt cao" },
  { id: "instantid_conservative", label: "InstantID — Bảo thủ / giữ mặt tối đa" },
  { id: "pulid_fidelity", label: "PuLID SDXL Fidelity" },
  { id: "pulid_flux_fidelity", label: "PuLID-FLUX v0.9.1 / Krea" },
];

const TEST_POSES = [
  "Thumbs Up / OK",
  "Finger Heart / Yêu",
  "Cute Cheeks / Hihi",
  "Cool / Sunglasses",
  "Thinking / Hmm",
  "Surprised / Ôi",
  "Coffee / Chill",
  "Laughing / Haha",
  "Salute / Roài",
  "Double Hearts / Muaah",
  "Look Back / Đẹp",
  "Big Heart / Love",
  "Fighting / Cố lên",
  "Shy / Ái chà",
  "Hello / Vẫy tay",
];

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onGenerate, onCompare, isLoading }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stickerCount, setStickerCount] = useState<number>(12);
  const [packName, setPackName] = useState<string>("Bộ Sticker Đáng Yêu");
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [generationPreset, setGenerationPreset] = useState<string>("pulid_flux_fidelity");
  const [mode, setMode] = useState<"generate" | "compare">("compare");
  const [poseIndex, setPoseIndex] = useState<number>(0);
  const [comparePresets, setComparePresets] = useState<GenerationPresetId[]>(COMPARE_PRESETS.map((item) => item.id));
  const [error, setError] = useState<string | null>(null);

  const readImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng tải lên tệp hình ảnh hợp lệ (PNG, JPG, WEBP)");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => setSelectedImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => readImage(e.target.files?.[0]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    readImage(e.dataTransfer.files?.[0]);
  };

  const toggleComparePreset = (preset: GenerationPresetId) => {
    setComparePresets((current) =>
      current.includes(preset) ? current.filter((item) => item !== preset) : [...current, preset]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      setError("Vui lòng tải lên ảnh cá nhân của bạn trước");
      return;
    }

    if (mode === "compare") {
      if (!comparePresets.length) {
        setError("Hãy chọn ít nhất 1 preset để so sánh.");
        return;
      }
      onCompare(selectedImage, packName || "Bộ Sticker Của Tôi", poseIndex, comparePresets);
      return;
    }

    onGenerate(selectedImage, stickerCount, packName || "Bộ Sticker Của Tôi", generationPreset);
  };

  const handleUseDemo = () => {
    setSelectedImage("https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop");
    setPackName("Cô Gái Dễ Thương");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zalo Sticker Creator · Compare Lab</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          So sánh AI trước khi tạo cả bộ sticker
        </h2>
        <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto">
          Dùng cùng một ảnh gốc và cùng một pose để nhìn trực tiếp preset nào giữ khuôn mặt tốt nhất.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode("compare")}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${mode === "compare" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
          >
            So sánh preset
          </button>
          <button
            type="button"
            onClick={() => setMode("generate")}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${mode === "generate" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
          >
            Tạo sticker
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Tên bộ sticker</label>
          <input
            type="text"
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            placeholder="Ví dụ: Bộ Sticker Của Tôi"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 text-sm outline-none"
            required
          />
        </div>

        {mode === "compare" ? (
          <div className="space-y-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Pose dùng để test đồng loạt</label>
              <select
                value={poseIndex}
                onChange={(e) => setPoseIndex(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                {TEST_POSES.map((pose, index) => (
                  <option key={pose} value={index}>{index + 1}. {pose}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <label className="text-sm font-semibold text-slate-700">Preset sẽ chạy</label>
                <span className="text-xs font-semibold text-blue-700">{comparePresets.length}/{COMPARE_PRESETS.length} preset</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {COMPARE_PRESETS.map((preset) => (
                  <label key={preset.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comparePresets.includes(preset.id)}
                      onChange={() => toggleComparePreset(preset.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-700">{preset.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Hệ thống chạy tuần tự để giảm rate limit/ZeroGPU. Một preset lỗi sẽ không làm mất kết quả của các preset khác.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">AI engine / preset</label>
              <select
                value={generationPreset}
                onChange={(e) => setGenerationPreset(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm"
              >
                <option value="pulid_flux_fidelity">PuLID-FLUX — Giữ mặt / đổi pose</option>
                <option value="instantid_balanced">InstantID — Cân bằng</option>
                <option value="instantid_fidelity">InstantID — Giữ mặt cao</option>
                <option value="instantid_conservative">InstantID — Bảo thủ / giữ mặt tối đa</option>
                <option value="faceid_plus">IP-Adapter FaceID Plus — thử nghiệm</option>
                <option value="pulid_fidelity">PuLID SDXL Fidelity</option>
                <option value="original_face">Giữ mặt gốc — chưa kích hoạt</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">Số lượng sticker ({stickerCount} ảnh)</label>
                <span className="text-xs text-slate-500">9–15</span>
              </div>
              <input
                type="range"
                min="9"
                max="15"
                step="1"
                value={stickerCount}
                onChange={(e) => setStickerCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ảnh chân dung gốc</label>
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
                <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md border-4 border-white bg-white">
                  <img src={selectedImage} alt="Ảnh gốc" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
                    <Check className="w-4 h-4" />
                    <span>Ảnh gốc đã sẵn sàng</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {mode === "compare"
                      ? `Sẽ tạo ${comparePresets.length} phiên bản từ cùng ảnh và cùng pose để so sánh.`
                      : `Sẵn sàng tạo sticker bằng preset đã chọn.`}
                  </p>
                  <label className="inline-block mt-2 cursor-pointer text-xs font-medium text-blue-600 underline">
                    Tải ảnh khác
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Kéo thả ảnh vào đây, hoặc{" "}
                    <label className="text-blue-600 cursor-pointer underline">
                      chọn tệp
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP · nên dùng ảnh rõ mặt.</p>
                </div>
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="text-xs font-medium text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  Dùng ảnh mẫu để thử
                </button>
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
          disabled={isLoading || !selectedImage || (mode === "compare" && !comparePresets.length)}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
            isLoading || !selectedImage || (mode === "compare" && !comparePresets.length)
              ? "bg-slate-300 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{mode === "compare" ? "Đang chạy lần lượt các preset..." : "Đang tạo sticker..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{mode === "compare" ? `So sánh ${comparePresets.length} preset ngay` : `Bắt đầu tạo ${stickerCount} sticker`}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
