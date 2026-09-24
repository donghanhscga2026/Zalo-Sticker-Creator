import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { PhotoUploader } from "./components/PhotoUploader";
import { StickerEditor } from "./components/StickerEditor";
import { CompareResults } from "./components/CompareResults";
import { LibraryModal } from "./components/LibraryModal";
import { ZaloGuideModal } from "./components/ZaloGuideModal";
import { CompareResponse, GenerationPresetId, Sticker, StickerPack } from "./types";
import { draftStorage, GenerationDraft } from "./lib/generationDraft";

export default function App() {
  const [activeTab, setActiveTab] = useState<"create" | "editor" | "compare" | "library">("create");
  const [savedPacks, setSavedPacks] = useState<StickerPack[]>([]);
  const [currentStickers, setCurrentStickers] = useState<Sticker[]>([]);
  const [currentPackName, setCurrentPackName] = useState<string>("Bộ Sticker Cá Nhân");
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showZaloGuide, setShowZaloGuide] = useState<boolean>(false);
  const [draft, setDraft] = useState<GenerationDraft | null>(null);
  const [generationMessage, setGenerationMessage] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    draftStorage().then(saved => { if (saved) { setDraft(saved); setCurrentStickers(saved.stickers); setCurrentPackName(saved.packName); } })
      .catch(() => setGenerationMessage("Không đọc được bản đang tạo từ trình duyệt."))
      .finally(() => setDraftReady(true));
  }, []);

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
    await runDraft({ image, count, packName, preset, stickers: [], completed: [] });
  };

  const runDraft = async (initial: GenerationDraft) => {
    if (isLoading) return;
    setIsLoading(true);
    setCurrentPackName(initial.packName);
    let next = { ...initial, stickers: [...initial.stickers], completed: [...initial.completed] };
    setDraft(next);
    setCurrentStickers(next.stickers);
    try {
      await draftStorage(next);
      for (let index = 0; index < next.count; index++) {
      if (next.completed.includes(index)) continue;
      setGenerationMessage(`Đang tạo ảnh ${index + 1}/${next.count}. Đã lưu ${next.stickers.length} ảnh.`);
      const response = await fetch("/api/generate-stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: next.image, count: next.count, preset: next.preset, poseIndices: [index] }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data?.error || `Không thể tạo sticker bằng AI (HTTP ${response.status})`);

      const stickers = data?.stickers as Sticker[] | undefined;
      if (!stickers?.length) throw new Error("AI không trả về sticker nào");

      next = { ...next, stickers: [...next.stickers, ...stickers], completed: [...next.completed, index] };
      setDraft(next);
      setCurrentStickers(next.stickers);
      try { await draftStorage(next); }
      catch { throw new Error("Trình duyệt không lưu được ảnh. Ảnh hiện vẫn có trên màn hình; hãy mở và tải ảnh trước khi đóng trang."); }
      }
      setGenerationMessage(`Hoàn tất ${next.stickers.length}/${next.count} ảnh. Bản đang tạo đã được lưu trong trình duyệt.`);
    } catch (err) {
      setGenerationMessage(err instanceof Error ? err.message : "Đã tạm dừng. Các ảnh đã tạo được giữ lại.");
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
        {(draft || generationMessage) && <section className="mx-auto max-w-4xl px-4 pt-6" aria-live="polite">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold">{draft ? `${draft.packName}: ${draft.stickers.length}/${draft.count} ảnh` : "Trạng thái tạo ảnh"}</p>
            <p className="mt-2 text-sm">{generationMessage || "Đã khôi phục bản đang tạo. Bạn có thể xem ảnh hoặc tiếp tục phần còn thiếu."}</p>
            <div className="mt-3 flex gap-3">
              {!!draft?.stickers.length && <button type="button" disabled={isLoading} onClick={() => { setCurrentStickers(draft.stickers); setCurrentPackName(draft.packName); setActiveTab("editor"); }} className="rounded-lg bg-white px-3 py-2 disabled:opacity-50">Xem / tải ảnh đã tạo</button>}
              {draft && draft.completed.length < draft.count && <button type="button" disabled={isLoading || !draftReady} onClick={() => runDraft(draft)} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50">Tiếp tục {draft.count - draft.completed.length} ảnh còn thiếu</button>}
            </div>
            {!!draft?.stickers.length && <div className="mt-3 flex gap-2 overflow-x-auto">{draft.stickers.map(sticker => <img key={sticker.id} src={sticker.imageUrl} alt={sticker.title} className="h-28 rounded-lg" />)}</div>}
          </div>
        </section>}
        {activeTab === "create" && (
          <PhotoUploader
            onGenerate={handleGenerateStickers}
            onCompare={handleComparePresets}
            isLoading={isLoading || !draftReady}
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
