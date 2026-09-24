import type { Sticker } from "../types";
export type GenerationDraft = { image: string; count: number; packName: string; preset: string; stickers: Sticker[]; completed: number[] };
export async function draftStorage(value?: GenerationDraft): Promise<GenerationDraft | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("zalo-generation", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("draft");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("draft", value ? "readwrite" : "readonly");
      const request = value ? tx.objectStore("draft").put(value, "current") : tx.objectStore("draft").get("current");
      tx.oncomplete = () => resolve(value || request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
