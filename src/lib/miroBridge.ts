export interface MiroBoardApi {
  createStickyNote?: (payload: {
    content: string;
    x?: number;
    y?: number;
    position?: { x: number; y: number };
  }) => Promise<unknown>;
  getInfo?: () => Promise<unknown>;
}

export interface MiroSdkGlobal {
  board?: MiroBoardApi;
}

declare global {
  interface Window {
    miro?: MiroSdkGlobal;
  }
}

export const isMiroEmbedded = () =>
  typeof window !== "undefined" && Boolean(window.miro?.board);

export const createMiroStickyNote = async (content: string, position: { x: number; y: number }) => {
  if (!window.miro?.board?.createStickyNote) {
    throw new Error("Miro SDK is available only when this app runs inside an authorized Miro board.");
  }
  return window.miro.board.createStickyNote({
    content,
    position,
    x: position.x,
    y: position.y,
  });
};
