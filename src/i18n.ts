import ja from "./locales/ja";
import en from "./locales/en";

export type Lang = "ja" | "en";

const dict: Record<Lang, Record<string, string>> = { ja, en };

export function t(lang: Lang, key: string): string {
  return dict[lang]?.[key] ?? key;
}
