import React from "react";
import { StickerPack } from "../types";
import { Library, Trash2, Download, Sparkles, ArrowRight, Sticker } from "lucide-react";

interface LibraryModalProps {
  savedPacks: StickerPack[];
  onSelectPack: (pack: StickerPack) => void;
  onDeletePack: (packId: string) => void;
  onClose: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  savedPacks,
  onSelectPack,
  onDeletePack,
  onClose,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Library className="w-6 h-6 text-blue-600" />
            <span>Thư Viện Bộ Sưu Tập Sticker</span>
          </h2>
          <p className="text-sm text-slate-500">
            Lưu trữ tất cả các bộ sticker cá nhân bạn đã tạo. Xem lại, tải xuống hoặc chỉnh sửa bất cứ lúc nào.
          </p>
        </div>
      </div>

      {savedPacks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Sticker className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa có bộ sticker nào được lưu</h3>
          <p className="text-sm text-slate-500">
            Hãy tạo bộ sticker đầu tiên từ ảnh cá nhân của bạn để lưu vào thư viện cá nhân.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all inline-flex items-center space-x-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo Sticker Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {savedPacks.map((pack) => (
            <div
              key={pack.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100 overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-all group"
            >
              <div>
                <div className="aspect-video bg-slate-900/5 relative overflow-hidden flex items-center justify-center p-4 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]">
                  {pack.thumbnailUrl && (
                    <img
                      src={pack.thumbnailUrl}
                      alt={pack.name}
                      className="h-28 w-28 object-contain drop-shadow-lg group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
                    {pack.stickers.length} ảnh
                  </span>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-slate-900 text-base truncate">{pack.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Đã tạo ngày: {pack.createdAt}</p>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center justify-between gap-3">
                <button
                  onClick={() => onSelectPack(pack)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                >
                  <span>Mở xem</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDeletePack(pack.id)}
                  className="p-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
                  title="Xóa bộ sticker"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
