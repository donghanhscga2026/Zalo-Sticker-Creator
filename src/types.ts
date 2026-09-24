export interface Sticker {
  id: string;
  title: string;
  imageUrl: string;
  caption?: string;
  borderWidth?: number;
  borderColor?: string;
  rotation?: number;
}

export interface StickerPack {
  id: string;
  name: string;
  createdAt: string;
  stickers: Sticker[];
  thumbnailUrl: string;
}

export interface ExpressionOption {
  id: string;
  name: string;
  prompt: string;
  defaultCaption: string;
}

export type GenerationPresetId =
  | "instantid_balanced"
  | "instantid_fidelity"
  | "instantid_conservative"
  | "pulid_fidelity"
  | "pulid_flux_fidelity";

export interface ComparePresetResult {
  preset: GenerationPresetId;
  label: string;
  status: "success" | "error";
  durationMs: number;
  sticker?: Sticker;
  error?: string;
}

export interface CompareResponse {
  success: boolean;
  sourceImage: string;
  pose: {
    index: number;
    name: string;
    caption: string;
  };
  results: ComparePresetResult[];
}
