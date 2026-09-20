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
