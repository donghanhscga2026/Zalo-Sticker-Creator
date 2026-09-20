import React from "react";
import { MessageCircle, X, CheckCircle, Download, Sparkles, Smartphone, Monitor } from "lucide-react";

interface ZaloGuideModalProps {
  onClose: () => void;
}

export const ZaloGuideModal: React.FC<ZaloGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="p-6 sm:p-8 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Hướng Dẫn Sử Dụng Sticker Trên Zalo
              </h3>
              <p className="text-xs text-slate-500">Cách đưa bộ sticker cá nhân vào ứng dụng Zalo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-base">Tải trọn bộ sticker về thiết bị</h4>
              <p className="text-sm text-slate-600">
                Nhấn nút <strong className="text-blue-600 font-semibold">"Tải trọn bộ (ZIP)"</strong> ở góc trên màn hình chỉnh sửa. Giải nén file ZIP để nhận toàn bộ các file ảnh <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 text-xs">.png</code> đã tách nền và bo viền trắng hoàn hảo.
              </p>
            </div>
          </div>

          {/* Step 2: Zalo Mobile */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
              2
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-base">Cách gửi nhanh trên Zalo Mobile (Điện thoại)</h4>
              </div>
              <p className="text-sm text-slate-600">
                Bạn có thể lưu các ảnh sticker này vào album ảnh trên điện thoại. Trong khung chat Zalo:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 pl-2">
                <li>Mở biểu tượng ảnh/sticker trong khung chat Zalo.</li>
                <li>Chọn mục <strong>Sticker cá nhân / Tùy chỉnh</strong> (hoặc gửi trực tiếp ảnh PNG có viền trắng).</li>
                <li>Hệ thống Zalo hỗ trợ gửi ảnh tách nền trong suốt trực tiếp như sticker cực kỳ sắc nét.</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Zalo PC / Custom Sticker Store */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
              3
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-base">Tích hợp vào Bộ Sưu Tập Sticker Zalo PC</h4>
              </div>
              <p className="text-sm text-slate-600">
                Trên Zalo PC, bạn có thể sao chép trực tiếp ảnh sticker (tính năng <span className="font-semibold text-slate-800">"Sao chép ảnh vào Clipboard"</span> có sẵn trong ứng dụng này) rồi dán trực tiếp vào khung chat Zalo bằng tổ hợp phím <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 text-xs">Ctrl + V</code>.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <span className="font-bold block">Mẹo nhỏ cho sticker cực đẹp:</span>
              <span>Các sticker được tạo ra đã tự động thêm viền trắng dày chuẩn phong cách sticker Zalo chat, giúp hiển thị cực kỳ nổi bật trên cả nền chat sáng và tối của Zalo.</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all text-sm shadow-sm"
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
