import React from "react";
import { ArrowLeft, CheckCircle2, Clock3, Image as ImageIcon, XCircle } from "lucide-react";
import { CompareResponse } from "../types";

interface CompareResultsProps {
  packName: string;
  data: CompareResponse;
  onBack: () => void;
}

export const CompareResults: React.FC<CompareResultsProps> = ({ packName, data, onBack }) => {
  const successful = data.results.filter((item) => item.status === "success").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Compare Lab</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{packName}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pose: <span className="font-semibold text-slate-700">{data.pose.name}</span> · {successful}/{data.results.length} preset tạo ảnh thành công
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại thử preset khác
        </button>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5 mb-6">
        <p className="text-sm font-semibold text-blue-900">Cùng 1 ảnh gốc · cùng 1 pose · nhiều engine/preset</p>
        <p className="text-xs text-blue-700 mt-1">So sánh trực tiếp khuôn mặt, tóc, trang phục, tay/cử chỉ và mức độ AI hóa giữa các kết quả.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-3xl border-2 border-slate-900 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900">Ảnh gốc</p>
              <p className="text-xs text-slate-500">Mốc tham chiếu nhận dạng</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-1 text-xs font-semibold">
              <ImageIcon className="w-3.5 h-3.5" /> SOURCE
            </span>
          </div>
          <div className="aspect-square bg-slate-100 p-3">
            <img src={data.sourceImage} alt="Ảnh gốc" className="w-full h-full object-contain rounded-2xl bg-white" />
          </div>
        </article>

        {data.results.map((result) => (
          <article key={result.preset} className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 leading-snug">{result.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{result.preset}</p>
                </div>
                {result.status === "success" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2.5 py-1 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Lỗi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Clock3 className="w-3.5 h-3.5" />
                {(result.durationMs / 1000).toFixed(1)} giây
              </div>
            </div>

            {result.status === "success" && result.sticker ? (
              <div className="aspect-square bg-slate-100 p-3">
                <img
                  src={result.sticker.imageUrl}
                  alt={result.label}
                  className="w-full h-full object-contain rounded-2xl bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="aspect-square bg-rose-50 p-5 flex items-center justify-center">
                <div className="text-center">
                  <XCircle className="w-9 h-9 text-rose-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-rose-800">Preset này không tạo được ảnh</p>
                  <p className="text-xs text-rose-700 mt-2 break-words">{result.error || "Không rõ lỗi"}</p>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
