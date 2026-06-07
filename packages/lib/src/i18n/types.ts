export const LOCALES = ["en", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export type TranslateParams = Record<string, string | number>;

export type TranslateFn<TKey extends string = string> = (
	key: TKey,
	params?: TranslateParams,
) => string;
