// src/store.ts
import { create } from "zustand";

/**
 * リンクの物理的な範囲（メートル）
 */
export const BOUNDS = {
  xMin: -15,
  xMax: 15,
  yMin: -7.5,
  yMax: 7.5,
};

export type TeamId = "A" | "B";
export type Role = "GK" | "FP";
export type Mode3D = "camera" | "piece";

export interface Player {
  id: string;
  team: TeamId;
  role: Role;
  x: number;
  y: number;
  color: string;
  number: number;
}

export interface Ball {
  x: number;
  y: number;
}

/* ====== ペン・線の管理（描画） ====== */

export interface DrawLine {
  points: number[]; // [x1,y1,x2,y2,...] （ワールド座標）
  color: string;
  width: number;
}

type Tool = "select" | "pen" | "eraser" | "arrow" | "text";

interface DrawState {
  lines: DrawLine[];
  penEnabled: boolean;
  eraserEnabled: boolean;
  activeTool: Tool;
  penColor: string;
  penWidth: number;

  // 履歴（Undo/Redo）
  history: DrawLine[][];
  historyIndex: number;

  // actions
  setTool: (tool: Tool) => void;
  setPenColor: (color: string) => void;
  setPenWidth: (w: number) => void;
  addLine: (line: DrawLine) => void;
  eraseLine: (index: number) => void;
  undo: () => void;
  redo: () => void;
  clearAllLines: () => void;

  // ★チャプター用：外部から線を丸ごと差し替える
  setLinesSnapshot: (lines: DrawLine[]) => void;
}

export const useDrawStore = create<DrawState>((set, get) => ({
  lines: [],
  penEnabled: false,
  eraserEnabled: false,
  activeTool: "select",
  penColor: "#111827",
  penWidth: 3,

  history: [[]],
  historyIndex: 0,

  setTool: (tool) =>
    set(() => ({
      activeTool: tool,
      penEnabled: tool === "pen",
      eraserEnabled: tool === "eraser",
    })),

  setPenColor: (color) => set({ penColor: color }),
  setPenWidth: (w) => set({ penWidth: w }),

  addLine: (line) => {
    const { history, historyIndex } = get();
    const newLines = [...get().lines, line];
    const sliced = history.slice(0, historyIndex + 1);
    set({
      lines: newLines,
      history: [...sliced, newLines],
      historyIndex: sliced.length,
    });
  },

  eraseLine: (index) => {
    const { history, historyIndex } = get();
    const newLines = get().lines.filter((_, i) => i !== index);
    const sliced = history.slice(0, historyIndex + 1);
    set({
      lines: newLines,
      history: [...sliced, newLines],
      historyIndex: sliced.length,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      historyIndex: newIndex,
      lines: history[newIndex] ?? [],
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      historyIndex: newIndex,
      lines: history[newIndex] ?? [],
    });
  },

  clearAllLines: () =>
    set({
      lines: [],
      history: [[]],
      historyIndex: 0,
    }),

  // ★チャプター用：線を差し替え（Undo/Redo履歴もリセット）
  setLinesSnapshot: (lines) =>
    set({
      lines: lines ?? [],
      history: [lines ?? []],
      historyIndex: 0,
    }),
}));

/* ====== 盤面（選手・ボール・回転など） ====== */

export interface ChapterSnapshot {
  id: string; // "1"〜"10"
  title: string;
  players: Player[];
  ball: Ball;
  boardRotation: 0 | 1 | 2 | 3;
  lines: DrawLine[];
}

interface BoardState {
  players: Player[];
  ball: Ball;
  boardRotation: 0 | 1 | 2 | 3; // 0=横, 1=縦(右), 2=反転, 3=縦(左)
  selectedId: string | null;
  mode3D: Mode3D;

  // ===== チャプター =====
  chapters: ChapterSnapshot[]; // 最大10
  activeChapterIndex: number; // 0..9
  isPlayingChapters: boolean;

  // actions
  selectPlayer: (id: string | null) => void;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  updateBall: (patch: Partial<Ball>) => void;
  rotateBoard: () => void;
  resetPositions: () => void;
  setMode3D: (mode: Mode3D) => void;

  // ★チャプター操作
  setActiveChapterIndex: (idx: number) => void;
  saveChapterAtActive: () => void;
  loadChapter: (idx: number) => void;
  clearChapters: () => void;

  // ★ここが今回追加：チャプター切替（自動セーブ付き）
  switchChapter: (nextIdx: number) => void;

  // ★再生
  startPlayChapters: () => void;
  stopPlayChapters: () => void;

  // ★アニメ用：盤面をまとめて適用
  applySnapshotInstant: (snap: {
    players: Player[];
    ball: Ball;
    boardRotation: 0 | 1 | 2 | 3;
    lines: DrawLine[];
  }) => void;

  // ★アニメ用：プレイヤー/ボールだけ更新（毎フレーム）
  setPlayersAndBall: (players: Player[], ball: Ball) => void;
}

function createInitialPlayers(): Player[] {
  // 左チーム（A）：GK + FP4
  const teamA: Player[] = [
    { id: "A-GK", team: "A", role: "GK", x: BOUNDS.xMin + 2, y: 0, color: "#0ea5e9", number: 1 },
    { id: "A-FP1", team: "A", role: "FP", x: -8, y: 3, color: "#0ea5e9", number: 4 },
    { id: "A-FP2", team: "A", role: "FP", x: -8, y: -3, color: "#0ea5e9", number: 5 },
    { id: "A-FP3", team: "A", role: "FP", x: -4, y: 2, color: "#0ea5e9", number: 7 },
    { id: "A-FP4", team: "A", role: "FP", x: -4, y: -2, color: "#0ea5e9", number: 9 },
  ];

  // 右チーム（B）：GK + FP4
  const teamB: Player[] = [
    { id: "B-GK", team: "B", role: "GK", x: BOUNDS.xMax - 2, y: 0, color: "#f97316", number: 1 },
    { id: "B-FP1", team: "B", role: "FP", x: 8, y: 3, color: "#f97316", number: 4 },
    { id: "B-FP2", team: "B", role: "FP", x: 8, y: -3, color: "#f97316", number: 5 },
    { id: "B-FP3", team: "B", role: "FP", x: 4, y: 2, color: "#f97316", number: 7 },
    { id: "B-FP4", team: "B", role: "FP", x: 4, y: -2, color: "#f97316", number: 9 },
  ];

  return [...teamA, ...teamB];
}

const initialBall: Ball = { x: 0, y: 0 };

function clampIdx(idx: number) {
  return Math.max(0, Math.min(9, idx));
}

function clonePlayers(players: Player[]) {
  return players.map((p) => ({ ...p }));
}
function cloneLines(lines: DrawLine[]) {
  return lines.map((l) => ({ ...l, points: [...l.points] }));
}

// chapters を 10枠として扱うユーティリティ
function toFixedSlots(chapters: ChapterSnapshot[]) {
  const fixed: (ChapterSnapshot | null)[] = Array(10).fill(null);
  for (const c of chapters) {
    const n = Number(c.id) - 1;
    if (!Number.isNaN(n) && n >= 0 && n < 10) fixed[n] = c;
  }
  return fixed;
}
function fromFixedSlots(fixed: (ChapterSnapshot | null)[]) {
  return fixed.filter(Boolean) as ChapterSnapshot[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  players: createInitialPlayers(),
  ball: initialBall,
  boardRotation: 0,
  selectedId: null,
  mode3D: "camera",

  chapters: [],
  activeChapterIndex: 0,
  isPlayingChapters: false,

  selectPlayer: (id) => set({ selectedId: id }),

  updatePlayer: (id, patch) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  updateBall: (patch) =>
    set((state) => ({
      ball: { ...state.ball, ...patch },
    })),

  rotateBoard: () =>
    set((state) => ({
      boardRotation: (((state.boardRotation + 1) % 4) as 0 | 1 | 2 | 3),
    })),

  resetPositions: () =>
    set({
      players: createInitialPlayers(),
      ball: initialBall,
      boardRotation: 0,
      selectedId: null,
      mode3D: "camera",
    }),

  setMode3D: (mode) => set({ mode3D: mode }),

  setActiveChapterIndex: (idx) => set({ activeChapterIndex: clampIdx(idx) }),

  saveChapterAtActive: () => {
    const idx = clampIdx(get().activeChapterIndex);
    const state = get();
    const draw = useDrawStore.getState();

    const snap: ChapterSnapshot = {
      id: String(idx + 1),
      title: `Chapter ${idx + 1}`,
      players: clonePlayers(state.players),
      ball: { ...state.ball },
      boardRotation: state.boardRotation,
      lines: cloneLines(draw.lines),
    };

    set((s) => {
      const fixed = toFixedSlots(s.chapters);
      fixed[idx] = snap;
      return { chapters: fromFixedSlots(fixed) };
    });
  },

  loadChapter: (idx) => {
    const targetIdx = clampIdx(idx);
    const s = get();
    const fixed = toFixedSlots(s.chapters);
    const snap = fixed[targetIdx];
    if (!snap) return;

    set({
      players: clonePlayers(snap.players),
      ball: { ...snap.ball },
      boardRotation: snap.boardRotation,
      selectedId: null,
    });
    useDrawStore.getState().setLinesSnapshot(cloneLines(snap.lines));
  },

  clearChapters: () => {
    set({ chapters: [], activeChapterIndex: 0, isPlayingChapters: false });
  },

  // ★今回の本命：チャプター切替（自動セーブ → 切替 → 保存済みならロード）
  switchChapter: (nextIdxRaw) => {
    const nextIdx = clampIdx(nextIdxRaw);
    const s = get();
    if (s.isPlayingChapters) return; // 再生中は切替させない（事故防止）

    // 1) 今のアクティブを自動保存（常に）
    s.saveChapterAtActive();

    // 2) アクティブ番号を更新
    set({ activeChapterIndex: nextIdx, selectedId: null });

    // 3) 次が保存済みならロード（未保存なら「現状の盤面」をそのまま使って編集開始）
    const fixed = toFixedSlots(get().chapters);
    const target = fixed[nextIdx];
    if (target) {
      get().applySnapshotInstant({
        players: target.players,
        ball: target.ball,
        boardRotation: target.boardRotation,
        lines: target.lines,
      });
    } else {
      // 未保存スロット：線はそのままでもいいが、混乱しやすいので一旦空にするならここで
      // 今回は「続きとして編集したい」ケースが多いので、何もしない（＝現状維持）
    }
  },

  startPlayChapters: () => set({ isPlayingChapters: true }),
  stopPlayChapters: () => set({ isPlayingChapters: false }),

  applySnapshotInstant: (snap) => {
    set({
      players: clonePlayers(snap.players),
      ball: { ...snap.ball },
      boardRotation: snap.boardRotation,
      selectedId: null,
    });
    useDrawStore.getState().setLinesSnapshot(cloneLines(snap.lines));
  },

  setPlayersAndBall: (players, ball) => {
    set({ players: clonePlayers(players), ball: { ...ball } });
  },
}));
