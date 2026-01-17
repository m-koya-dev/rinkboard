import { useMemo, useState } from "react";
import type { Lang } from "../i18n";
import { t } from "../i18n";

export default function PitchPage({
  lang,
  onOpenBoard,
}: {
  lang: Lang;
  onOpenBoard: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("page"); // pitch自体を共有しない（ボード側を共有）
    return url.toString();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboardがダメな環境用フォールバック
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // 失敗しても落とさない
      }
    }
  };

  const Card = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <h2 className="text-sm md:text-base font-semibold text-slate-50">{title}</h2>
      <div className="mt-2 text-sm text-slate-300 leading-relaxed">{children}</div>
    </section>
  );

  const List = ({ items }: { items: string[] }) => (
    <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-300">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );

  return (
    <div className="w-full h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
        {/* Hero */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="inline-flex items-center gap-2">
            <span className="text-[11px] md:text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
              {t(lang, "pitch.badge")}
            </span>
            {copied && (
              <span className="text-[11px] md:text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-200 border border-sky-400/20">
                Copied!
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-50 tracking-tight">
            {t(lang, "pitch.title")}
          </h1>
          <p className="text-slate-300 text-sm md:text-base">
            {t(lang, "pitch.subtitle")}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenBoard}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
            >
              {t(lang, "pitch.cta.open")}
            </button>

            <button
              onClick={copy}
              className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 transition"
              title={shareUrl}
            >
              {t(lang, "pitch.cta.copy")}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card title={t(lang, "pitch.section.what")}>
            <p>{t(lang, "pitch.section.what.body")}</p>
          </Card>

          <Card title={t(lang, "pitch.section.for")}>
            <List
              items={[
                t(lang, "pitch.section.for.li1"),
                t(lang, "pitch.section.for.li2"),
                t(lang, "pitch.section.for.li3"),
              ]}
            />
          </Card>

          <Card title={t(lang, "pitch.section.features")}>
            <List
              items={[
                t(lang, "pitch.section.features.li1"),
                t(lang, "pitch.section.features.li2"),
                t(lang, "pitch.section.features.li3"),
                t(lang, "pitch.section.features.li4"),
                t(lang, "pitch.section.features.li5"),
              ]}
            />
          </Card>

          <Card title={t(lang, "pitch.section.how")}>
            <List
              items={[
                t(lang, "pitch.section.how.li1"),
                t(lang, "pitch.section.how.li2"),
                t(lang, "pitch.section.how.li3"),
              ]}
            />
          </Card>

          <div className="md:col-span-2">
            <Card title={t(lang, "pitch.section.contact")}>
              <p>{t(lang, "pitch.section.contact.body")}</p>
              <p className="mt-2 text-xs text-slate-400">
                ※連絡先（メール/フォーム）は次フェーズで追加します。今はページ構造だけ先に作ります。
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
