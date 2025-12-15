// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Board2D from "./boards/Board2D";
import Board3D from "./boards/Board3D";
import { useBoardStore, useDrawStore } from "./store";
import type { Mode3D } from "./store";
import SeoIntro from "./components/SeoIntro";

type ViewMode = "2d" | "3d";
type PlaybackSpeed = 0.5 | 1 | 2;

function useIsMobile() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return w < 768;
}

/** ====== できるだけMP4で録画するためのmime選定 ======
 * ※Chrome/Edgeはmp4が通らないことが多く、webmになることが多いです。
 */
function pickBestMimeType(): { mimeType?: string; ext: "mp4" | "webm" } {
  // MP4候補（Safari系で通る可能性）
  const mp4Candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.64001E,mp4a.40.2",
    "video/mp4",
  ];

  // WebM候補（Chrome/Edgeで通りやすい）
  const webmCandidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  if (typeof MediaRecorder === "undefined") {
    return { ext: "webm" };
  }

  for (const m of mp4Candidates) {
    if ((MediaRecorder as any).isTypeSupported?.(m)) return { mimeType: m, ext: "mp4" };
  }
  for (const m of webmCandidates) {
    if ((MediaRecorder as any).isTypeSupported?.(m)) return { mimeType: m, ext: "webm" };
  }

  return { ext: "webm" };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
          <button
            className={viewMode === "2d" ? activeTab : inactiveTab}
            onClick={() => setViewMode("2d")}
          >
            2D View
          </button>
          <button
            className={viewMode === "3d" ? activeTab : inactiveTab}
            onClick={() => setViewMode("3d")}
          >
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
  const { activeTool, setTool, penColor, penWidth, setPenColor, setPenWidth } =
    useDrawStore();

  const itemBase =
    "w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] cursor-pointer border-l-2 transition";
  const activeItem =
    itemBase + " border-emerald-400 bg-emerald-500/10 text-emerald-300";
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
      <button
        className={activeTool === id ? activeItem : inactiveItem}
        onClick={() => setTool(id)}
      >
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

        {/* ✅ Animeボタンは無効（Arrow/Text）より上 */}
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

        {/* ★未実装なので無効化 */}
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

function AnimationPanel({
  open,
  onClose,
  onStartRecord,
  onStopRecord,
  recording,
  recordExt,
  playbackSpeed,
  setPlaybackSpeed,
}: {
  open: boolean;
  onClose: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  recording: boolean;
  recordExt: "mp4" | "webm";
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (s: PlaybackSpeed) => void;
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
    exportAllToObject,
    importAllFromObject,
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

  const slotBtn = (active: boolean, saved: boolean) =>
    [
      "w-8 h-8 rounded-md text-xs font-semibold border transition",
      active
        ? "bg-sky-500 text-white border-sky-400"
        : "bg-white/5 text-slate-100 border-white/10 hover:bg-white/10",
      saved ? "ring-1 ring-emerald-400/60" : "",
    ].join(" ");

  const maxH = isMobile ? "max-h-[45vh]" : "max-h-[38vh]";

  const [toast, setToast] = useState<string | null>(null);

  const downloadJSON = () => {
    try {
      const obj = exportAllToObject();
      const json = JSON.stringify(obj, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      downloadBlob(
        blob,
        `rinkboard-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
      );
      setToast("JSONを書き出しました（ダウンロード）");
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("書き出しに失敗しました");
      setTimeout(() => setToast(null), 2000);
    }
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = importAllFromObject(parsed);
      setToast(res.message);
      setTimeout(() => setToast(null), 2400);
    } catch {
      setToast("読み込みに失敗しました（JSONが壊れている可能性）");
      setTimeout(() => setToast(null), 2400);
    }
  };

  const speedBtn = (s: PlaybackSpeed) =>
    [
      "px-2 py-1 rounded-md text-xs border transition",
      s === playbackSpeed
        ? "bg-emerald-400 text-slate-900 border-emerald-300"
        : "bg-white/5 text-slate-100 border-white/10 hover:bg-white/10",
    ].join(" ");

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
                <span className="text-sm text-slate-100 font-semibold">
                  Animation / Chapters
                </span>
                <span className="text-[11px] text-slate-400">（最大10）</span>
              </div>
              <button
                className="text-slate-300 hover:text-white text-sm"
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className={["px-4 py-3 overflow-auto", maxH].join(" ")}>
              {toast && (
                <div className="mb-2 text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 px-2 py-1 rounded">
                  {toast}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Chapters</span>
                  <span className="text-[11px] text-slate-500">
                    Active: {activeChapterIndex + 1}
                    {slots[activeChapterIndex] ? " (saved)" : " (empty)"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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

                  <button className={danger} onClick={clearChapters}>
                    Clear
                  </button>
                </div>
              </div>

              {/* ✅ 追加：再生速度 */}
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Speed</span>
                  <span className="text-[11px] text-slate-500">
                    {playbackSpeed}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className={speedBtn(0.5)} onClick={() => setPlaybackSpeed(0.5)}>
                    0.5x
                  </button>
                  <button className={speedBtn(1)} onClick={() => setPlaybackSpeed(1)}>
                    1x
                  </button>
                  <button className={speedBtn(2)} onClick={() => setPlaybackSpeed(2)}>
                    2x
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

              {/* 録画 */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {!recording ? (
                  <button className={baseBtn} onClick={onStartRecord}>
                    ● Record ({recordExt.toUpperCase()})
                  </button>
                ) : (
                  <button className={baseBtn} onClick={onStopRecord}>
                    ■ Stop & Save
                  </button>
                )}
                <span className="text-[11px] text-slate-500">
                  ※MP4はブラウザ対応次第。非対応環境はWebMで保存されます。
                </span>
              </div>

              {/* JSON Export/Import */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button className={baseBtn} onClick={downloadJSON}>
                  ⬇ Export JSON
                </button>

                <label className={baseBtn + " cursor-pointer"}>
                  ⬆ Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <span className="text-[11px] text-slate-500">
                  （自動保存も有効：ブラウザに保存されます）
                </span>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
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

function ChapterPlayer({ playbackSpeed }: { playbackSpeed: PlaybackSpeed }) {
  const {
    chapters,
    isPlayingChapters,
    stopPlayChapters,
    applySnapshotInstant,
    setPlayersAndBall,
  } = useBoardStore();

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

    // speed: 2x => 時間を1/2、0.5x => 時間を2倍
    const timeScale = 1 / playbackSpeed;
    const sleep = (ms: number) =>
      new Promise<void>((r) => setTimeout(r, Math.max(0, ms * timeScale)));

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

      const baseDuration = 900;
      const duration = Math.max(120, baseDuration * timeScale); // 速すぎて破綻しない保険
      const start = performance.now();

      const fromMap = new Map(from.players.map((p) => [p.id, p]));
      const toMap = new Map(to.players.map((p) => [p.id, p]));

      const frame = (now: number) => {
        if (cancelled) return;

        const t = Math.min(1, (now - start) / duration);
        const eased =
          t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

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
  }, [
    isPlayingChapters,
    slots,
    stopPlayChapters,
    applySnapshotInstant,
    setPlayersAndBall,
    playbackSpeed,
  ]);

  return null;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const { mode3D, setMode3D } = useBoardStore();

  const [animOpen, setAnimOpen] = useState(false);

  // ✅ 追加：再生速度（0.5 / 1 / 2）
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // 録画
  const mainRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);

  const { ext: recordExt, mimeType } = useMemo(() => pickBestMimeType(), []);

  const startRecord = () => {
    try {
      if (recording) return;
      const root = mainRef.current;
      if (!root) return;

      const canvas = root.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas || !canvas.captureStream) return;

      const stream = canvas.captureStream(60);
      chunksRef.current = [];

      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType ?? "video/webm",
        });

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const filename = `rinkboard-animation-${stamp}.${recordExt}`;

        downloadBlob(blob, filename);

        stream.getTracks().forEach((t) => t.stop());
      };

      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
      recorderRef.current = null;
      chunksRef.current = [];
    }
  };

  const stopRecord = () => {
    try {
      if (!recording) return;
      recorderRef.current?.stop();
    } finally {
      setRecording(false);
      recorderRef.current = null;
    }
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

      <ChapterPlayer playbackSpeed={playbackSpeed} />

      <div className="flex flex-1 min-h-0">
        <Sidebar onOpenAnimation={() => setAnimOpen(true)} />
        <main ref={mainRef} className="flex-1 min-h-0 min-w-0 bg-slate-900 relative">
          {viewMode === "2d" ? <Board2D /> : <Board3D />}
          <SeoIntro/>
        </main>
      </div>

      <AnimationPanel
        open={animOpen}
        onClose={() => setAnimOpen(false)}
        onStartRecord={startRecord}
        onStopRecord={stopRecord}
        recording={recording}
        recordExt={recordExt}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
      />
    </div>
  );
}

