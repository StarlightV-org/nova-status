import { DEFAULT_LOCALE, type Locale } from "./types.ts";

const SUPPORTED = new Set<Locale>(["en", "de"]);

export function parseAcceptLanguage(header: string | null): Locale {
	if (!header) return DEFAULT_LOCALE;

	const parts = header.split(",").map((part) => {
		const [langPart, qPart] = part.trim().split(";q=");
		const lang = langPart?.split("-")[0]?.toLowerCase() ?? "";
		const q = qPart ? Number.parseFloat(qPart) : 1;
		return { lang, q: Number.isNaN(q) ? 0 : q };
	});

	parts.sort((a, b) => b.q - a.q);

	for (const { lang } of parts) {
		if (SUPPORTED.has(lang as Locale)) {
			return lang as Locale;
		}
	}

	return DEFAULT_LOCALE;
}
