import React from "react";
import { Sparkles, Library, HelpCircle, Sticker } from "lucide-react";

interface NavbarProps {
  activeTab: "create" | "library";
  setActiveTab: (tab: "create" | "library") => void;
  onOpenZaloGuide: () => void;
  savedPacksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenZaloGuide,
  savedPacksCount,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setActiveTab("create")}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sticker className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              Zalo Sticker Creator
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Tạo bộ sticker cá nhân viền trắng cho Zalo
            </p>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "create"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo Sticker</span>
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all relative ${
              activeTab === "library"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Bộ sưu tập</span>
            {savedPacksCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {savedPacksCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <button
            onClick={onOpenZaloGuide}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all"
            title="Hướng dẫn sử dụng trên Zalo"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden md:inline">Hướng dẫn Zalo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
