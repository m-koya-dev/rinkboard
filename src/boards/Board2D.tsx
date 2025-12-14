// src/boards/Board2D.tsx
import  {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Rect, Line, Circle, Group, Text } from "react-konva";
import type Konva from "konva";
import { BOUNDS, useBoardStore, useDrawStore } from "../store";

/**
 * 外部(App)から録画用Canvasを取り出すためのref API
 */
export type Board2DHandle = {
  getCaptureCanvas: () => HTMLCanvasElement | null;
};

/**
 * レイアウト計算
 */
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

  const isMobile = size.w < 768;

  // モバイルでは下部ツールバー（h-16≈64px）ぶんを差し引く
  const toolbarH = isMobile ? 64 : 0;
  const stageW = size.w;
  const stageH = size.h - toolbarH;

  // PCは余白あり、モバイルは余白ゼロ（あなたの現行方針）
  const pad = isMobile ? 0 : 40;
  const scale = Math.min(
    (stageW - pad * 2) / worldW,
    (stageH - pad * 2) / worldH
  );

  const rinkW = worldW * scale;
  const rinkH = worldH * scale;

  // Stage 内でのリンク中心位置
  const centerX = stageW / 2;
  const centerY = stageH / 2;

  return {
    stageW,
    stageH,
    scale,
    worldW,
    worldH,
    rinkW,
    rinkH,
    centerX,
    centerY,
    isMobile,
  };
}

/**
 * world(−15〜+15, −7.5〜+7.5) <-> リンク内ローカル座標(左上基準)
 */
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
        const lx = e.target.x();
        const ly = e.target.y();

        const w = toWorldLocal(lx, ly);
        const nx = clamp(w.x, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
        const ny = clamp(w.y, BOUNDS.yMin + 0.5, BOUNDS.yMax - 0.5);

        const snapped = toLocal(nx, ny);
        e.target.position(snapped);

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
      <Circle radius={tokenRadius} fill={color} stroke="#0f172a" strokeWidth={2} />
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

const Board2D = forwardRef<Board2DHandle>(function Board2D(_props, ref) {
  const { players, selectPlayer, ball, updateBall, boardRotation } = useBoardStore();
  const { stageW, stageH, scale, worldW, worldH, rinkW, rinkH, centerX, centerY, isMobile } =
    useLayout();

  const { toLocal, toWorld } = makeConverters(worldW, worldH, scale);

  const { lines, penEnabled, eraserEnabled, penColor, penWidth, addLine, eraseLine } =
    useDrawStore();

  const stageRef = useRef<Konva.Stage | null>(null);
  const boardRef = useRef<Konva.Group | null>(null);

  // 外部(App)へ「録画用Canvas」を提供
  useImperativeHandle(
    ref,
    () => ({
      getCaptureCanvas: () => {
        const st = stageRef.current;
        if (!st) return null;

        // Konvaの実体は st.content (HTMLDivElement) の中に canvas が複数あることがある
        // 基本的に一番上の「scene canvas」を使う（録画に最適）
        const container = st.content as unknown as HTMLDivElement | null;
        if (!container) return null;

        const canvases = Array.from(container.querySelectorAll("canvas"));
        if (canvases.length <= 0) return null;

        // だいたい先頭が描画本体
        return canvases[0] as HTMLCanvasElement;
      },
    }),
    []
  );

  // ===== Space + ドラッグでパン（PCのみ有効） =====
  const [spacePressed, setSpacePressed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile) {
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

  const handlePanStart = (e: any) => {
    if (isMobile || !spacePressed) return;
    setIsPanning(true);
    const pos = e.target.getStage().getPointerPosition();
    setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
  };

  const handlePanMove = (e: any) => {
    if (isMobile || !isPanning || !spacePressed) return;
    const pos = e.target.getStage().getPointerPosition();
    setPan({
      x: pos.x - panStart.x,
      y: pos.y - panStart.y,
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // ===== ペン描画関係 =====
  const [currentLineWorld, setCurrentLineWorld] = useState<number[]>([]);

  const getLocalFromStage = (stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    if (!pos || !boardRef.current) return null;

    const transform = boardRef.current.getAbsoluteTransform().copy();
    transform.invert();

    return transform.point(pos);
  };

  const handleMouseDown = (e: any) => {
    if (!isMobile && spacePressed) {
      handlePanStart(e);
      return;
    }
    if (!penEnabled) return;

    const stage = e.target.getStage() as Konva.Stage;
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

    const stage = e.target.getStage() as Konva.Stage;
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

  // ===== 駒・ボールのサイズ（画面に追従）=====
  const tokenRadius = Math.max(10, scale * 0.55);
  const tokenFontSize = tokenRadius * 1.2;

  const ballLocal = toLocal(ball.x, ball.y);
  const ballR = Math.max(6, 0.25 * scale);

  // ===== コート描画用座標 =====
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

  const penaltyCenterLeftPx = toLocal((penaltyBackXLeft + penaltyFrontXLeft) / 2, 0);
  const penaltyCenterRightPx = toLocal((penaltyBackXRight + penaltyFrontXRight) / 2, 0);

  const pkLeftPx = toLocal(penaltyFrontXLeft, 0);
  const pkRightPx = toLocal(penaltyFrontXRight, 0);
  const pkR = 0.16 * scale;

  const frontDots = [toLocal(-6, 0), toLocal(6, 0)];
  const dotR = 0.12 * scale;

  const goalRectW = 1.2 * scale;
  const goalRectH = 3 * scale;

  const goalLeftPx = toLocal(BOUNDS.xMin + 1.5, 0);
  const goalRightPx = toLocal(BOUNDS.xMax - 1.5, 0);

  // ===== 色・線 =====
  const outerFrameColor = "#22c55e";
  const rinkFill = "#fbe4cf";
  const goalAreaFill = "#f8d2b0";
  const lineColor = "#1e3a8a";
  const lineW = 0.08 * scale;
  const cornerR = 1.5 * scale;

  // PCだけ緑枠を付ける（スマホは無し）
  const showOuterFrame = !isMobile;
  const outerMargin = 12;

  const panX = isMobile ? 0 : pan.x;
  const panY = isMobile ? 0 : pan.y;

  return (
    <Stage
      ref={(node) => {
        stageRef.current = node as unknown as Konva.Stage | null;
      }}
      width={stageW}
      height={stageH}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => selectPlayer(null)}
    >
      <Layer>
        {/* パン用グループ（モバイルでは常に固定） */}
        <Group x={panX} y={panY}>
          {/* リンク全体（centerX, centerY に配置） */}
          <Group
            ref={(node) => {
              boardRef.current = node as unknown as Konva.Group | null;
            }}
            x={centerX}
            y={centerY}
            offsetX={rinkW / 2}
            offsetY={rinkH / 2}
            rotation={boardRotation * 90}
          >
            {/* PCのみ外枠（緑） */}
            {showOuterFrame && (
              <Rect
                x={-outerMargin}
                y={-outerMargin}
                width={rinkW + outerMargin * 2}
                height={rinkH + outerMargin * 2}
                fill={outerFrameColor}
                cornerRadius={cornerR + outerMargin}
              />
            )}

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

            {/* ペナルティ前のドット */}
            {frontDots.map((d, i) => (
              <Circle key={i} x={d.x} y={d.y} radius={dotR} fill={lineColor} />
            ))}

            {/* PKスポット */}
            <Circle x={pkLeftPx.x} y={pkLeftPx.y} radius={pkR} fill={lineColor} />
            <Circle x={pkRightPx.x} y={pkRightPx.y} radius={pkR} fill={lineColor} />

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

            {/* 完了している線 */}
            {lines.map((ln, i) => (
              <Line
                key={i}
                points={ln.points.flatMap((_, idx) =>
                  idx % 2 === 0
                    ? toLocal(ln.points[idx], ln.points[idx + 1]).x
                    : toLocal(ln.points[idx - 1], ln.points[idx]).y
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
                points={currentLineWorld.flatMap((_, idx) =>
                  idx % 2 === 0
                    ? toLocal(currentLineWorld[idx], currentLineWorld[idx + 1]).x
                    : toLocal(currentLineWorld[idx - 1], currentLineWorld[idx]).y
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
});

export default Board2D;

