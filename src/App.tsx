import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { PhotoUploader } from "./components/PhotoUploader";
import { StickerEditor } from "./components/StickerEditor";
import { CompareResults } from "./components/CompareResults";
import { LibraryModal } from "./components/LibraryModal";
import { ZaloGuideModal } from "./components/ZaloGuideModal";
import { CompareResponse, GenerationPresetId, Sticker, StickerPack } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"create" | "editor" | "compare" | "library">("create");
  const [savedPacks, setSavedPacks] = useState<StickerPack[]>([]);
  const [currentStickers, setCurrentStickers] = useState<Sticker[]>([]);
  const [currentPackName, setCurrentPackName] = useState<string>("Bộ Sticker Cá Nhân");
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showZaloGuide, setShowZaloGuide] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("zalo_sticker_packs");
      if (stored) setSavedPacks(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load saved packs:", e);
    }
  }, []);

  const handleSavePack = (newPack: StickerPack) => {
    setSavedPacks((prev) => {
      const updated = [newPack, ...prev.filter((p) => p.id !== newPack.id)];
      try {
        localStorage.setItem("zalo_sticker_packs", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save packs:", e);
      }
      return updated;
    });
  };

  const handleDeletePack = (packId: string) => {
    setSavedPacks((prev) => {
      const updated = prev.filter((p) => p.id !== packId);
      try {
        localStorage.setItem("zalo_sticker_packs", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to delete pack:", e);
      }
      return updated;
    });
  };

  const readApiResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? response.json() : { error: await response.text() };
  };

  const handleGenerateStickers = async (image: string, count: number, packName: string, preset: string) => {
    setIsLoading(true);
    setCurrentPackName(packName);
    try {
      const response = await fetch("/api/generate-stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, count, preset }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data?.error || `Không thể tạo sticker bằng AI (HTTP ${response.status})`);

      const stickers = data?.stickers as Sticker[] | undefined;
      if (!stickers?.length) throw new Error("AI không trả về sticker nào");

      setCurrentStickers(stickers);
      setActiveTab("editor");
    } catch (err) {
      console.error("Error generating stickers:", err);
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo sticker. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComparePresets = async (
    image: string,
    packName: string,
    poseIndex: number,
    presets: GenerationPresetId[],
  ) => {
    setIsLoading(true);
    setCurrentPackName(packName);
    try {
      const response = await fetch("/api/compare-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, poseIndex, presets }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data?.error || `Không thể chạy Compare Lab (HTTP ${response.status})`);

      setCompareData(data as CompareResponse);
      setActiveTab("compare");
    } catch (err) {
      console.error("Error comparing presets:", err);
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi so sánh preset.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPackFromLibrary = (pack: StickerPack) => {
    setCurrentPackName(pack.name);
    setCurrentStickers(pack.stickers);
    setActiveTab("editor");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      <Navbar
        activeTab={activeTab === "editor" || activeTab === "compare" ? "create" : activeTab}
        setActiveTab={(tab) => {
          if (tab === "create") setActiveTab("create");
          else if (tab === "library") setActiveTab("library");
        }}
        onOpenZaloGuide={() => setShowZaloGuide(true)}
        savedPacksCount={savedPacks.length}
      />
      <main className="pb-16">
        {activeTab === "create" && (
          <PhotoUploader
            onGenerate={handleGenerateStickers}
            onCompare={handleComparePresets}
            isLoading={isLoading}
          />
        )}
        {activeTab === "compare" && compareData && (
          <CompareResults
            packName={currentPackName}
            data={compareData}
            onBack={() => setActiveTab("create")}
          />
        )}
        {activeTab === "editor" && (
          <StickerEditor
            packName={currentPackName}
            initialStickers={currentStickers}
            onBack={() => setActiveTab("create")}
            onSavePack={handleSavePack}
            onOpenZaloGuide={() => setShowZaloGuide(true)}
          />
        )}
        {activeTab === "library" && (
          <LibraryModal
            savedPacks={savedPacks}
            onSelectPack={handleSelectPackFromLibrary}
            onDeletePack={handleDeletePack}
            onClose={() => setActiveTab("create")}
          />
        )}
      </main>
      {showZaloGuide && <ZaloGuideModal onClose={() => setShowZaloGuide(false)} />}
    </div>
  );
}
