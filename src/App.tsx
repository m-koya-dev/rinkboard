// src/App.tsx
import { useState } from "react";
import Board2D from "./boards/Board2D";
import Board3D from "./boards/Board3D";
import { useBoardStore, useDrawStore } from "./store";
import type { Mode3D } from "./store";

type ViewMode = "2d" | "3d";

function Header({
  viewMode,
  setViewMode,
  mode3D,
  setMode3D,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  mode3D: Mode3D;
  setMode3D: (m: Mode3D) => void;
}) {
  const { rotateBoard, resetPositions } = useBoardStore();
  const { undo, redo, clearAllLines } = useDrawStore();

  const tabBase =
    "px-3 py-1 rounded-full text-sm font-medium border transition";
  const activeTab = tabBase + " bg-emerald-500 text-white border-emerald-500";
  const inactiveTab =
    tabBase + " bg-white/5 text-slate-100 border-white/10 hover:bg-white/10";

  const buttonBase =
    "inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border border-white/15 text-slate-100 hover:bg-white/10 transition";

  const mode3DBase =
    "px-2 py-0.5 rounded-full text-[11px] border transition";
  const mode3DActive =
    mode3DBase + " bg-sky-500 text-white border-sky-400";
  const mode3DInactive =
    mode3DBase +
    " bg-white/5 text-slate-100 border-white/10 hover:bg-white/10";

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-slate-800">
      {/* 左：ロゴ */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-900">
          R
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-50">
            RinkBoard
          </span>
          <span className="text-[11px] text-slate-400">
            Roller Hockey Tactics Board
          </span>
        </div>
      </div>

      {/* 中央：ビュー切り替え + 3D操作モード */}
      <div className="flex flex-col items-center gap-1">
        <div className="bg-slate-800/80 border border-slate-700 rounded-full p-1 flex items-center gap-1">
          <button
            className={
              viewMode === "2d" ? activeTab : inactiveTab
            }
            onClick={() => setViewMode("2d")}
          >
            2D View
          </button>
          <button
            className={
              viewMode === "3d" ? activeTab : inactiveTab
            }
            onClick={() => setViewMode("3d")}
          >
            3D View
          </button>
        </div>

        {/* 3D表示中だけ、カメラ/駒の操作モードを表示 */}
        {viewMode === "3d" && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="text-[10px] text-slate-400">
              3D 操作:
            </span>
            <button
              className={
                mode3D === "camera" ? mode3DActive : mode3DInactive
              }
              onClick={() => setMode3D("camera")}
            >
              Camera
            </button>
            <button
              className={
                mode3D === "piece" ? mode3DActive : mode3DInactive
              }
              onClick={() => setMode3D("piece")}
            >
              Pieces
            </button>
          </div>
        )}
      </div>

      <footer className="text-gray-400 text-xs text-center p-2">
        RinkBoard - リンクホッケー / ローラーホッケー専用の戦術ボードアプリ
      </footer>

      {/* 右：アクション系 */}
      <div className="flex items-center gap-2">
        <button className={buttonBase} onClick={undo}>
          ⬅︎ Undo
        </button>
        <button className={buttonBase} onClick={redo}>
          ➝ Redo
        </button>
        <button className={buttonBase} onClick={rotateBoard}>
          ⟳ Rotate
        </button>
        <button
          className={buttonBase}
          onClick={() => {
            clearAllLines();
            resetPositions();
          }}
        >
          Reset
        </button>
      </div>
    </header>
  );
}

function Sidebar() {
  const { activeTool, setTool, penColor, penWidth, setPenColor, setPenWidth } =
    useDrawStore();

  const itemBase =
    "w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] cursor-pointer border-l-2 transition";
  const activeItem =
    itemBase +
    " border-emerald-400 bg-emerald-500/10 text-emerald-300";
  const inactiveItem =
    itemBase +
    " border-transparent text-slate-300 hover:bg:white/5 hover:border-slate-600";

  const ToolButton = ({
    id,
    label,
    icon,
  }: {
    id: Parameters<typeof setTool>[0];
    label: string;
    icon: string;
  }) => (
    <button
      className={activeTool === id ? activeItem : inactiveItem}
      onClick={() => setTool(id)}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-20 bg-slate-900/95 border-r border-slate-800 flex flex-col items-stretch pt-3 pb-4 gap-2">
      {/* メインツール */}
      <div className="flex-1 flex flex-col gap-1">
        <ToolButton id="select" label="Select" icon="🖱" />
        <ToolButton id="pen" label="Pen" icon="✏️" />
        <ToolButton id="eraser" label="Eraser" icon="🧽" />
        <ToolButton id="arrow" label="Arrow" icon="➡️" />
        <ToolButton id="text" label="Text" icon="🅣" />
      </div>

      {/* ペン設定 */}
      <div className="border-t border-slate-700 pt-2 px-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Pen color</span>
          <div className="flex gap-1 justify-between">
            {["#111827", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b"].map(
              (c) => (
                <button
                  key={c}
                  className={`w-4 h-4 rounded-full border ${
                    penColor === c
                      ? "ring-2 ring-emerald-400 border-white"
                      : "border-slate-500"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setPenColor(c)}
                />
              )
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Pen width</span>
          <input
            type="range"
            min={1}
            max={8}
            value={penWidth}
            onChange={(e) => setPenWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const { mode3D, setMode3D } = useBoardStore();

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* ヘッダー */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        mode3D={mode3D}
        setMode3D={setMode3D}
      />

      {/* 下部レイアウト：左サイドバー + 中央ボード */}
      <div className="flex flex-1 min-h-0">
        {/* 左ツールバー */}
        <Sidebar />

        {/* メインボードエリア */}
        <main className="flex-1 min-h-0 min-w-0 bg-slate-900">
          {viewMode === "2d" ? <Board2D /> : <Board3D />}
        </main>
      </div>
    </div>
  );
}

