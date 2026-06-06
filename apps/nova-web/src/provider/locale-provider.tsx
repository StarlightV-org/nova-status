"use client";

import { createTranslator, type Locale, type MessageKey, type TranslateFn } from "@novastatus/lib/i18n/index.ts";
import { createContext, useContext, useMemo } from "react";

type LocaleContextValue = {
	locale: Locale;
	t: TranslateFn;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
	const value = useMemo(
		() => ({
			locale,
			t: createTranslator(locale),
		}),
		[locale],
	);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
	const context = useContext(LocaleContext);
	if (!context) {
		throw new Error("useLocale must be used within LocaleProvider");
	}
	return context;
}

export function useT() {
	return useLocale().t;
}

export type { Locale, MessageKey, TranslateFn };
