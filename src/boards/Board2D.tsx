// src/boards/Board2D.tsx
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState, // ✅追加
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

  // ✅ DrawStore（Textも含めて使う）
  const {
    lines,
    texts,
    penEnabled,
    eraserEnabled,
    activeTool,
    penColor,
    penWidth,

    textColor,
    textSize,
    selectedTextId,

    addLine,
    eraseLine,

    addText,
    updateText,
    removeText,
    selectText,
    setTool,
  } = useDrawStore();

  // ✅ 選択テキスト削除（Delete / Backspace）+ Escで解除
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (!selectedTextId) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeText(selectedTextId);
      return;
    }
    if (e.key === "Escape") {
      selectText(null);
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [selectedTextId, removeText, selectText]);

// ✅ Ctrl + Wheel で文字サイズ調整（選択中のみ）
const handleWheel = (e: any) => {
  if (!selectedTextId) return;

  const evt = e.evt as WheelEvent;
  if (!evt.ctrlKey) return;

  evt.preventDefault();

  const cur = texts.find((t) => t.id === selectedTextId);
  if (!cur) return;

  const dir = evt.deltaY > 0 ? -1 : 1; // wheel down -> smaller? 好みで逆でもOK
  const next = Math.max(10, Math.min(80, Math.round(cur.fontSize + dir * 2)));

  updateText(selectedTextId, { fontSize: next });
};

  const stageRef = useRef<Konva.Stage | null>(null);
  const boardRef = useRef<Konva.Group | null>(null);

  // 外部(App)へ「録画用Canvas」を提供
  useImperativeHandle(
    ref,
    () => ({
      getCaptureCanvas: () => {
        const st = stageRef.current;
        if (!st) return null;

        const container = st.content as unknown as HTMLDivElement | null;
        if (!container) return null;

        const canvases = Array.from(container.querySelectorAll("canvas"));
        if (canvases.length <= 0) return null;

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

  const isInsideRinkLocal = (local: { x: number; y: number }) => {
    return !(local.x < 0 || local.y < 0 || local.x > rinkW || local.y > rinkH);
  };

  const handleMouseDown = (e: any) => {
    // パン優先
    if (!isMobile && spacePressed) {
      handlePanStart(e);
      return;
    }

    const stage = e.target.getStage() as Konva.Stage;
    const local = getLocalFromStage(stage);
    if (!local) return;
    if (!isInsideRinkLocal(local)) return;

    // ✅ Textツール：1回置いたら自動でSelectに戻す
    if (activeTool === "text") {
      const w = toWorld(local.x, local.y);

      // まずは仮テキスト（後でダブルクリック編集）
      const id = addText({
        x: w.x,
        y: w.y,
        text: "Text",
        color: textColor,
        fontSize: textSize,
        boxW: 220, // ✅初期幅
      });

      // 置いた直後に選択状態にして、ツールはSelectへ
      selectText(id);
      setTool("select");

      return;
    }

    // ペン
    if (!penEnabled) return;

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
    if (!isInsideRinkLocal(local)) return;

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
      onClick={() => {
        // ✅ 空白クリックで選択解除
        selectPlayer(null);
        selectText(null);
      }}
      onWheel={handleWheel}
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

            {/* ✅ テキスト（選択＆ダブルクリック編集） */}
            {texts.map((t) => {
              const p = toLocal(t.x, t.y);
              const isSel = t.id === selectedTextId;

              const widthPx = Math.max(60, Math.min(800, t.boxW ?? 220));
              const handleSize = 12;

              return (
                <Group
                  key={t.id}
                  x={p.x}
                  y={p.y}
                  draggable={!spacePressed && activeTool === "select"}
                  onDragEnd={(e) => {
                    const lx = e.target.x();
                    const ly = e.target.y();
                    const w = toWorld(lx, ly);
                    updateText(t.id, { x: w.x, y: w.y });
                  }}
                >
                  <Text
                    text={t.text}
                    fontSize={t.fontSize}
                    fill={t.color}
                    wrap="word"
                    width={widthPx}
                    listening // 念のため明示
                    onMouseDown={(e) => {
                      // クリック開始でStage側に伝播させない（選択解除されるのを防ぐ）
                      e.cancelBubble = true;
                    }}
                    // heightは指定しない（自動で伸びる＝長文でも切れない）
                    onClick={(e) => {
                      e.cancelBubble = true;
                      selectText(t.id);
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      selectText(t.id);

                      const next = window.prompt("Edit text", t.text);
                      if (next === null) return;
                      const trimmed = next.trim();

                      // 空なら削除
                      if (trimmed.length === 0) {
                        removeText(t.id);
                        return;
                      }

                      updateText(t.id, { text: trimmed });
                    }}
                  />

                  {/* 選択枠 + リサイズハンドル（右下） */}
                  {isSel && (
                    <>
                      {/* 枠（高さはTextの自動計算に合わせたいので、だいたいの見た目でOKならこれで十分） */}
                      <Rect
                        x={-6}
                        y={-6}
                        width={widthPx + 12}
                        height={Math.max(24, t.fontSize * 1.3) + 12} // ざっくり。完璧に合わせたいなら次段階で測定する
                        stroke="#10b981"
                        strokeWidth={2}
                        cornerRadius={6}
                        opacity={0.9}
                        listening={false} // ✅追加：イベントを奪わない
                      />

                      {/* リサイズハンドル（右下をドラッグで幅変更） */}
                      <Rect
                        x={widthPx - handleSize / 2}
                        y={Math.max(24, t.fontSize * 1.3) - handleSize / 2}
                        width={handleSize}
                        height={handleSize}
                        fill="#10b981"
                        cornerRadius={3}
                        draggable
                        onDragMove={(e) => {
                          e.cancelBubble = true;
                          const newW = Math.max(60, Math.min(800, e.target.x() + handleSize / 2));
                          updateText(t.id, { boxW: newW });
                        }}
                        onDragEnd={(e) => {
                          // ハンドル位置は次レンダーで戻るので何もしない
                          e.cancelBubble = true;
                        }}
                      />
                    </>
                  )}
                </Group>
              );
            })}

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
