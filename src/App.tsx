// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Board2D, { type Board2DHandle } from "./boards/Board2D";
import Board3D from "./boards/Board3D";
import { useBoardStore, useDrawStore } from "./store";
import type { Mode3D } from "./store";

type ViewMode = "2d" | "3d";

function useIsMobile() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return w < 768;
}

/**
 * MediaRecorder の mimeType を「使えるもの」から選ぶ
 * - mp4 が使えるなら mp4（環境による）
 * - ダメなら webm（Chromeでほぼ確実）
 */
function pickSupportedMimeType() {
  const candidates = [
    // MP4(H.264) は環境次第で非対応
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    // WebM はかなり安定
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs="vp8,opus"',
    "video/webm",
  ];

  for (const c of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c;
  }
  return ""; // 空ならブラウザデフォルト
}

function extFromMime(mime: string) {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

function Header({
  viewMode,
  setViewMode,
  mode3D,
  setMode3D,
  onOpenAnimation,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  mode3D: Mode3D;
  setMode3D: (m: Mode3D) => void;
  onOpenAnimation: () => void;
}) {
  const { rotateBoard, resetPositions } = useBoardStore();
  const { undo, redo, clearAllLines } = useDrawStore();

  const tabBase = "px-3 py-1 rounded-full text-sm font-medium border transition";
  const activeTab = tabBase + " bg-emerald-500 text-white border-emerald-500";
  const inactiveTab =
    tabBase + " bg-white/5 text-slate-100 border-white/10 hover:bg-white/10";

  const buttonBase =
    "inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border border-white/15 text-slate-100 hover:bg-white/10 transition";

  const mode3DBase = "px-2 py-0.5 rounded-full text-[11px] border transition";
  const mode3DActive = mode3DBase + " bg-sky-500 text-white border-sky-400";
  const mode3DInactive =
    mode3DBase + " bg-white/5 text-slate-100 border-white/10 hover:bg-white/10";

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-slate-800">
      {/* 左：ロゴ */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-900">
          R
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-50">RinkBoard</span>
          <span className="text-[11px] text-slate-400">Roller Hockey Tactics Board</span>
        </div>
      </div>

      {/* 中央：ビュー切り替え + 3D操作モード */}
      <div className="flex flex-col items-center gap-1">
        <div className="bg-slate-800/80 border border-slate-700 rounded-full p-1 flex items-center gap-1">
          <button className={viewMode === "2d" ? activeTab : inactiveTab} onClick={() => setViewMode("2d")}>
            2D View
          </button>
          <button className={viewMode === "3d" ? activeTab : inactiveTab} onClick={() => setViewMode("3d")}>
            3D View
          </button>
        </div>

        {viewMode === "3d" && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="text-[10px] text-slate-400">3D 操作:</span>
            <button
              className={mode3D === "camera" ? mode3DActive : mode3DInactive}
              onClick={() => setMode3D("camera")}
            >
              Camera
            </button>
            <button
              className={mode3D === "piece" ? mode3DActive : mode3DInactive}
              onClick={() => setMode3D("piece")}
            >
              Pieces
            </button>
          </div>
        )}
      </div>

      {/* 右：アクション系 */}
      <div className="flex items-center gap-2">
        <button className={buttonBase} onClick={onOpenAnimation}>
          🎞 Animation
        </button>

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

function Sidebar({ onOpenAnimation }: { onOpenAnimation: () => void }) {
  const { activeTool, setTool, penColor, penWidth, setPenColor, setPenWidth } = useDrawStore();

  const itemBase =
    "w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] cursor-pointer border-l-2 transition";
  const activeItem = itemBase + " border-emerald-400 bg-emerald-500/10 text-emerald-300";
  const inactiveItem =
    itemBase + " border-transparent text-slate-300 hover:bg:white/5 hover:border-slate-600";

  const disabledItem =
    "w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] border-l-2 border-transparent text-slate-500 opacity-60 cursor-not-allowed";

  const ToolButton = ({
    id,
    label,
    icon,
    disabled,
  }: {
    id: Parameters<typeof setTool>[0];
    label: string;
    icon: string;
    disabled?: boolean;
  }) => {
    if (disabled) {
      return (
        <div className={disabledItem} title="Coming soon">
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
          <span className="text-[9px] text-slate-500">soon</span>
        </div>
      );
    }

    return (
      <button className={activeTool === id ? activeItem : inactiveItem} onClick={() => setTool(id)}>
        <span className="text-lg">{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-20 bg-slate-900/95 border-r border-slate-800 flex flex-col items-stretch pt-3 pb-4 gap-2">
      <div className="flex-1 flex flex-col gap-1">
        <ToolButton id="select" label="Select" icon="🖱" />
        <ToolButton id="pen" label="Pen" icon="✏️" />
        <ToolButton id="eraser" label="Eraser" icon="🧽" />

        {/* ✅ 指定どおり：Anime(アニメーション)を disabled より上に配置 */}
        <button
          className={
            "mt-2 w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] cursor-pointer border-l-2 border-transparent text-slate-300 hover:bg:white/5 hover:border-slate-600 transition"
          }
          onClick={onOpenAnimation}
          title="Chapters / Animation"
        >
          <span className="text-lg">🎞</span>
          <span>Anime</span>
        </button>

        {/* ★未実装なので無効化（Animeより下へ） */}
        <ToolButton id="arrow" label="Arrow" icon="➡️" disabled />
        <ToolButton id="text" label="Text" icon="🅣" disabled />
      </div>

      <div className="border-t border-slate-700 pt-2 px-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">Pen color</span>
          <div className="flex gap-1 justify-between">
            {["#111827", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b"].map((c) => (
              <button
                key={c}
                className={`w-4 h-4 rounded-full border ${
                  penColor === c ? "ring-2 ring-emerald-400 border-white" : "border-slate-500"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setPenColor(c)}
              />
            ))}
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

/** AnimationPanel / ChapterPlayer は「完全版」 */
function AnimationPanel({
  open,
  onClose,
  viewMode,
  onRecord2D,
  recording,
}: {
  open: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  onRecord2D: () => void;
  recording: boolean;
}) {
  const isMobile = useIsMobile();
  const {
    chapters,
    activeChapterIndex,
    saveChapterAtActive,
    clearChapters,
    isPlayingChapters,
    startPlayChapters,
    stopPlayChapters,
    switchChapter,
  } = useBoardStore();

  const slots = useMemo(() => {
    const fixed = Array(10).fill(null) as (typeof chapters[number] | null)[];
    for (const c of chapters) {
      const n = Number(c.id) - 1;
      if (!Number.isNaN(n) && n >= 0 && n < 10) fixed[n] = c;
    }
    return fixed;
  }, [chapters]);

  const baseBtn =
    "px-2 py-1 rounded-md text-xs border border-white/15 hover:bg-white/10 transition";
  const primary =
    "px-3 py-1 rounded-md text-xs font-medium bg-emerald-500 text-slate-900 hover:bg-emerald-400 transition";
  const danger =
    "px-3 py-1 rounded-md text-xs font-medium bg-rose-500 text-white hover:bg-rose-400 transition";

  const recordBtn = recording
    ? "px-3 py-1 rounded-md text-xs font-semibold bg-rose-500 text-white hover:bg-rose-400 transition"
    : "px-3 py-1 rounded-md text-xs font-semibold bg-white/10 text-slate-100 border border-white/15 hover:bg-white/15 transition";

  const slotBtn = (active: boolean, saved: boolean) =>
    [
      "w-8 h-8 rounded-md text-xs font-semibold border transition",
      active
        ? "bg-sky-500 text-white border-sky-400"
        : "bg-white/5 text-slate-100 border-white/10 hover:bg-white/10",
      saved ? "ring-1 ring-emerald-400/60" : "",
    ].join(" ");

  const maxH = isMobile ? "max-h-[45vh]" : "max-h-[38vh]";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />}

      <div
        className={[
          "fixed left-0 right-0 bottom-0 z-50",
          "transition-transform duration-200 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <div className="mx-auto w-full md:max-w-3xl">
          <div className="bg-slate-900/98 border-t border-slate-700 shadow-2xl rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-1.5 rounded-full bg-slate-600/70" />
                <span className="text-sm text-slate-100 font-semibold">Animation / Chapters</span>
                <span className="text-[11px] text-slate-400">（最大10）</span>
              </div>
              <button className="text-slate-300 hover:text-white text-sm" onClick={onClose} title="Close">
                ✕
              </button>
            </div>

            <div className={["px-4 py-3 overflow-auto", maxH].join(" ")}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Chapters</span>
                  <span className="text-[11px] text-slate-500">
                    Active: {activeChapterIndex + 1}
                    {slots[activeChapterIndex] ? " (saved)" : " (empty)"}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button className={primary} onClick={saveChapterAtActive}>
                    Save
                  </button>

                  {!isPlayingChapters ? (
                    <button className={baseBtn} onClick={startPlayChapters}>
                      ▶ Play
                    </button>
                  ) : (
                    <button className={baseBtn} onClick={stopPlayChapters}>
                      ■ Stop
                    </button>
                  )}

                  {/* 2D録画 */}
                  <button
                    className={recordBtn}
                    onClick={onRecord2D}
                    disabled={viewMode !== "2d"}
                    title={viewMode !== "2d" ? "2D表示でのみ録画できます" : "録画→自動再生→保存"}
                    style={viewMode !== "2d" ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                  >
                    {recording ? "⏺ Recording..." : "⏺ Record (2D)"}
                  </button>

                  <button className={danger} onClick={clearChapters}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {Array.from({ length: 10 }).map((_, i) => {
                  const saved = !!slots[i];
                  return (
                    <button
                      key={i}
                      className={slotBtn(i === activeChapterIndex, saved)}
                      title={saved ? `Saved: Chapter ${i + 1}` : `Empty: Chapter ${i + 1}`}
                      onClick={() => switchChapter(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                ・2D録画は「盤面キャンバス」をそのまま動画化します（環境によりMP4不可の場合はWebMで保存）
                <br />
                ・3Dでも「駒/ボールの動き」は再生できます（線は2D専用なので3Dでは表示されません）
                <br />
                ・閉じるとリンクが全面表示になります
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChapterPlayer() {
  const { chapters, isPlayingChapters, stopPlayChapters, applySnapshotInstant, setPlayersAndBall } =
    useBoardStore();

  const slots = useMemo(() => {
    const fixed = Array(10).fill(null) as (typeof chapters[number] | null)[];
    for (const c of chapters) {
      const n = Number(c.id) - 1;
      if (!Number.isNaN(n) && n >= 0 && n < 10) fixed[n] = c;
    }
    return fixed;
  }, [chapters]);

  useEffect(() => {
    if (!isPlayingChapters) return;

    const seq = slots.filter(Boolean) as NonNullable<(typeof slots)[number]>[];
    if (seq.length <= 0) {
      stopPlayChapters();
      return;
    }

    let cancelled = false;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const animateBetween = async (fromIdx: number, toIdx: number) => {
      const from = seq[fromIdx];
      const to = seq[toIdx];

      applySnapshotInstant({
        players: from.players,
        ball: from.ball,
        boardRotation: from.boardRotation,
        lines: from.lines,
      });

      await sleep(200);
      if (cancelled) return;

      const duration = 900;
      const start = performance.now();

      const fromMap = new Map(from.players.map((p) => [p.id, p]));
      const toMap = new Map(to.players.map((p) => [p.id, p]));

      const frame = (now: number) => {
        if (cancelled) return;

        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const nextPlayers = to.players.map((tp) => {
          const fp = fromMap.get(tp.id) ?? tp;
          const tp2 = toMap.get(tp.id) ?? tp;
          return {
            ...tp2,
            x: lerp(fp.x, tp2.x, eased),
            y: lerp(fp.y, tp2.y, eased),
          };
        });

        const nextBall = {
          x: lerp(from.ball.x, to.ball.x, eased),
          y: lerp(from.ball.y, to.ball.y, eased),
        };

        setPlayersAndBall(nextPlayers, nextBall);

        if (t < 1) requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
      await sleep(duration + 50);
      if (cancelled) return;

      applySnapshotInstant({
        players: to.players,
        ball: to.ball,
        boardRotation: to.boardRotation,
        lines: to.lines,
      });

      await sleep(300);
    };

    (async () => {
      try {
        if (seq.length === 1) {
          applySnapshotInstant({
            players: seq[0].players,
            ball: seq[0].ball,
            boardRotation: seq[0].boardRotation,
            lines: seq[0].lines,
          });
          await sleep(800);
          if (!cancelled) stopPlayChapters();
          return;
        }

        for (let i = 0; i < seq.length - 1; i++) {
          if (cancelled) return;
          await animateBetween(i, i + 1);
        }
      } finally {
        if (!cancelled) stopPlayChapters();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPlayingChapters, slots, stopPlayChapters, applySnapshotInstant, setPlayersAndBall]);

  return null;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const { mode3D, setMode3D, isPlayingChapters, startPlayChapters, stopPlayChapters } = useBoardStore();

  const [animOpen, setAnimOpen] = useState(false);

  // 録画：Board2Dのキャンバス参照
  const board2DRef = useRef<Board2DHandle | null>(null);

  // 録画状態
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("");

  // 「再生が終わったら録画停止」の検知用
  const prevPlayingRef = useRef<boolean>(false);
  useEffect(() => {
    const prev = prevPlayingRef.current;
    prevPlayingRef.current = isPlayingChapters;

    // true -> false に落ちた（再生終了）
    if (prev && !isPlayingChapters) {
      if (recording) {
        recorderRef.current?.stop();
      }
    }
  }, [isPlayingChapters, recording]);

  const stopAndSave = () => {
    const mime = mimeRef.current || "video/webm";
    const ext = extFromMime(mime);

    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rinkboard-animation.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const startRecord2DAndPlay = () => {
    if (viewMode !== "2d") return;
    if (recording) return;

    const canvas = board2DRef.current?.getCaptureCanvas();
    if (!canvas) {
      alert("録画用のCanvasが取得できませんでした（2D表示で試してください）");
      return;
    }

    const stream = canvas.captureStream(60); // 60fps
    const mime = pickSupportedMimeType();
    mimeRef.current = mime;

    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      console.error(e);
      alert("このブラウザでは録画できません（MediaRecorder非対応の可能性）");
      return;
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      setRecording(false);
      stopAndSave();
    };

    recorder.start(250); // 250msごとにチャンク化
    setRecording(true);

    // 録画開始したら、そのままアニメ再生
    if (isPlayingChapters) stopPlayChapters();
    startPlayChapters();
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        mode3D={mode3D}
        setMode3D={setMode3D}
        onOpenAnimation={() => setAnimOpen(true)}
      />

      <ChapterPlayer />

      <div className="flex flex-1 min-h-0">
        <Sidebar onOpenAnimation={() => setAnimOpen(true)} />
        <main className="flex-1 min-h-0 min-w-0 bg-slate-900 relative">
          {viewMode === "2d" ? <Board2D ref={board2DRef} /> : <Board3D />}
        </main>
      </div>

      <AnimationPanel
        open={animOpen}
        onClose={() => setAnimOpen(false)}
        viewMode={viewMode}
        onRecord2D={startRecord2DAndPlay}
        recording={recording}
      />
    </div>
  );
}

