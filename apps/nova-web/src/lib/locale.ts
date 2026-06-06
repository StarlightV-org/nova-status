import { createTranslator, parseAcceptLanguage } from "@novastatus/lib/i18n/index.ts";
import { headers } from "next/headers";

export async function getRequestLocale() {
	const headerStore = await headers();
	return parseAcceptLanguage(headerStore.get("accept-language"));
}

export async function getRequestTranslator() {
	const locale = await getRequestLocale();
	return createTranslator(locale);
}
