// ★ 重要：このファイルを丸ごと置き換えてください ★

import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Line,
  Circle,
  Group,
  Text,
} from "react-konva";
import { BOUNDS, useBoardStore, useDrawStore } from "../store";

function useLayout() {
  const [size, setSize] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });

  useEffect(() => {
    const onR = () =>
      setSize({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const worldW = 30;
  const worldH = 15;
  const pad = 40;
  const scale = Math.min(
    (size.w - pad * 2) / worldW,
    (size.h - pad * 2) / worldH
  );

  const rinkW = worldW * scale;
  const rinkH = worldH * scale;
  const offsetX = (size.w - rinkW) / 2;
  const offsetY = (size.h - rinkH) / 2;

  return {
    size,
    scale,
    worldW,
    worldH,
    rinkW,
    rinkH,
    offsetX,
    offsetY,
  };
}

function makeConverters(worldW: number, worldH: number, scale: number) {
  const toLocal = (x: number, y: number) => ({
    x: (x + worldW / 2) * scale,
    y: (worldH / 2 - y) * scale,
  });

  const toWorld = (lx: number, ly: number) => ({
    x: lx / scale - worldW / 2,
    y: worldH / 2 - ly / scale,
  });

  return { toLocal, toWorld };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function PlayerToken({
  id,
  x,
  y,
  color,
  number,
  toLocal,
  toWorldLocal,
  boardRotation,
  spacePressed,
}: any) {
  const { selectedId, selectPlayer, updatePlayer } = useBoardStore();
  const sel = selectedId === id;
  const lp = toLocal(x, y);

  const radius = 14;
  const fontSize = radius * 1.2;

  return (
    <Group
      x={lp.x}
      y={lp.y}
      draggable={!spacePressed}
      dragBoundFunc={(pos) => {
        const w = toWorldLocal(pos.x, pos.y);
        const nx = clamp(w.x, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
        const ny = clamp(w.y, BOUNDS.yMin + 0.5, BOUNDS.yMax - 0.5);
        return toLocal(nx, ny);
      }}
      onDragEnd={(e) => {
        const w = toWorldLocal(e.target.x(), e.target.y());
        updatePlayer(id, { x: w.x, y: w.y });
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        selectPlayer(sel ? null : id);
      }}
    >
      {sel && (
        <Circle
          radius={radius + 6}
          stroke="#10b981"
          strokeWidth={3}
          opacity={0.9}
        />
      )}
      <Circle
        radius={radius}
        fill={color}
        stroke="#0f172a"
        strokeWidth={2}
      />
      <Group rotation={-boardRotation * 90}>
        <Text
          text={String(number)}
          fontSize={fontSize}
          fill="#fff"
          fontStyle="bold"
          offsetX={fontSize / 2}
          offsetY={fontSize / 2}
        />
      </Group>
    </Group>
  );
}

export default function Board2D() {
  const { players, selectPlayer, ball, updateBall, boardRotation } =
    useBoardStore();
  const {
    size,
    scale,
    worldW,
    worldH,
    rinkW,
    rinkH,
    offsetX,
    offsetY,
  } = useLayout();
  const { toLocal, toWorld } = makeConverters(worldW, worldH, scale);
  const {
    lines,
    penEnabled,
    eraserEnabled,
    penColor,
    penWidth,
    addLine,
    eraseLine,
  } = useDrawStore();

  const boardRef = useRef<any>(null);

  const [spacePressed, setSpacePressed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ===== Spaceキー状態 =====
  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  // ====== パン開始 ======
  const handlePanStart = (e: any) => {
    if (!spacePressed) return;

    setIsPanning(true);
    const pos = e.target.getStage().getPointerPosition();
    setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
  };

  // ====== パン中 ======
  const handlePanMove = (e: any) => {
    if (!isPanning || !spacePressed) return;

    const pos = e.target.getStage().getPointerPosition();

    setPan({
      x: pos.x - panStart.x,
      y: pos.y - panStart.y,
    });
  };

  // ====== パン終了 ======
  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // ====== ペン描き ======
  const [currentLineWorld, setCurrentLineWorld] = useState<number[]>([]);

  const getLocalFromStage = (stage: any) => {
    const pos = stage.getPointerPosition();
    if (!pos || !boardRef.current) return null;

    const transform = boardRef.current.getAbsoluteTransform().copy();
    transform.invert();

    return transform.point(pos);
  };

  const handleMouseDown = (e: any) => {
    if (spacePressed) {
      handlePanStart(e);
      return;
    }

    if (!penEnabled) return;

    const stage = e.target.getStage();
    const local = getLocalFromStage(stage);
    if (!local) return;
    if (local.x < 0 || local.y < 0 || local.x > rinkW || local.y > rinkH)
      return;

    const w = toWorld(local.x, local.y);
    setCurrentLineWorld([w.x, w.y]);
  };

  const handleMouseMove = (e: any) => {
    if (spacePressed) {
      handlePanMove(e);
      return;
    }

    if (!penEnabled || currentLineWorld.length === 0) return;
    const stage = e.target.getStage();
    const local = getLocalFromStage(stage);
    if (!local) return;
    if (local.x < 0 || local.y < 0 || local.x > rinkW || local.y > rinkH)
      return;

    const w = toWorld(local.x, local.y);
    setCurrentLineWorld((prev) => [...prev, w.x, w.y]);
  };

  const handleMouseUp = () => {
    if (spacePressed) {
      handlePanEnd();
      return;
    }

    if (!penEnabled || currentLineWorld.length < 4) {
      setCurrentLineWorld([]);
      return;
    }

    addLine({
      points: currentLineWorld,
      color: penColor,
      width: penWidth,
    });
    setCurrentLineWorld([]);
  };

  // ===== UI描画 =====
  const midTop = toLocal(0, BOUNDS.yMax);
  const midBot = toLocal(0, BOUNDS.yMin);
  const center = toLocal(0, 0);
  const centerCircleR = 1.5 * scale;

  const penaltyBackXLeft = BOUNDS.xMin + 2.5;
  const penaltyFrontXLeft = -7;
  const penaltyBackXRight = BOUNDS.xMax - 2.5;
  const penaltyFrontXRight = 7;
  const penaltyHeightPx = 6 * scale;
  const penaltyWidthPx =
    (penaltyFrontXLeft - penaltyBackXLeft) * scale;

  const penaltyCenterLeftPx = toLocal(
    (penaltyBackXLeft + penaltyFrontXLeft) / 2,
    0
  );
  const penaltyCenterRightPx = toLocal(
    (penaltyBackXRight + penaltyFrontXRight) / 2,
    0
  );

  const pkLeftPx = toLocal(penaltyFrontXLeft, 0);
  const pkRightPx = toLocal(penaltyFrontXRight, 0);
  const pkR = 0.16 * scale;

  const frontDots = [toLocal(-6, 0), toLocal(6, 0)];
  const dotR = 0.12 * scale;

  const goalRectW = 1.2 * scale;
  const goalRectH = 3 * scale;

  const goalLeftPx = toLocal(BOUNDS.xMin + 1.5, 0);
  const goalRightPx = toLocal(BOUNDS.xMax - 1.5, 0);

  const ballLocal = toLocal(ball.x, ball.y);
  const ballR = 0.25 * scale;

  const outerFrameColor = "#22c55e";
  const rinkFill = "#fbe4cf";
  const goalAreaFill = "#f8d2b0";
  const lineColor = "#1e3a8a";
  const lineW = 0.08 * scale;
  const cornerR = 1.5 * scale;
  const outerMargin = 12;

  return (
    <Stage
      width={size.w}
      height={size.h}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => selectPlayer(null)}
    >
      <Layer>
        {/* ==== パン（スクロール）を適用するグループ ==== */}
        <Group x={pan.x} y={pan.y}>
          {/* --- リンク全体を回転するグループ --- */}
          <Group
            ref={boardRef}
            x={offsetX + rinkW / 2}
            y={offsetY + rinkH / 2}
            offsetX={rinkW / 2}
            offsetY={rinkH / 2}
            rotation={boardRotation * 90}
          >
            {/* 外枠 */}
            <Rect
              x={-outerMargin}
              y={-outerMargin}
              width={rinkW + outerMargin * 2}
              height={rinkH + outerMargin * 2}
              fill={outerFrameColor}
              cornerRadius={cornerR + outerMargin}
            />

            {/* コート */}
            <Rect
              x={0}
              y={0}
              width={rinkW}
              height={rinkH}
              cornerRadius={cornerR}
              fill={rinkFill}
              stroke="#111"
              strokeWidth={2}
            />

            {/* センターライン */}
            <Line
              points={[midTop.x, midTop.y, midBot.x, midBot.y]}
              stroke={lineColor}
              strokeWidth={lineW}
            />

            {/* センターサークル */}
            <Circle
              x={center.x}
              y={center.y}
              radius={centerCircleR}
              stroke={lineColor}
              strokeWidth={lineW}
            />

            {/* ペナルティエリア */}
            {[penaltyCenterLeftPx, penaltyCenterRightPx].map((p, i) => (
              <Group key={i}>
                <Rect
                  x={p.x - penaltyWidthPx / 2}
                  y={center.y - penaltyHeightPx / 2}
                  width={penaltyWidthPx}
                  height={penaltyHeightPx}
                  fill={goalAreaFill}
                />
                <Rect
                  x={p.x - penaltyWidthPx / 2}
                  y={center.y - penaltyHeightPx / 2}
                  width={penaltyWidthPx}
                  height={penaltyHeightPx}
                  stroke={lineColor}
                  strokeWidth={lineW}
                />
              </Group>
            ))}

            {/* ペナルティ前の中央ドット */}
            {frontDots.map((d, i) => (
              <Circle
                key={i}
                x={d.x}
                y={d.y}
                radius={dotR}
                fill={lineColor}
              />
            ))}

            {/* PKスポット */}
            <Circle
              x={pkLeftPx.x}
              y={pkLeftPx.y}
              radius={pkR}
              fill={lineColor}
            />
            <Circle
              x={pkRightPx.x}
              y={pkRightPx.y}
              radius={pkR}
              fill={lineColor}
            />

            {/* ゴール */}
            {[goalLeftPx, goalRightPx].map((g, idx) => (
              <Rect
                key={idx}
                x={idx === 0 ? g.x : g.x - goalRectW}
                y={center.y - goalRectH / 2}
                width={goalRectW}
                height={goalRectH}
                fill="#fefce8"
                stroke="#f97316"
                strokeWidth={3}
              />
            ))}

            {/* 完了線 */}
            {lines.map((ln, i) => (
              <Line
                key={i}
                points={ln.points.flatMap((v, i) =>
                  i % 2 === 0
                    ? toLocal(ln.points[i], ln.points[i + 1]).x
                    : toLocal(ln.points[i - 1], v).y
                )}
                stroke={ln.color}
                strokeWidth={ln.width}
                lineCap="round"
                lineJoin="round"
                hitStrokeWidth={ln.width + 8}
                onClick={(e) => {
                  if (!eraserEnabled) return;
                  e.cancelBubble = true;
                  eraseLine(i);
                }}
              />
            ))}

            {/* 描き途中の線 */}
            {currentLineWorld.length > 0 && (
              <Line
                points={currentLineWorld.flatMap((v, i) =>
                  i % 2 === 0
                    ? toLocal(currentLineWorld[i], currentLineWorld[i + 1]).x
                    : toLocal(currentLineWorld[i - 1], v).y
                )}
                stroke={penColor}
                strokeWidth={penWidth}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* ボール */}
            <Group
              x={ballLocal.x}
              y={ballLocal.y}
              draggable={!spacePressed}
              dragBoundFunc={(pos) => {
                const w = toWorld(pos.x, pos.y);
                return toLocal(
                  clamp(w.x, BOUNDS.xMin + 0.3, BOUNDS.xMax - 0.3),
                  clamp(w.y, BOUNDS.yMin + 0.3, BOUNDS.yMax - 0.3)
                );
              }}
              onDragEnd={(e) => {
                const w = toWorld(e.target.x(), e.target.y());
                updateBall({ x: w.x, y: w.y });
              }}
            >
              <Circle radius={ballR} fill="#111" />
            </Group>

            {/* プレイヤー */}
            {players.map((p) => (
              <PlayerToken
                key={p.id}
                {...p}
                toLocal={toLocal}
                toWorldLocal={toWorld}
                boardRotation={boardRotation}
                spacePressed={spacePressed}
              />
            ))}
          </Group>
        </Group>
      </Layer>
    </Stage>
  );
}






