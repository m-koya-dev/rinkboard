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

/* ====== 盤面（選手・ボール・回転など） ====== */

interface BoardState {
  players: Player[];
  ball: Ball;
  boardRotation: 0 | 1 | 2 | 3; // 0=横, 1=縦(右), 2=反転, 3=縦(左)
  selectedId: string | null;
  mode3D: Mode3D;

  // actions
  selectPlayer: (id: string | null) => void;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  updateBall: (patch: Partial<Ball>) => void;
  rotateBoard: () => void;
  resetPositions: () => void;
  setMode3D: (mode: Mode3D) => void;
}

// ------- 画面幅から「初期モバイルかどうか」を判定 -------
// window が無い環境（ビルド時など）でも落ちないように typeof チェック
const isMobileInit =
  typeof window !== "undefined" ? window.innerWidth < 768 : false;

function createInitialPlayers(): Player[] {
  // 左チーム（A）：GK + FP4
  const teamA: Player[] = [
    {
      id: "A-GK",
      team: "A",
      role: "GK",
      x: BOUNDS.xMin + 2,
      y: 0,
      color: "#0ea5e9",
      number: 1,
    },
    {
      id: "A-FP1",
      team: "A",
      role: "FP",
      x: -8,
      y: 3,
      color: "#0ea5e9",
      number: 4,
    },
    {
      id: "A-FP2",
      team: "A",
      role: "FP",
      x: -8,
      y: -3,
      color: "#0ea5e9",
      number: 5,
    },
    {
      id: "A-FP3",
      team: "A",
      role: "FP",
      x: -4,
      y: 2,
      color: "#0ea5e9",
      number: 7,
    },
    {
      id: "A-FP4",
      team: "A",
      role: "FP",
      x: -4,
      y: -2,
      color: "#0ea5e9",
      number: 9,
    },
  ];

  // 右チーム（B）：GK + FP4
  const teamB: Player[] = [
    {
      id: "B-GK",
      team: "B",
      role: "GK",
      x: BOUNDS.xMax - 2,
      y: 0,
      color: "#f97316",
      number: 1,
    },
    {
      id: "B-FP1",
      team: "B",
      role: "FP",
      x: 8,
      y: 3,
      color: "#f97316",
      number: 4,
    },
    {
      id: "B-FP2",
      team: "B",
      role: "FP",
      x: 8,
      y: -3,
      color: "#f97316",
      number: 5,
    },
    {
      id: "B-FP3",
      team: "B",
      role: "FP",
      x: 4,
      y: 2,
      color: "#f97316",
      number: 7,
    },
    {
      id: "B-FP4",
      team: "B",
      role: "FP",
      x: 4,
      y: -2,
      color: "#f97316",
      number: 9,
    },
  ];

  return [...teamA, ...teamB];
}

const initialBall: Ball = {
  x: 0,
  y: 0,
};

export const useBoardStore = create<BoardState>((set) => ({
  players: createInitialPlayers(),
  ball: initialBall,

  // ★ ここがポイント：モバイルなら 1（縦）、PC なら 0（横）
  boardRotation: isMobileInit ? (1 as 0 | 1 | 2 | 3) : (0 as 0 | 1 | 2 | 3),

  selectedId: null,
  mode3D: "camera", // ← デフォルトはカメラ操作

  selectPlayer: (id) => set({ selectedId: id }),

  updatePlayer: (id, patch) =>
    set((_state) => ({
      players: _state.players.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    })),

  updateBall: (patch) =>
    set((_state) => ({
      ball: { ..._state.ball, ...patch },
    })),

  rotateBoard: () =>
    set((_state) => ({
      boardRotation: (((_state.boardRotation + 1) % 4) as 0 | 1 | 2 | 3),
    })),

  resetPositions: () =>
    set({
      players: createInitialPlayers(),
      ball: initialBall,
      // リセット時も、最初と同じ「デバイス別の初期向き」に戻す
      boardRotation: isMobileInit ? (1 as 0 | 1 | 2 | 3) : (0 as 0 | 1 | 2 | 3),
      selectedId: null,
      mode3D: "camera",
    }),

  setMode3D: (mode) => set({ mode3D: mode }),
}));

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
    set((_state) => ({
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
}));
