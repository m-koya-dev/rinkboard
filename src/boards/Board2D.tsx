// src/boards/Board2D.tsx
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Circle, Group, Text } from "react-konva";
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

  // 画面幅でモバイル判定
  const isMobile = size.w < 768;

  // 余白：PCではゆったり、モバイルではほぼ全画面
  const pad = isMobile ? 8 : 40;

  const baseScale = Math.min(
    (size.w - pad * 2) / worldW,
    (size.h - pad * 2) / worldH
  );

  // モバイルはほぼ目一杯、PC は少し余裕を残す
  const scale = baseScale * (isMobile ? 0.98 : 0.9);

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
    isMobile,
  };
}

function makeConverters(worldW: number, worldH: number, scale: number) {
  // world(−15〜+15, −7.5〜+7.5) → リンク内ローカル座標(左上原点)
  const toLocal = (x: number, y: number) => ({
    x: (x + worldW / 2) * scale,
    y: (worldH / 2 - y) * scale,
  });

  // リンク内ローカル → world 座標
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
  tokenRadius,
  fontSize,
}: any) {
  const { selectedId, selectPlayer, updatePlayer } = useBoardStore();
  const sel = selectedId === id;
  const lp = toLocal(x, y);

  return (
    <Group
      x={lp.x}
      y={lp.y}
      draggable={!spacePressed}
      onDragEnd={(e) => {
        // ドラッグ終了位置（リンク内ローカル）
        const lx = e.target.x();
        const ly = e.target.y();

        // world に変換してコート内に clamp
        const w = toWorldLocal(lx, ly);
        const nx = clamp(w.x, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
        const ny = clamp(w.y, BOUNDS.yMin + 0.5, BOUNDS.yMax - 0.5);

        // ローカル座標に戻して、見た目もスナップ
        const snapped = toLocal(nx, ny);
        e.target.position(snapped);

        // 状態を更新
        updatePlayer(id, { x: nx, y: ny });
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        selectPlayer(sel ? null : id);
      }}
    >
      {sel && (
        <Circle
          radius={tokenRadius + 6}
          stroke="#10b981"
          strokeWidth={3}
          opacity={0.9}
        />
      )}
      <Circle
        radius={tokenRadius}
        fill={color}
        stroke="#0f172a"
        strokeWidth={2}
      />
      {/* 背番号はボード回転に対して常に読みやすい向きに固定 */}
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
    isMobile,
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

  // Spaceキーによるパン（※モバイルでは実質オフにする）
  const [spacePressed, setSpacePressed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile) {
      // モバイルではスクロールパン機能は使わない
      setSpacePressed(false);
      setPan({ x: 0, y: 0 });
      return;
    }

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
  }, [isMobile]);

  // パン開始（PC かつ spacePressed のときのみ）
  const handlePanStart = (e: any) => {
    if (isMobile || !spacePressed) return;
    setIsPanning(true);
    const pos = e.target.getStage().getPointerPosition();
    setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
  };

  // パン中
  const handlePanMove = (e: any) => {
    if (isMobile || !isPanning || !spacePressed) return;
    const pos = e.target.getStage().getPointerPosition();
    setPan({
      x: pos.x - panStart.x,
      y: pos.y - panStart.y,
    });
  };

  // パン終了
  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // ペン描き
  const [currentLineWorld, setCurrentLineWorld] = useState<number[]>([]);

  const getLocalFromStage = (stage: any) => {
    const pos = stage.getPointerPosition();
    if (!pos || !boardRef.current) return null;

    const transform = boardRef.current.getAbsoluteTransform().copy();
    transform.invert();

    // boardRef ローカル座標に変換
    return transform.point(pos);
  };

  const handleMouseDown = (e: any) => {
    if (!isMobile && spacePressed) {
      handlePanStart(e);
      return;
    }
    if (!penEnabled) return;

    const stage = e.target.getStage();
    const local = getLocalFromStage(stage);
    if (!local) return;
    if (local.x < 0 || local.y < 0 || local.x > rinkW || local.y > rinkH) return;

    const w = toWorld(local.x, local.y);
    setCurrentLineWorld([w.x, w.y]);
  };

  const handleMouseMove = (e: any) => {
    if (!isMobile && spacePressed) {
      handlePanMove(e);
      return;
    }
    if (!penEnabled || currentLineWorld.length === 0) return;

    const stage = e.target.getStage();
    const local = getLocalFromStage(stage);
    if (!local) return;
    if (local.x < 0 || local.y < 0 || local.x > rinkW || local.y > rinkH) return;

    const w = toWorld(local.x, local.y);
    setCurrentLineWorld((prev) => [...prev, w.x, w.y]);
  };

  const handleMouseUp = () => {
    if (!isMobile && spacePressed) {
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

  // ===== 駒・ボールのサイズを scale から決める =====
  // scale が大きければ駒も大きく、小さい画面でも視認性を保つ
  const tokenRadius = Math.max(10, scale * 0.55);
  const tokenFontSize = tokenRadius * 1.2;
  const ballLocal = toLocal(ball.x, ball.y);
  const ballR = Math.max(6, 0.25 * scale);

  // UI用の各種座標計算
  const midTop = toLocal(0, BOUNDS.yMax);
  const midBot = toLocal(0, BOUNDS.yMin);
  const center = toLocal(0, 0);
  const centerCircleR = 1.5 * scale;

  const penaltyBackXLeft = BOUNDS.xMin + 2.5;
  const penaltyFrontXLeft = -7;
  const penaltyBackXRight = BOUNDS.xMax - 2.5;
  const penaltyFrontXRight = 7;
  const penaltyHeightPx = 6 * scale;
  const penaltyWidthPx = (penaltyFrontXLeft - penaltyBackXLeft) * scale;

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

  const outerFrameColor = "#22c55e";
  const rinkFill = "#fbe4cf";
  const goalAreaFill = "#f8d2b0";
  const lineColor = "#1e3a8a";
  const lineW = 0.08 * scale;
  const cornerR = 1.5 * scale;
  const outerMargin = 12;

  // パンは PC のみ有効。モバイルでは常に (0,0)
  const panX = isMobile ? 0 : pan.x;
  const panY = isMobile ? 0 : pan.y;

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
        {/* パン用の外側グループ（モバイルでは常に固定） */}
        <Group x={panX} y={panY}>
          {/* 回転を含めたリンク全体 */}
          <Group
            ref={boardRef}
            x={offsetX + rinkW / 2}
            y={offsetY + rinkH / 2}
            offsetX={rinkW / 2}
            offsetY={rinkH / 2}
            rotation={boardRotation * 90}
          >
            {/* 外枠(緑) */}
            <Rect
              x={-outerMargin}
              y={-outerMargin}
              width={rinkW + outerMargin * 2}
              height={rinkH + outerMargin * 2}
              fill={outerFrameColor}
              cornerRadius={cornerR + outerMargin}
            />

            {/* コート本体 */}
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

            {/* ペナルティエリア（左右） */}
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

            {/* ペナルティ前のドット */}
            {frontDots.map((d, i) => (
              <Circle key={i} x={d.x} y={d.y} radius={dotR} fill={lineColor} />
            ))}

            {/* PKスポット */}
            <Circle x={pkLeftPx.x} y={pkLeftPx.y} radius={pkR} fill={lineColor} />
            <Circle
              x={pkRightPx.x}
              y={pkRightPx.y}
              radius={pkR}
              fill={lineColor}
            />

            {/* ゴール（左右） */}
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

            {/* 完了している線 */}
            {lines.map((ln, i) => (
              <Line
                key={i}
                points={ln.points.flatMap((v, idx) =>
                  idx % 2 === 0
                    ? toLocal(ln.points[idx], ln.points[idx + 1]).x
                    : toLocal(ln.points[idx - 1], v).y
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
                points={currentLineWorld.flatMap((v, idx) =>
                  idx % 2 === 0
                    ? toLocal(
                        currentLineWorld[idx],
                        currentLineWorld[idx + 1]
                      ).x
                    : toLocal(currentLineWorld[idx - 1], v).y
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
              onDragEnd={(e) => {
                const lx = e.target.x();
                const ly = e.target.y();
                const w = toWorld(lx, ly);

                const nx = clamp(w.x, BOUNDS.xMin + 0.3, BOUNDS.xMax - 0.3);
                const ny = clamp(w.y, BOUNDS.yMin + 0.3, BOUNDS.yMax - 0.3);

                const snapped = toLocal(nx, ny);
                e.target.position(snapped);
                updateBall({ x: nx, y: ny });
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
                tokenRadius={tokenRadius}
                fontSize={tokenFontSize}
              />
            ))}
          </Group>
        </Group>
      </Layer>
    </Stage>
  );
}
