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

// ===== UI（i18n） =====
export type Lang = "ja" | "en";

interface UiState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const UI_LS_KEY = "rinkboard_lang_v1";

function safeLoadLang(): Lang {
  try {
    const raw = localStorage.getItem(UI_LS_KEY);
    return raw === "en" ? "en" : "ja";
  } catch {
    return "ja";
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  lang: safeLoadLang(),
  setLang: (lang) => {
    set({ lang });
    try {
      localStorage.setItem(UI_LS_KEY, lang);
    } catch {
      // localStorageが使えなくても落とさない
    }
  },
  toggleLang: () => {
    const next: Lang = get().lang === "ja" ? "en" : "ja";
    set({ lang: next });
    try {
      localStorage.setItem(UI_LS_KEY, next);
    } catch {}
  },
}));


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

  // ★外部から「線だけ」丸ごと置き換える（chapter再生/読込用）
  setLinesInstant: (lines: DrawLine[]) => void;
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

  setLinesInstant: (lines) =>
    set({
      lines,
      history: [lines],
      historyIndex: 0,
    }),
}));

/* ====== 盤面（選手・ボール・回転・チャプターなど） ====== */

export interface ChapterSnapshot {
  id: string; // "1".."10"
  players: Player[];
  ball: Ball;
  boardRotation: 0 | 1 | 2 | 3;
  lines: DrawLine[]; // ★チャプターごとに線も保存
}

interface BoardState {
  players: Player[];
  ball: Ball;
  boardRotation: 0 | 1 | 2 | 3; // 0=横, 1=縦(右), 2=反転, 3=縦(左)
  selectedId: string | null;
  mode3D: Mode3D;

  // ✅ players edit
  addPlayer: (team: TeamId, role?: Role) => { ok: boolean; id?: string; message?: string };
  removePlayer: (id: string) => void;
  setPlayerNumber: (id: string, number: number) => void;

  // chapters
  chapters: ChapterSnapshot[];
  activeChapterIndex: number; // 0..9
  isPlayingChapters: boolean;

  // actions (basic)
  selectPlayer: (id: string | null) => void;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  updateBall: (patch: Partial<Ball>) => void;
  rotateBoard: () => void;
  resetPositions: () => void;
  setMode3D: (mode: Mode3D) => void;

  // actions (chapters)
  saveChapterAtActive: () => void;
  clearChapters: () => void;
  switchChapter: (index: number) => void;
  startPlayChapters: () => void;
  stopPlayChapters: () => void;

  // chapter playback helpers
  applySnapshotInstant: (snap: {
    players: Player[];
    ball: Ball;
    boardRotation: 0 | 1 | 2 | 3;
    lines: DrawLine[];
  }) => void;
  setPlayersAndBall: (players: Player[], ball: Ball) => void;

  // export/import
  exportAllToObject: () => ExportDataV1;
  importAllFromObject: (data: unknown) => { ok: boolean; message: string };
}

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
    { id: "A-FP1", team: "A", role: "FP", x: -8, y: 3, color: "#0ea5e9", number: 4 },
    { id: "A-FP2", team: "A", role: "FP", x: -8, y: -3, color: "#0ea5e9", number: 5 },
    { id: "A-FP3", team: "A", role: "FP", x: -4, y: 2, color: "#0ea5e9", number: 7 },
    { id: "A-FP4", team: "A", role: "FP", x: -4, y: -2, color: "#0ea5e9", number: 9 },
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
    { id: "B-FP1", team: "B", role: "FP", x: 8, y: 3, color: "#f97316", number: 4 },
    { id: "B-FP2", team: "B", role: "FP", x: 8, y: -3, color: "#f97316", number: 5 },
    { id: "B-FP3", team: "B", role: "FP", x: 4, y: 2, color: "#f97316", number: 7 },
    { id: "B-FP4", team: "B", role: "FP", x: 4, y: -2, color: "#f97316", number: 9 },
  ];

  return [...teamA, ...teamB];
}

const initialBall: Ball = { x: 0, y: 0 };

/* =========================
   Export / Import フォーマット
========================= */
type ExportDataV1 = {
  version: 1;
  savedAt: string;
  board: {
    players: Player[];
    ball: Ball;
    boardRotation: 0 | 1 | 2 | 3;
    selectedId: string | null;
    mode3D: Mode3D;
    chapters: ChapterSnapshot[];
    activeChapterIndex: number;
  };
  draw: {
    lines: DrawLine[];
  };
};

const LS_KEY = "rinkboard_export_v1";

function isObj(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object";
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}
function clampRot(v: any): 0 | 1 | 2 | 3 {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3) return n;
  return 0;
}
function sanitizePlayer(p: any): Player | null {
  if (!isObj(p)) return null;
  if (!isStr(p.id)) return null;
  const team = p.team === "A" || p.team === "B" ? (p.team as TeamId) : null;
  const role = p.role === "GK" || p.role === "FP" ? (p.role as Role) : null;
  if (!team || !role) return null;
  if (!isNum(p.x) || !isNum(p.y)) return null;
  if (!isStr(p.color)) return null;
  if (!isNum(p.number)) return null;
  return {
    id: p.id,
    team,
    role,
    x: p.x,
    y: p.y,
    color: p.color,
    number: p.number,
  };
}
function sanitizeBall(b: any): Ball {
  if (!isObj(b)) return { ...initialBall };
  const x = isNum(b.x) ? b.x : 0;
  const y = isNum(b.y) ? b.y : 0;
  return { x, y };
}
function sanitizeLine(l: any): DrawLine | null {
  if (!isObj(l)) return null;
  if (!Array.isArray(l.points)) return null;
  const pts = l.points.map(Number).filter((n: any) => Number.isFinite(n));
  if (pts.length < 4) return null;
  const color = isStr(l.color) ? l.color : "#111827";
  const width = isNum(l.width) ? l.width : 3;
  return { points: pts, color, width };
}
function sanitizeChapter(c: any): ChapterSnapshot | null {
  if (!isObj(c)) return null;
  const id = isStr(c.id) ? c.id : null;
  if (!id) return null;
  if (!Array.isArray(c.players)) return null;
  const players = c.players.map(sanitizePlayer).filter(Boolean) as Player[];
  const ball = sanitizeBall(c.ball);
  const boardRotation = clampRot(c.boardRotation);
  const lines = Array.isArray(c.lines)
    ? (c.lines.map(sanitizeLine).filter(Boolean) as DrawLine[])
    : [];
  return { id, players, ball, boardRotation, lines };
}

/* =========================
   ✅ Players helper（追加機能用）
========================= */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function nextUnusedNumber(players: Player[], team: TeamId): number {
  const used = new Set(players.filter((p) => p.team === team).map((p) => p.number));
  for (let n = 1; n <= 99; n++) {
    if (!used.has(n)) return n;
  }
  return 99;
}

function nextId(players: Player[], team: TeamId, role: Role): string {
  if (role === "GK") {
    // GKは基本1人想定。既にいたら連番を付ける
    const base = `${team}-GK`;
    if (!players.some((p) => p.id === base)) return base;
    let k = 2;
    while (players.some((p) => p.id === `${base}${k}`)) k++;
    return `${base}${k}`;
  }
  // FPは FP1, FP2... を埋める
  let i = 1;
  while (players.some((p) => p.id === `${team}-FP${i}`)) i++;
  return `${team}-FP${i}`;
}

function defaultSpawn(players: Player[], team: TeamId, role: Role): { x: number; y: number } {
  // 既存の見た目を崩しにくいように、左右の「よくある位置」に置く
  const sameTeam = players.filter((p) => p.team === team);
  const idx = sameTeam.length; // 0..（追加順）
  const baseX = team === "A" ? -8 : 8;
  const baseYList = [0, 3, -3, 2, -2, 5, -5, 1, -1];
  const y = baseYList[idx % baseYList.length] ?? 0;
  const x = role === "GK" ? (team === "A" ? BOUNDS.xMin + 2 : BOUNDS.xMax - 2) : baseX;

  return {
    x: clamp(x, BOUNDS.xMin + 0.6, BOUNDS.xMax - 0.6),
    y: clamp(y, BOUNDS.yMin + 0.6, BOUNDS.yMax - 0.6),
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  players: createInitialPlayers(),
  ball: initialBall,
  boardRotation: 0,
  selectedId: null,
  mode3D: "camera",

  // ✅ players edit
  addPlayer: (team, role = "FP") => {
    const cur = get().players;

    const id = nextId(cur, team, role);
    const number = nextUnusedNumber(cur, team);
    const color = team === "A" ? "#0ea5e9" : "#f97316";
    const { x, y } = defaultSpawn(cur, team, role);

    const p: Player = { id, team, role, x, y, color, number };

    set((s) => ({
      players: [...s.players, p],
      selectedId: id, // 追加したら選択
    }));

    return { ok: true, id };
  },

  removePlayer: (id) => {
    set((s) => ({
      players: s.players.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  setPlayerNumber: (id, number) => {
    const n = Math.max(0, Math.min(99, Math.floor(Number(number) || 0)));
    set((s) => ({
      players: s.players.map((p) => (p.id === id ? { ...p, number: n } : p)),
    }));
  },

  chapters: [],
  activeChapterIndex: 0,
  isPlayingChapters: false,

  selectPlayer: (id) => set({ selectedId: id }),

  updatePlayer: (id, patch) =>
    set((_state) => ({
      players: _state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
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
      boardRotation: 0,
      selectedId: null,
      mode3D: "camera",
      // ★チャプターや線は残す（今までの動作を壊さない）
    }),

  setMode3D: (mode) => set({ mode3D: mode }),

  /* ===== Chapters ===== */

  saveChapterAtActive: () => {
    const idx = get().activeChapterIndex;
    const id = String(idx + 1);

    const snap: ChapterSnapshot = {
      id,
      players: get().players.map((p) => ({ ...p })),
      ball: { ...get().ball },
      boardRotation: get().boardRotation,
      lines: useDrawStore.getState().lines.map((l) => ({
        points: [...l.points],
        color: l.color,
        width: l.width,
      })),
    };

    set((s) => {
      const others = s.chapters.filter((c) => c.id !== id);
      return { chapters: [...others, snap] };
    });
  },

  clearChapters: () => {
    set({ chapters: [], activeChapterIndex: 0, isPlayingChapters: false });
  },

  switchChapter: (index) => {
    const idx = Math.max(0, Math.min(9, index));

    // ★「切り替えたら自動保存」：今の章を保存してから移動
    get().saveChapterAtActive();

    set({ activeChapterIndex: idx });

    const id = String(idx + 1);
    const found = get().chapters.find((c) => c.id === id);

    if (found) {
      get().applySnapshotInstant({
        players: found.players,
        ball: found.ball,
        boardRotation: found.boardRotation,
        lines: found.lines,
      });
    } else {
      // 空チャプターなら何もしない（現状維持）
    }
  },

  startPlayChapters: () => set({ isPlayingChapters: true }),
  stopPlayChapters: () => set({ isPlayingChapters: false }),

  applySnapshotInstant: (snap) => {
    set({
      players: snap.players.map((p) => ({ ...p })),
      ball: { ...snap.ball },
      boardRotation: snap.boardRotation,
      selectedId: null,
    });
    useDrawStore.getState().setLinesInstant(
      (snap.lines ?? []).map((l) => ({
        points: [...l.points],
        color: l.color,
        width: l.width,
      }))
    );
  },

  setPlayersAndBall: (players, ball) => {
    set({
      players: players.map((p) => ({ ...p })),
      ball: { ...ball },
    });
  },

  /* ===== Export / Import ===== */

  exportAllToObject: () => {
    const b = get();
    const d = useDrawStore.getState();
    const data: ExportDataV1 = {
      version: 1,
      savedAt: new Date().toISOString(),
      board: {
        players: b.players.map((p) => ({ ...p })),
        ball: { ...b.ball },
        boardRotation: b.boardRotation,
        selectedId: b.selectedId,
        mode3D: b.mode3D,
        chapters: b.chapters.map((c) => ({
          id: c.id,
          players: c.players.map((p) => ({ ...p })),
          ball: { ...c.ball },
          boardRotation: c.boardRotation,
          lines: (c.lines ?? []).map((l) => ({
            points: [...l.points],
            color: l.color,
            width: l.width,
          })),
        })),
        activeChapterIndex: b.activeChapterIndex,
      },
      draw: {
        lines: d.lines.map((l) => ({
          points: [...l.points],
          color: l.color,
          width: l.width,
        })),
      },
    };
    return data;
  },

  importAllFromObject: (raw) => {
    try {
      if (!isObj(raw)) return { ok: false, message: "JSONの形式が不正です。" };
      if (raw.version !== 1) {
        return { ok: false, message: "未対応のバージョンです。" };
      }
      if (!isObj(raw.board) || !isObj(raw.draw)) {
        return { ok: false, message: "JSONの中身が不足しています。" };
      }

      const board = raw.board;
      const draw = raw.draw;

      const players = Array.isArray(board.players)
        ? (board.players.map(sanitizePlayer).filter(Boolean) as Player[])
        : createInitialPlayers();

      const ball = sanitizeBall(board.ball);
      const boardRotation = clampRot(board.boardRotation);

      const mode3D: Mode3D = board.mode3D === "piece" ? "piece" : "camera";

      const activeChapterIndex = (() => {
        const n = Number(board.activeChapterIndex);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(9, Math.floor(n)));
      })();

      const chapters = Array.isArray(board.chapters)
        ? (board.chapters.map(sanitizeChapter).filter(Boolean) as ChapterSnapshot[])
        : [];

      const lines = Array.isArray(draw.lines)
        ? (draw.lines.map(sanitizeLine).filter(Boolean) as DrawLine[])
        : [];

      // 反映（今あるUI/機能を壊さないため、必要最小限に上書き）
      set({
        players,
        ball,
        boardRotation,
        selectedId: null,
        mode3D,
        chapters,
        activeChapterIndex,
        isPlayingChapters: false,
      });
      useDrawStore.getState().setLinesInstant(lines);

      return { ok: true, message: "読み込みに成功しました。" };
    } catch (e: any) {
      return { ok: false, message: "読み込み中にエラーが発生しました。" };
    }
  },
}));

/* =========================
   自動保存（localStorage）
   - 既存UIを崩さず、裏側だけで保存する
========================= */

let saveTimer: any = null;

function scheduleAutoSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = useBoardStore.getState().exportAllToObject();
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      // 失敗してもアプリ動作は止めない
    }
  }, 250); // 軽いスロットリング
}

try {
  // 状態変化で自動保存
  useBoardStore.subscribe(() => scheduleAutoSave());
  useDrawStore.subscribe(() => scheduleAutoSave());

  // 起動時：復元
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    useBoardStore.getState().importAllFromObject(parsed);
  }
} catch {
  // localStorageが使えない環境でも落とさない
}
