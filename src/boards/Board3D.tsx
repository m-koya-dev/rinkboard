// src/boards/Board3D.tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { BOUNDS, useBoardStore } from "../store";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ============================
   コート（丸い外周＋ライン）
 ============================ */
function RinkFloor() {
  const lineColor = "#1e3a8a";
  const rinkColor = "#fbe4cf";
  const goalAreaColor = "#f8d2b0";

  // コートサイズ
  const w = 30;
  const h = 15;
  const r = 3.5; // 角の丸み

  // 角丸長方形の Shape を作成
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, h / 2);
  shape.lineTo(w / 2 - r, h / 2);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
  shape.lineTo(w / 2, -h / 2 + r);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2);
  shape.lineTo(-w / 2 + r, -h / 2);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r);
  shape.lineTo(-w / 2, h / 2 - r);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2);

  const rinkGeometry = new THREE.ShapeGeometry(shape);
  const edgesGeometry = new THREE.EdgesGeometry(rinkGeometry);

  // ペナルティエリア等の位置（2Dに合わせる）
  const penaltyHeightWorld = 6;
  const penaltyBackXLeft = BOUNDS.xMin + 2.5; // -12.5
  const penaltyFrontXLeft = -7;
  const penaltyBackXRight = BOUNDS.xMax - 2.5; // 12.5
  const penaltyFrontXRight = 7;

  const penaltyCenterLeft = (penaltyBackXLeft + penaltyFrontXLeft) / 2;
  const penaltyCenterRight = (penaltyBackXRight + penaltyFrontXRight) / 2;
  const penaltyWidth = penaltyFrontXLeft - penaltyBackXLeft;
  const penaltyHeight = penaltyHeightWorld;
  const penaltyHalfH = penaltyHeight / 2;

  return (
    <group>
      {/* 外側のグリーン */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[32, 17]} />
        <meshStandardMaterial color={"#22c55e"} />
      </mesh>

      {/* 角丸コート本体（塗り＋外枠線） */}
      <group rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <mesh geometry={rinkGeometry}>
          <meshStandardMaterial color={rinkColor} />
        </mesh>
        {/* 外枠線（EdgesGeometry で余計な対角線なし） */}
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color={lineColor} />
        </lineSegments>
      </group>

      {/* センターライン */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.06, 15, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>

      {/* センターサークル（線だけ） */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.035, 0]}>
        <ringGeometry args={[1.5 - 0.04, 1.5 + 0.04, 64]} />
        <meshStandardMaterial
          color={lineColor}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ペナルティエリア塗り（平面） */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyCenterLeft, 0.025, 0]}
      >
        <planeGeometry args={[penaltyWidth, penaltyHeight]} />
        <meshStandardMaterial color={goalAreaColor} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyCenterRight, 0.025, 0]}
      >
        <planeGeometry args={[penaltyWidth, penaltyHeight]} />
        <meshStandardMaterial color={goalAreaColor} />
      </mesh>

      {/* ペナルティ枠（四辺を細い box で描く） */}
      {/* 左側 */}
      {/* 上辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyCenterLeft, 0.03, penaltyHalfH]}
      >
        <boxGeometry args={[penaltyWidth, 0.05, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      {/* 下辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyCenterLeft, 0.03, -penaltyHalfH]}
      >
        <boxGeometry args={[penaltyWidth, 0.05, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      {/* 左辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyBackXLeft, 0.03, 0]}
      >
        <boxGeometry args={[0.05, penaltyHeight, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      {/* 右辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyFrontXLeft, 0.03, 0]}
      >
        <boxGeometry args={[0.05, penaltyHeight, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>

      {/* 右側 */}
      {/* 上辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyCenterRight, 0.03, penaltyHalfH]}
      >
        <boxGeometry args={[penaltyWidth, 0.05, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      {/* 下辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyCenterRight, 0.03, -penaltyHalfH]}
      >
        <boxGeometry args={[penaltyWidth, 0.05, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      {/* 左辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyBackXRight, 0.03, 0]}
      >
        <boxGeometry args={[0.05, penaltyHeight, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      {/* 右辺 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[penaltyFrontXRight, 0.03, 0]}
      >
        <boxGeometry args={[0.05, penaltyHeight, 0.01]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>

      {/* ペナルティエリア前のドット（中央のみ・平面リング） */}
      {[
        [-6, 0], // 左
        [6, 0],  // 右
      ].map(([x, z], i) => (
        <mesh
          key={`front-dot-${i}`}
          rotation-x={-Math.PI / 2}
          position={[x, 0.04, z]}
        >
          <ringGeometry args={[0.09, 0.13, 24]} />
          <meshStandardMaterial
            color={lineColor}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* PKスポット（ペナルティ前面線上・平面リング） */}
      {[
        [penaltyFrontXLeft, 0],
        [penaltyFrontXRight, 0],
      ].map(([x, z], i) => (
        <mesh
          key={`pk-${i}`}
          rotation-x={-Math.PI / 2}
          position={[x, 0.04, z]}
        >
          <ringGeometry args={[0.12, 0.18, 24]} />
          <meshStandardMaterial
            color={lineColor}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ============================
        ゴール（ネット後ろ）
 ============================ */
function Goal3D({ side, x }: { side: "left" | "right"; x: number }) {
  const width = 2.0;  // z方向
  const height = 1.2; // y方向
  const depth = 0.8;  // x方向
  const postThickness = 0.08;

  // ポストはリンク側、ネットはフェンス側（外側）
  // 左ゴール: 外側は x が BOUNDS.xMin 側（もっとマイナス）
  // 右ゴール: 外側は x が BOUNDS.xMax 側（もっとプラス）
  const dir = side === "left" ? -1 : 1;  // ★ここを修正：外側にネット
  const frontX = x;                      // ポスト位置（リンク側）
  const backX = x + dir * depth;         // ネット位置（フェンス側）

  const frameColor = "#f97316";
  const netColor = "#fefce8";

  return (
    <group>
      {/* ポスト（前：リンク側） */}
      <mesh position={[frontX, height / 2, width / 2]}>
        <boxGeometry args={[postThickness, height, postThickness]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[frontX, height / 2, -width / 2]}>
        <boxGeometry args={[postThickness, height, postThickness]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>

      {/* クロスバー（前：リンク側） */}
      <mesh position={[frontX, height, 0]}>
        <boxGeometry args={[postThickness, postThickness, width + postThickness]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>

      {/* サイドバー（奥行き） */}
      <mesh position={[(frontX + backX) / 2, height / 2, width / 2]}>
        <boxGeometry args={[Math.abs(backX - frontX), postThickness, postThickness]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[(frontX + backX) / 2, height / 2, -width / 2]}>
        <boxGeometry args={[Math.abs(backX - frontX), postThickness, postThickness]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>

      {/* ネット（奥：フェンス側） */}
      <mesh position={[backX, height / 2, 0]}>
        <boxGeometry args={[0.03, height, width]} />
        <meshStandardMaterial color={netColor} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/* ============================
        プレイヤー（駒）
 ============================ */

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 平面
const intersection = new THREE.Vector3();

function Player3D({ id, x, y, color, number }: any) {
  const groupRef = useRef<any>(null);
  const [dragging, setDragging] = useState(false);
  const { selectedId, selectPlayer, updatePlayer, mode3D } = useBoardStore();
  const selected = selectedId === id;

  const handlePointerDown = (e: any) => {
    if (mode3D !== "piece") return;
    e.stopPropagation();
    setDragging(true);
    selectPlayer(id);
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: any) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    e.target.releasePointerCapture?.(e.pointerId);

    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const nx = clamp(pos.x, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
    const nz = clamp(pos.z, BOUNDS.yMin + 0.5, BOUNDS.yMax - 0.5);
    groupRef.current.position.set(nx, 0.5, nz);
    updatePlayer(id, { x: nx, y: nz });
  };

  const handlePointerMove = (e: any) => {
    if (!dragging || mode3D !== "piece") return;
    e.stopPropagation();
    if (!groupRef.current) return;

    // マウスレイと y=0 平面の交点
    const hit = e.ray.intersectPlane(groundPlane, intersection);
    if (!hit) return;
    const nx = clamp(intersection.x, BOUNDS.xMin + 0.5, BOUNDS.xMax - 0.5);
    const nz = clamp(intersection.z, BOUNDS.yMin + 0.5, BOUNDS.yMax - 0.5);
    groupRef.current.position.set(nx, 0.5, nz);
  };

  return (
    <group
      ref={groupRef}
      position={[x, 0.5, y]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]}>
          <ringGeometry args={[0.36, 0.46, 32]} />
          <meshBasicMaterial
            color={"#10b981"}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          if (mode3D !== "piece") {
            selectPlayer(selected ? null : id);
          }
        }}
      >
        <cylinderGeometry args={[0.3, 0.3, 1, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.45}
        color="#111827"
        outlineWidth={0.02}
        outlineColor="white"
      >
        {String(number)}
      </Text>
    </group>
  );
}

/* ============================
           ボール
 ============================ */

const ballPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function Ball3D() {
  const groupRef = useRef<any>(null);
  const [dragging, setDragging] = useState(false);
  const { ball, updateBall, mode3D } = useBoardStore();

  const handlePointerDown = (e: any) => {
    if (mode3D !== "piece") return;
    e.stopPropagation();
    setDragging(true);
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: any) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    e.target.releasePointerCapture?.(e.pointerId);

    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const nx = clamp(pos.x, BOUNDS.xMin + 0.3, BOUNDS.xMax - 0.3);
    const nz = clamp(pos.z, BOUNDS.yMin + 0.3, BOUNDS.yMax - 0.3);
    groupRef.current.position.set(nx, 0.2, nz);
    updateBall({ x: nx, y: nz });
  };

  const handlePointerMove = (e: any) => {
    if (!dragging || mode3D !== "piece") return;
    e.stopPropagation();
    if (!groupRef.current) return;

    const hit = e.ray.intersectPlane(ballPlane, intersection);
    if (!hit) return;
    const nx = clamp(intersection.x, BOUNDS.xMin + 0.3, BOUNDS.xMax - 0.3);
    const nz = clamp(intersection.z, BOUNDS.yMin + 0.3, BOUNDS.yMax - 0.3);
    groupRef.current.position.set(nx, 0.2, nz);
  };

  return (
    <group
      ref={groupRef}
      position={[ball.x, 0.2, ball.y]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={"#111827"} />
      </mesh>
    </group>
  );
}

/* ============================
        メイン 3D ボード
 ============================ */
export default function Board3D() {
  const { players, selectPlayer, mode3D } = useBoardStore();
  const onMiss = () => selectPlayer(null);

  const goalXLeft = BOUNDS.xMin + 1.5;
  const goalXRight = BOUNDS.xMax - 1.5;

  return (
    <Canvas
      shadows
      className="absolute inset-0"
      onPointerMissed={onMiss}
      camera={{ position: [12, 10, 12] }}
    >
      <color attach="background" args={["#ffffff"]} />
      <hemisphereLight intensity={0.35} />
      <directionalLight position={[5, 10, 5]} intensity={0.9} castShadow />

      <PerspectiveCamera makeDefault position={[12, 10, 12]} />

      <OrbitControls
        enabled={mode3D === "camera"}
        enablePan
        enableRotate
        enableZoom
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 2} // Z+側の半球のみ
        maxAzimuthAngle={Math.PI / 2}
        minDistance={10}
        maxDistance={30}
      />

      {/* コート */}
      <RinkFloor />

      {/* ゴール（ネットはフェンス側＝外側） */}
      <Goal3D side="left" x={goalXLeft} />
      <Goal3D side="right" x={goalXRight} />

      {/* プレイヤー */}
      {players.map((p) => (
        <Player3D key={p.id} {...p} />
      ))}

      {/* ボール */}
      <Ball3D />
    </Canvas>
  );
}

