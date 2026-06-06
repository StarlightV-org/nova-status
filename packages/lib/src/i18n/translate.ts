import { flattenMessages } from "./catalog.ts";
import { de } from "./locales/de.ts";
import { en } from "./locales/en.ts";
import type { Locale, TranslateFn, TranslateParams } from "./types.ts";

const catalogs: Record<Locale, Record<string, string>> = {
	en: flattenMessages(en),
	de: flattenMessages(de),
};

export type MessageKey = keyof typeof catalogs.en;

export function createTranslator(locale: Locale): TranslateFn {
	const messages = catalogs[locale];
	const fallback = catalogs.en;

	return (key: MessageKey, params?: TranslateParams) => {
		let text = messages[key] ?? fallback[key] ?? key;

		if (params) {
			for (const [paramKey, value] of Object.entries(params)) {
				text = text.replaceAll(`{${paramKey}}`, String(value));
			}
		}

		return text;
	};
}
