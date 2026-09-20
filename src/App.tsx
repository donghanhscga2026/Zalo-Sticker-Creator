import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { PhotoUploader } from "./components/PhotoUploader";
import { StickerEditor } from "./components/StickerEditor";
import { LibraryModal } from "./components/LibraryModal";
import { ZaloGuideModal } from "./components/ZaloGuideModal";
import { Sticker, StickerPack } from "./types";
import { generateExpressiveStickers } from "./lib/stickerGenerator";

export default function App() {
  const [activeTab, setActiveTab] = useState<"create" | "editor" | "library">("create");
  const [savedPacks, setSavedPacks] = useState<StickerPack[]>([]);
  const [currentStickers, setCurrentStickers] = useState<Sticker[]>([]);
  const [currentPackName, setCurrentPackName] = useState<string>("Bộ Sticker Cá Nhân");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showZaloGuide, setShowZaloGuide] = useState<boolean>(false);

  // Load saved packs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("zalo_sticker_packs");
      if (stored) {
        setSavedPacks(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved packs:", e);
    }
  }, []);

  // Save packs to localStorage
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

  const handleGenerateStickers = async (image: string, count: number, packName: string) => {
    setIsLoading(true);
    setCurrentPackName(packName);
    try {
      // Generate instantly and reliably on client-side canvas
      const stickers = await generateExpressiveStickers(image, count);
      if (stickers && stickers.length > 0) {
        setCurrentStickers(stickers);
        setActiveTab("editor");
      } else {
        throw new Error("Không thể tạo sticker");
      }
    } catch (err) {
      console.error("Error generating stickers:", err);
      alert("Có lỗi xảy ra khi tạo sticker. Vui lòng thử lại.");
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
        activeTab={activeTab === "editor" ? "create" : activeTab}
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
            isLoading={isLoading}
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

      {showZaloGuide && (
        <ZaloGuideModal onClose={() => setShowZaloGuide(false)} />
      )}
    </div>
  );
}
