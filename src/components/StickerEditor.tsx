import React, { useState } from "react";
import { Sticker, StickerPack } from "../types";
import { processStickerWithCanvas } from "../lib/canvasUtils";
import { Download, Save, Share2, Sparkles, Check, Edit3, Trash2, ArrowLeft, MessageCircle, Copy, FileArchive } from "lucide-react";
import JSZip from "jszip";

interface StickerEditorProps {
  packName: string;
  initialStickers: Sticker[];
  onBack: () => void;
  onSavePack: (pack: StickerPack) => void;
  onOpenZaloGuide: () => void;
}

export const StickerEditor: React.FC<StickerEditorProps> = ({
  packName,
  initialStickers,
  onBack,
  onSavePack,
  onOpenZaloGuide,
}) => {
  const [stickers, setStickers] = useState<Sticker[]>(initialStickers);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(initialStickers[0]?.id || null);
  const [globalBorderWidth, setGlobalBorderWidth] = useState<number>(14);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedSticker = stickers.find((s) => s.id === selectedStickerId) || stickers[0];

  const handleUpdateCaption = (id: string, caption: string) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, caption } : s))
    );
  };

  const handleUpdateBorderWidth = (width: number) => {
    setGlobalBorderWidth(width);
  };

  const handleSaveToLibrary = () => {
    setIsSaving(true);
    const newPack: StickerPack = {
      id: `pack_${Date.now()}`,
      name: packName,
      createdAt: new Date().toLocaleDateString("vi-VN"),
      stickers: stickers,
      thumbnailUrl: stickers[0]?.imageUrl || "",
    };
    onSavePack(newPack);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  // Download single sticker as PNG with white border & caption processed via canvas
  const handleDownloadSingle = async (sticker: Sticker) => {
    try {
      const stickerIdx = stickers.findIndex((s) => s.id === sticker.id);
      const processedUrl = await processStickerWithCanvas(sticker.imageUrl, {
        borderWidth: globalBorderWidth,
        caption: sticker.caption,
        index: stickerIdx >= 0 ? stickerIdx : 0,
      });
      const link = document.createElement("a");
      link.href = processedUrl;
      link.download = `${packName}_${sticker.caption || sticker.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading sticker:", err);
    }
  };

  // Download all stickers as a ZIP archive
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(packName.replace(/\s+/g, "_")) || zip;

      for (let i = 0; i < stickers.length; i++) {
        const sticker = stickers[i];
        const processedUrl = await processStickerWithCanvas(sticker.imageUrl, {
          borderWidth: globalBorderWidth,
          caption: sticker.caption,
          index: i,
        });
        const base64Data = processedUrl.split(",")[1];
        folder.file(`sticker_${i + 1}_${sticker.caption || "zalo"}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${packName.replace(/\s+/g, "_")}_ZaloStickers.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating zip:", err);
    } finally {
      setIsZipping(false);
    }
  };

  // Copy sticker image to clipboard
  const handleCopyToClipboard = async (sticker: Sticker) => {
    try {
      const stickerIdx = stickers.findIndex((s) => s.id === sticker.id);
      const processedUrl = await processStickerWithCanvas(sticker.imageUrl, {
        borderWidth: globalBorderWidth,
        caption: sticker.caption,
        index: stickerIdx >= 0 ? stickerIdx : 0,
      });
      const res = await fetch(processedUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
      setCopiedId(sticker.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {packName}
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                {stickers.length} Sticker
              </span>
            </h2>
            <p className="text-sm text-slate-500">
              Đã tách nền và bo viền trắng chuẩn Zalo. Chỉnh sửa chữ và tải về ngay!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSaveToLibrary}
            disabled={isSaving}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              savedSuccess
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Đã lưu vào thư viện!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-blue-600" />
                <span>Lưu bộ sưu tập</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
          >
            <FileArchive className="w-4 h-4" />
            <span>{isZipping ? "Đang nén ZIP..." : "Tải trọn bộ (ZIP)"}</span>
          </button>

          <button
            onClick={onOpenZaloGuide}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Cách đưa lên Zalo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Center: Sticker Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">
                Danh sách Sticker trong bộ ({stickers.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Độ dày viền trắng:</span>
                <input
                  type="range"
                  min="8"
                  max="28"
                  value={globalBorderWidth}
                  onChange={(e) => handleUpdateBorderWidth(Number(e.target.value))}
                  className="w-24 h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-blue-600 w-6">{globalBorderWidth}px</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {stickers.map((sticker, index) => {
                const isSelected = sticker.id === selectedStickerId;
                const badges = ["😆", "❤️", "😉", "💧", "👍", "😲", "💋", "💤", "💢", "✨", "😊", "😎", "💪", "🤦", "👋"];
                const badge = badges[index % badges.length];
                return (
                  <div
                    key={sticker.id}
                    onClick={() => setSelectedStickerId(sticker.id)}
                    className={`relative group rounded-2xl p-3 border-2 transition-all cursor-pointer flex flex-col items-center justify-between bg-slate-50/50 hover:bg-slate-100/80 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/10"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-full aspect-square relative flex items-center justify-center p-2">
                      {/* Preview with white die-cut border simulation */}
                      <div
                        className="relative rounded-xl overflow-hidden flex items-center justify-center max-h-full max-w-full"
                        style={{
                          filter: `drop-shadow(0 0 ${globalBorderWidth / 2}px white) drop-shadow(0 0 ${globalBorderWidth}px white)`
                        }}
                      >
                        <img
                          src={sticker.imageUrl}
                          alt={sticker.title}
                          className="max-h-28 max-w-28 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {/* Unique expression badge overlay */}
                      <span className="absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center text-sm border border-slate-200">
                        {badge}
                      </span>
                    </div>

                    <div className="w-full mt-2 text-center">
                      <span className="text-xs font-bold text-slate-700 truncate block px-1 bg-white/80 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                        {sticker.caption || sticker.title}
                      </span>
                    </div>

                    {/* Quick Action Overlay */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(sticker);
                        }}
                        className="w-7 h-7 bg-white text-slate-700 rounded-full shadow-md flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                        title="Tải ảnh PNG"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Selected Sticker Inspector & Customizer */}
        <div className="space-y-6">
          {selectedSticker && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-100 sticky top-24">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Chỉnh Sửa Sticker</span>
              </h3>

              {/* Big Preview */}
              <div className="w-full aspect-square bg-slate-900/5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-6 mb-4 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                <div
                  className="transition-all duration-300 relative flex flex-col items-center"
                  style={{
                    filter: `drop-shadow(0 0 ${globalBorderWidth / 2}px white) drop-shadow(0 0 ${globalBorderWidth}px white) drop-shadow(0 4px 12px rgba(0,0,0,0.1))`
                  }}
                >
                  <img
                    src={selectedSticker.imageUrl}
                    alt={selectedSticker.title}
                    className="max-h-48 max-w-48 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  {selectedSticker.caption && (
                    <div className="mt-2 bg-white/95 text-slate-900 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 shadow-md">
                      {selectedSticker.caption}
                    </div>
                  )}
                </div>
              </div>

              {/* Caption Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Chữ Sticker (Caption)
                  </label>
                  <input
                    type="text"
                    value={selectedSticker.caption || ""}
                    onChange={(e) => handleUpdateCaption(selectedSticker.id, e.target.value)}
                    placeholder="Ví dụ: Haha, OK, Yêu..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Quick preset captions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Gợi ý nhanh
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Haha", "OK", "Yêu", "Dạ", "Ghê vại", "Buồn", "Tuyệt", "Thanks", "Hihi", "Good!"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleUpdateCaption(selectedSticker.id, preset)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium border border-slate-200 transition-all"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <button
                    onClick={() => handleDownloadSingle(selectedSticker)}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Sticker Này (PNG)</span>
                  </button>

                  <button
                    onClick={() => handleCopyToClipboard(selectedSticker)}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center space-x-2 transition-all text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedId === selectedSticker.id ? "Đã sao chép ảnh!" : "Sao chép ảnh vào Clipboard"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
