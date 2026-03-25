// src/components/SeoIntro.tsx
import { useState } from "react";
import { useUiStore } from "../store";

export default function SeoIntro() {
  const [open, setOpen] = useState(false);
  const { lang } = useUiStore();

  const isJa = lang === "ja";

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 pb-2">
        {/* invisible toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="seo-intro"
          className="w-[6px] h-[6px] opacity-0"
          title="about"
        />

        <div
          id="seo-intro"
          className={[
            "mt-1 text-[11px] leading-relaxed text-slate-400",
            open ? "block" : "hidden",
          ].join(" ")}
        >
          {isJa ? (
            <>
              <p>
                <strong>Ractix</strong> は、リンクホッケー・ローラーホッケー専用に設計された
                戦術ボードです。2D・3D表示を切り替えながら、直感的にフォーメーションや
                プレイの流れを可視化できます。
              </p>

              <p className="mt-2">
                プレイヤーやボールの動きを自由に配置し、ラインや矢印で戦術を描き、
                シーンごとにチャプターとして保存。再生機能により、
                試合の流れや戦術をアニメーションとして確認できます。
              </p>

              <p className="mt-2">
                個人の戦術理解からチームでの共有まで、
                実際のリンク構造を再現した環境で戦術設計を行うためのツールです。
              </p>

              <p className="mt-2">
                キーワード：
                Ractix、リンクホッケー、ローラーホッケー、戦術ボード、
                ホッケー戦術、フォーメーション分析
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Ractix</strong> is a tactical board designed for rink hockey
                and roller hockey. Switch between 2D and 3D views to visualize
                formations and game flow with precision.
              </p>

              <p className="mt-2">
                Move players and the ball freely, draw lines and arrows,
                and save situations as chapters. Play them back as animations
                to analyze tactics and sequences.
              </p>

              <p className="mt-2">
                Built for both individual training and team strategy sessions,
                Ractix helps you design and communicate plays based on real rink layouts.
              </p>

              <p className="mt-2">
                Keywords:
                rink hockey tactics, roller hockey board, sports strategy tool,
                tactical animation, hockey formation analysis
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}