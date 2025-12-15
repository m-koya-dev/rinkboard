// src/components/SeoIntro.tsx
import { useState } from "react";

export default function SeoIntro() {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 pb-2">
        {/* ほぼ存在しないトグル */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="seo-intro"
          className="
            block
            w-[6px] h-[6px]
            bg-slate-900
            opacity-0
            pointer-events-auto
            select-none
          "
          title="about"
        >
          {/* 中身なし */}
        </button>

        {/* SEO 本文 */}
        <div
          id="seo-intro"
          className={[
            "mt-1 text-[11px] leading-relaxed text-slate-400",
            open ? "block" : "hidden",
          ].join(" ")}
        >
          <p>
            RinkBoard は、リンクホッケーやローラーホッケー向けに作られた
            シンプルな戦術ボードです。2D と 3D を切り替えながら、
            フォーメーションの確認や作戦の共有ができます。
          </p>

          <p className="mt-2">
            駒やボールを自由に動かし、線を書いて動きを整理したり、
            場面ごとにチャプターとして保存し、
            アニメーションとして順番に再生することも可能です。
          </p>

          <p className="mt-2">
            個人練習からチームミーティングまで、
            実際のリンクを想定した配置で戦術を考えるための
            ツールとして設計されています。
          </p>

          <p className="mt-2">
            キーワード：
            リンクホッケー、ローラーホッケー、戦術ボード、
            ホッケー戦術、roller hockey tactics、rink hockey board
          </p>
        </div>
      </div>
    </section>
  );
}
