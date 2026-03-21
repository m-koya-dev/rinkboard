import { useEffect, useMemo, useRef, useState } from "react";
import Board2D from "./boards/Board2D";
import Board3D from "./boards/Board3D";
import { useBoardStore, useDrawStore, useUiStore } from "./store";
import type { Mode3D, TeamId, Role } from "./store";
import SeoIntro from "./components/SeoIntro";
import { t } from "./i18n";
import PitchPage from "./components/PitchPage";
import { decodeStateFromParam, encodeStateToParam } from "./share";
import RactixBrand from "./components/RactixBrand";

type ViewMode = "2d" | "3d";
type PlaybackSpeed = 0.5 | 1 | 2;
type ShareCopiedKind = "edit" | "view" | null;

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
  const mp4Candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.64001E,mp4a.40.2",
    "video/mp4",
  ];

  const webmCandidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  if (typeof MediaRecorder === "undefined") {
    return { ext: "webm" };
  }

  for (const m of mp4Candidates) {
    if ((MediaRecorder as any).isTypeSupported?.(m)) {
      return { mimeType: m, ext: "mp4" };
    }
  }
  for (const m of webmCandidates) {
    if ((MediaRecorder as any).isTypeSupported?.(m)) {
      return { mimeType: m, ext: "webm" };
    }
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
  onOpenPlayers,
  lang,
  toggleLang,
  readOnly,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  mode3D: Mode3D;
  setMode3D: (m: Mode3D) => void;
  onOpenAnimation: () => void;
  onOpenPlayers: () => void;
  lang: "ja" | "en";
  toggleLang: () => void;
  readOnly: boolean;
}) {
  const { rotateBoard, resetPositions } = useBoardStore();
  const { undo, redo, clearAllLines } = useDrawStore();

  const tabBase = "px-3 py-1 rounded-full text-sm font-medium border transition";
  const activeTab = tabBase + " bg-emerald-500 text-white border-emerald-500";
  const inactiveTab =
    tabBase + " bg-white/5 text-slate-100 border-white/10 hover:bg-white/10";

  const buttonBase =
    "inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border border-white/15 text-slate-100 transition";
  const buttonEnabled = "hover:bg-white/10";
  const buttonDisabled = "opacity-40 cursor-not-allowed";

  const mode3DBase = "px-2 py-0.5 rounded-full text-[11px] border transition";
  const mode3DActive = mode3DBase + " bg-sky-500 text-white border-sky-400";
  const mode3DInactive =
    mode3DBase + " bg-white/5 text-slate-100 border-white/10 hover:bg-white/10";
  const mode3DDisabled =
    mode3DBase + " bg-white/5 text-slate-500 border-white/10 opacity-50 cursor-not-allowed";

  const editDisabled = readOnly;

  return (
    <header className="flex items-center justify-between px-4 py-1 bg-slate-900/95 border-b border-slate-800">
      {/* 左：ロゴ */}
      <RactixBrand compact />

      <div className="flex flex-col items-center gap-1">
        <div className="bg-slate-800/80 border border-slate-700 rounded-full p-1 flex items-center gap-1">
          <button
            className={viewMode === "2d" ? activeTab : inactiveTab}
            onClick={() => setViewMode("2d")}
          >
            {t(lang, "header.view.2d")}
          </button>
          <button
            className={viewMode === "3d" ? activeTab : inactiveTab}
            onClick={() => setViewMode("3d")}
          >
            {t(lang, "header.view.3d")}
          </button>
        </div>

        {viewMode === "3d" && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="text-[10px] text-slate-400">{t(lang, "header.mode3d.label")}</span>
            <button
              className={mode3D === "camera" ? mode3DActive : mode3DInactive}
              onClick={() => setMode3D("camera")}
            >
              {t(lang, "header.mode3d.camera")}
            </button>
            <button
              className={readOnly ? mode3DDisabled : mode3D === "piece" ? mode3DActive : mode3DInactive}
              onClick={() => {
                if (readOnly) return;
                setMode3D("piece");
              }}
              disabled={readOnly}
              title={readOnly ? t(lang, "common.viewOnly") : undefined}
            >
              {t(lang, "header.mode3d.pieces")}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {readOnly && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-200 border border-amber-400/25">
            🔒 {t(lang, "common.viewOnly")}
          </span>
        )}

        <button
          className={`${buttonBase} ${buttonEnabled}`}
          onClick={onOpenAnimation}
        >
          {t(lang, "header.btn.animation")}
        </button>

        <button
          className={`${buttonBase} ${editDisabled ? buttonDisabled : buttonEnabled}`}
          onClick={undo}
          disabled={editDisabled}
          title={editDisabled ? t(lang, "common.viewOnly") : undefined}
        >
          {t(lang, "header.btn.undo")}
        </button>

        <button
          className={`${buttonBase} ${editDisabled ? buttonDisabled : buttonEnabled}`}
          onClick={redo}
          disabled={editDisabled}
          title={editDisabled ? t(lang, "common.viewOnly") : undefined}
        >
          {t(lang, "header.btn.redo")}
        </button>

        <button
          className={`${buttonBase} ${editDisabled ? buttonDisabled : buttonEnabled}`}
          onClick={rotateBoard}
          disabled={editDisabled}
          title={editDisabled ? t(lang, "common.viewOnly") : undefined}
        >
          {t(lang, "header.btn.rotate")}
        </button>

        <button
          className={`${buttonBase} ${editDisabled ? buttonDisabled : buttonEnabled}`}
          onClick={() => {
            clearAllLines();
            resetPositions();
          }}
          disabled={editDisabled}
          title={editDisabled ? t(lang, "common.viewOnly") : undefined}
        >
          {t(lang, "header.btn.reset")}
        </button>

        <button
          className={`${buttonBase} ${editDisabled ? buttonDisabled : buttonEnabled}`}
          onClick={onOpenPlayers}
          disabled={editDisabled}
          title={editDisabled ? t(lang, "common.viewOnly") : t(lang, "header.btn.players")}
        >
          {t(lang, "header.btn.players")}
        </button>

        <button
          className={`${buttonBase} ${buttonEnabled}`}
          onClick={toggleLang}
          title={t(lang, "lang.toggleTitle")}
        >
          {lang === "ja" ? t(lang, "lang.en") : t(lang, "lang.jp")}
        </button>
      </div>
    </header>
  );
}

function Sidebar({
  onOpenAnimation,
  readOnly,
  lang,
}: {
  onOpenAnimation: () => void;
  readOnly: boolean;
  lang: "ja" | "en";
}) {
  const { activeTool, setTool, penColor, penWidth, setPenColor, setPenWidth } = useDrawStore();

  const itemBase =
    "w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] border-l-2 transition";
  const activeItem =
    itemBase + " cursor-pointer border-emerald-400 bg-emerald-500/10 text-emerald-300";
  const inactiveItem =
    itemBase + " cursor-pointer border-transparent text-slate-300 hover:bg:white/5 hover:border-slate-600";
  const disabledItem =
    itemBase + " border-transparent text-slate-500 opacity-50 cursor-not-allowed";

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
        <div className={disabledItem} title={t(lang, "common.viewOnly")}>
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
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
        <ToolButton id="select" label={t(lang, "tool.select")} icon="🖱" />
        <ToolButton id="pen" label={t(lang, "tool.pen")} icon="✏️" disabled={readOnly} />
        <ToolButton id="eraser" label={t(lang, "tool.eraser")} icon="🧽" disabled={readOnly} />

        <button
          className="mt-2 w-full flex flex-col items-center gap-1 px-2 py-3 text-[11px] cursor-pointer border-l-2 border-transparent text-slate-300 hover:bg:white/5 hover:border-slate-600 transition"
          onClick={onOpenAnimation}
          title={t(lang, "anim.title")}
        >
          <span className="text-lg">🎞</span>
          <span>{t(lang, "sidebar.anime")}</span>
        </button>

        <ToolButton id="arrow" label={t(lang, "tool.arrow")} icon="➡️" disabled={readOnly} />
        <ToolButton id="text" label={t(lang, "tool.text")} icon="🅣" disabled={readOnly} />
      </div>

      <div className="border-t border-slate-700 pt-2 px-2 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">{t(lang, "sidebar.penColor")}</span>
          <div className="flex gap-1 justify-between">
            {["#111827", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b"].map((c) => (
              <button
                key={c}
                className={`w-4 h-4 rounded-full border ${
                  penColor === c ? "ring-2 ring-emerald-400 border-white" : "border-slate-500"
                } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  if (readOnly) return;
                  setPenColor(c);
                }}
                disabled={readOnly}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">{t(lang, "sidebar.penWidth")}</span>
          <input
            type="range"
            min={1}
            max={8}
            value={penWidth}
            onChange={(e) => {
              if (readOnly) return;
              setPenWidth(Number(e.target.value));
            }}
            className={`w-full ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
            disabled={readOnly}
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
  onCopyEditLink,
  onCopyViewLink,
  shareCopied,
  readOnly,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  recording: boolean;
  recordExt: "mp4" | "webm";
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (s: PlaybackSpeed) => void;
  onCopyEditLink: () => void;
  onCopyViewLink: () => void;
  shareCopied: ShareCopiedKind;
  readOnly: boolean;
  lang: "ja" | "en";
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

  const baseBtn = "px-2 py-1 rounded-md text-xs border border-white/15 transition";
  const baseBtnEnabled = "hover:bg-white/10";
  const baseBtnDisabled = "opacity-40 cursor-not-allowed";
  const primary =
    "px-3 py-1 rounded-md text-xs font-medium bg-emerald-500 text-slate-900 hover:bg-emerald-400 transition";
  const primaryDisabled =
    "px-3 py-1 rounded-md text-xs font-medium bg-emerald-500 text-slate-900 opacity-40 cursor-not-allowed";
  const danger =
    "px-3 py-1 rounded-md text-xs font-medium bg-rose-500 text-white hover:bg-rose-400 transition";
  const dangerDisabled =
    "px-3 py-1 rounded-md text-xs font-medium bg-rose-500 text-white opacity-40 cursor-not-allowed";

  const slotBtn = (active: boolean, saved: boolean, disabled: boolean) =>
    [
      "w-8 h-8 rounded-md text-xs font-semibold border transition",
      active ? "bg-sky-500 text-white border-sky-400" : "bg-white/5 text-slate-100 border-white/10 hover:bg-white/10",
      saved ? "ring-1 ring-emerald-400/60" : "",
      disabled ? "opacity-40 cursor-not-allowed hover:bg-white/5" : "",
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
      setToast(t(lang, "anim.toast.exported"));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t(lang, "anim.toast.exportFailed"));
      setTimeout(() => setToast(null), 2000);
    }
  };

  const onPickFile = async (file: File | null) => {
    if (!file || readOnly) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = importAllFromObject(parsed);
      setToast(res.message);
      setTimeout(() => setToast(null), 2400);
    } catch {
      setToast(t(lang, "anim.toast.importFailed"));
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
                <span className="text-sm text-slate-100 font-semibold">{t(lang, "anim.title")}</span>
                <span className="text-[11px] text-slate-400">{t(lang, "anim.max10")}</span>
                {readOnly && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/25">
                    🔒 {t(lang, "common.viewOnly")}
                  </span>
                )}
              </div>
              <button className="text-slate-300 hover:text-white text-sm" onClick={onClose} title={t(lang, "common.close")}>
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
                  <span className="text-xs text-slate-300">{t(lang, "anim.chapters")}</span>
                  <span className="text-[11px] text-slate-500">
                    {t(lang, "anim.active")}: {activeChapterIndex + 1}{" "}
                    {slots[activeChapterIndex]
                      ? t(lang, "anim.saved")
                      : t(lang, "anim.empty")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className={readOnly ? primaryDisabled : primary}
                    onClick={saveChapterAtActive}
                    disabled={readOnly}
                  >
                    {t(lang, "anim.btn.save")}
                  </button>

                  {!isPlayingChapters ? (
                    <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={startPlayChapters}>
                      {t(lang, "anim.btn.play")}
                    </button>
                  ) : (
                    <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={stopPlayChapters}>
                      {t(lang, "anim.btn.stop")}
                    </button>
                  )}

                  <button
                    className={readOnly ? dangerDisabled : danger}
                    onClick={clearChapters}
                    disabled={readOnly}
                  >
                    {t(lang, "anim.btn.clear")}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">{t(lang, "anim.speed")}</span>
                  <span className="text-[11px] text-slate-500">{playbackSpeed}x</span>
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
                      className={slotBtn(i === activeChapterIndex, saved, readOnly)}
                      title={
                        readOnly
                          ? t(lang, "common.viewOnly")
                          : saved
                          ? `${t(lang, "anim.saved")} ${i + 1}`
                          : `${t(lang, "anim.empty")} ${i + 1}`
                      }
                      onClick={() => {
                        if (readOnly) return;
                        switchChapter(i);
                      }}
                      disabled={readOnly}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {!recording ? (
                  <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={onStartRecord}>
                    {t(lang, "anim.record")} ({recordExt.toUpperCase()})
                  </button>
                ) : (
                  <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={onStopRecord}>
                    {t(lang, "anim.stopSave")}
                  </button>
                )}
                <span className="text-[11px] text-slate-500">
                  {t(lang, "anim.recordNote")}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={downloadJSON}>
                  {t(lang, "anim.exportJson")}
                </button>

                <label
                  className={`${baseBtn} ${readOnly ? baseBtnDisabled : baseBtnEnabled} cursor-pointer`}
                >
                  {t(lang, "anim.importJson")}
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                    disabled={readOnly}
                  />
                </label>

                <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={onCopyEditLink}>
                  {t(lang, "share.copyEdit")}
                </button>

                <button className={`${baseBtn} ${baseBtnEnabled}`} onClick={onCopyViewLink}>
                  {t(lang, "share.copyView")}
                </button>

                {shareCopied === "edit" && (
                  <span className="text-[11px] text-emerald-200">{t(lang, "share.copiedEdit")}</span>
                )}
                {shareCopied === "view" && (
                  <span className="text-[11px] text-emerald-200">{t(lang, "share.copiedView")}</span>
                )}

                <span className="text-[11px] text-slate-500">
                  {t(lang, "anim.autosaveNote")}
                </span>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                {t(lang, "anim.note1")}
                <br />
                {t(lang, "anim.note2")}
                {readOnly && (
                  <>
                    <br />
                    {t(lang, "anim.noteReadOnly")}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PlayersPanel({
  open,
  onClose,
  readOnly,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  readOnly: boolean;
  lang: "ja" | "en";
}) {
  const isMobile = useIsMobile();
  const { players, selectedId, selectPlayer, addPlayer, removePlayer, setPlayerNumber } = useBoardStore();

  const selected = players.find((p) => p.id === selectedId) ?? null;

  const baseBtn = "px-2 py-1 rounded-md text-xs border border-white/15 transition";
  const baseBtnEnabled = "hover:bg-white/10";
  const baseBtnDisabled = "opacity-40 cursor-not-allowed";
  const primary =
    "px-3 py-1 rounded-md text-xs font-medium bg-emerald-500 text-slate-900 hover:bg-emerald-400 transition";
  const primaryDisabled =
    "px-3 py-1 rounded-md text-xs font-medium bg-emerald-500 text-slate-900 opacity-40 cursor-not-allowed";
  const danger =
    "px-3 py-1 rounded-md text-xs font-medium bg-rose-500 text-white hover:bg-rose-400 transition";
  const dangerDisabled =
    "px-3 py-1 rounded-md text-xs font-medium bg-rose-500 text-white opacity-40 cursor-not-allowed";

  const maxH = isMobile ? "max-h-[45vh]" : "max-h-[38vh]";

  const [addPicking, setAddPicking] = useState(false);
  const [addRole, setAddRole] = useState<Role>("FP");

  const teamBtn = (team: TeamId, disabled: boolean) =>
    [
      "px-3 py-1 rounded-md text-xs font-medium border transition",
      team === "A"
        ? "bg-sky-500/20 text-sky-200 border-sky-400/40 hover:bg-sky-500/30"
        : "bg-orange-500/20 text-orange-200 border-orange-400/40 hover:bg-orange-500/30",
      disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "",
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
                <span className="text-sm text-slate-100 font-semibold">{t(lang, "players.title")}</span>
                <span className="text-[11px] text-slate-400">{t(lang, "players.sub")}</span>
                {readOnly && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/25">
                    🔒 {t(lang, "common.viewOnly")}
                  </span>
                )}
              </div>
              <button className="text-slate-300 hover:text-white text-sm" onClick={onClose} title={t(lang, "common.close")}>
                ✕
              </button>
            </div>

            <div className={["px-4 py-3 overflow-auto", maxH].join(" ")}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[12px] text-slate-200">
                  {t(lang, "players.selected")}{" "}
                  {selected ? (
                    <span className="font-semibold">
                      {selected.id}（Team {selected.team} / {selected.role}）
                    </span>
                  ) : (
                    <span className="text-slate-400">{t(lang, "players.none")}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!addPicking ? (
                    <button
                      className={readOnly ? primaryDisabled : primary}
                      onClick={() => {
                        if (readOnly) return;
                        setAddPicking(true);
                      }}
                      disabled={readOnly}
                      title={readOnly ? t(lang, "common.viewOnly") : t(lang, "players.btn.add")}
                    >
                      {t(lang, "players.btn.add")}
                    </button>
                  ) : (
                    <button
                      className={`${baseBtn} ${readOnly ? baseBtnDisabled : baseBtnEnabled}`}
                      onClick={() => {
                        if (readOnly) return;
                        setAddPicking(false);
                      }}
                      disabled={readOnly}
                      title={t(lang, "players.btn.cancel")}
                    >
                      {t(lang, "players.btn.cancel")}
                    </button>
                  )}

                  <button
                    className={readOnly || !selected ? dangerDisabled : danger}
                    disabled={readOnly || !selected}
                    onClick={() => {
                      if (readOnly || !selected) return;
                      removePlayer(selected.id);
                    }}
                    title={readOnly ? t(lang, "common.viewOnly") : t(lang, "players.btn.delete")}
                  >
                    {t(lang, "players.btn.delete")}
                  </button>
                </div>
              </div>

              {addPicking && (
                <div className="mt-3 p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-slate-300">{t(lang, "players.addPrompt")}</div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{t(lang, "players.role")}</span>
                      <select
                        className={`text-xs bg-slate-900 border border-white/15 rounded px-2 py-1 text-slate-100 ${
                          readOnly ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                        value={addRole}
                        onChange={(e) => {
                          if (readOnly) return;
                          setAddRole((e.target.value as Role) ?? "FP");
                        }}
                        disabled={readOnly}
                      >
                        <option value="FP">FP</option>
                        <option value="GK">GK</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className={teamBtn("A", readOnly)}
                      onClick={() => {
                        if (readOnly) return;
                        addPlayer("A", addRole);
                        setAddPicking(false);
                      }}
                      disabled={readOnly}
                    >
                      {t(lang, "players.teamA")}
                    </button>
                    <button
                      className={teamBtn("B", readOnly)}
                      onClick={() => {
                        if (readOnly) return;
                        addPlayer("B", addRole);
                        setAddPicking(false);
                      }}
                      disabled={readOnly}
                    >
                      {t(lang, "players.teamB")}
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    {t(lang, "players.addNote1")}
                    <br />
                    {t(lang, "players.addNote2")}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <div className="text-xs text-slate-300">{t(lang, "players.number")}</div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={selected ? selected.number : ""}
                  disabled={readOnly || !selected}
                  onChange={(e) => {
                    if (readOnly || !selected) return;
                    setPlayerNumber(selected.id, Number(e.target.value));
                  }}
                  className="w-24 text-xs bg-slate-900 border border-white/15 rounded px-2 py-1 text-slate-100 disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-500">{t(lang, "players.numberHelp")}</span>
              </div>

              <div className="mt-4">
                <div className="text-[11px] text-slate-400 mb-2">{t(lang, "players.list")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {players.map((p) => {
                    const active = p.id === selectedId;
                    return (
                      <button
                        key={p.id}
                        className={[
                          "text-left px-3 py-2 rounded-lg border transition",
                          active ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                        ].join(" ")}
                        onClick={() => selectPlayer(active ? null : p.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-100 font-semibold">{p.id}</div>
                          <div className="text-[11px] text-slate-400">#{p.number}</div>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          Team {p.team} / {p.role} ・ ({p.x.toFixed(1)}, {p.y.toFixed(1)})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                {t(lang, "players.footer1")}
                <br />
                {t(lang, "players.footer2")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChapterPlayer({ playbackSpeed }: { playbackSpeed: PlaybackSpeed }) {
  const { chapters, isPlayingChapters, stopPlayChapters, applySnapshotInstant, setPlayersAndBall } = useBoardStore();

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
        arrows: from.arrows ?? [],
        texts: from.texts ?? [],
      });

      await sleep(200);
      if (cancelled) return;

      const baseDuration = 900;
      const duration = Math.max(120, baseDuration * timeScale);
      const start = performance.now();

      const fromMap = new Map(from.players.map((p) => [p.id, p]));
      const toMap = new Map(to.players.map((p) => [p.id, p]));

      const frame = (now: number) => {
        if (cancelled) return;

        const t01 = Math.min(1, (now - start) / duration);
        const eased = t01 < 0.5 ? 2 * t01 * t01 : 1 - Math.pow(-2 * t01 + 2, 2) / 2;

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

        if (t01 < 1) requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
      await sleep(duration + 50);
      if (cancelled) return;

      applySnapshotInstant({
        players: to.players,
        ball: to.ball,
        boardRotation: to.boardRotation,
        lines: to.lines,
        arrows: to.arrows ?? [],
        texts: to.texts ?? [],
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
            arrows: seq[0].arrows ?? [],
            texts: seq[0].texts ?? [],
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
  }, [isPlayingChapters, slots, stopPlayChapters, applySnapshotInstant, setPlayersAndBall, playbackSpeed]);

  return null;
}

export default function App() {
  const { lang, toggleLang } = useUiStore();

  const sp0 = new URLSearchParams(window.location.search);
  const s0 = sp0.get("s");
  const page0 = sp0.get("page");
  const ro0 = sp0.get("ro");
  const readOnly = ro0 === "1";

  const isPitch = page0 === "pitch" && !s0;

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("s");
    if (!s) return;

    try {
      const data = decodeStateFromParam(s);
      const res = useBoardStore.getState().importAllFromObject(data);

      if (res.ok) {
        sp.delete("s");
        sp.delete("page");
        const url = new URL(window.location.href);
        url.search = sp.toString();
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // 壊れたURLでも落とさない
    }
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const { mode3D, setMode3D } = useBoardStore();

  const [animOpen, setAnimOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState<ShareCopiedKind>(null);

  const buildShareUrl = (viewOnly: boolean) => {
    const obj = useBoardStore.getState().exportAllToObject();
    const s = encodeStateToParam(obj);

    const url = new URL(window.location.href);
    url.searchParams.set("s", s);
    url.searchParams.delete("page");

    if (viewOnly) {
      url.searchParams.set("ro", "1");
    } else {
      url.searchParams.delete("ro");
    }

    return url.toString();
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const copyEditLink = async () => {
    const ok = await copyText(buildShareUrl(false));
    if (!ok) return;
    setShareCopied("edit");
    setTimeout(() => setShareCopied(null), 1500);
  };

  const copyViewLink = async () => {
    const ok = await copyText(buildShareUrl(true));
    if (!ok) return;
    setShareCopied("view");
    setTimeout(() => setShareCopied(null), 1500);
  };

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

      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType ?? "video/webm" });
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
        onOpenPlayers={() => {
          if (readOnly) return;
          setPlayersOpen(true);
        }}
        lang={lang}
        toggleLang={toggleLang}
        readOnly={readOnly}
      />

      <ChapterPlayer playbackSpeed={playbackSpeed} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          onOpenAnimation={() => setAnimOpen(true)}
          readOnly={readOnly}
          lang={lang}
        />
        <main ref={mainRef} className="flex-1 min-h-0 min-w-0 bg-slate-900 relative">
          {isPitch ? (
            <PitchPage
              lang={lang}
              onOpenBoard={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("page");
                window.location.href = url.toString();
              }}
            />
          ) : (
            <>
              {viewMode === "2d" ? (
                <Board2D readOnly={readOnly} />
              ) : (
                <Board3D readOnly={readOnly} />
              )}
              <SeoIntro />
            </>
          )}
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
        onCopyEditLink={copyEditLink}
        onCopyViewLink={copyViewLink}
        shareCopied={shareCopied}
        readOnly={readOnly}
        lang={lang}
      />

      <PlayersPanel
        open={playersOpen}
        onClose={() => setPlayersOpen(false)}
        readOnly={readOnly}
        lang={lang}
      />
    </div>
  );
}