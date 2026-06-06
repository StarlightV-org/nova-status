import "~/styles/globals.css";

import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { getRequestLocale, getRequestTranslator } from "~/lib/locale";
import { cn } from "~/lib/utils";
import { HydrateClient } from "~/trpc/server";
import { TooltipProvider } from "~/components/ui/tooltip";
import { getAuth } from "~/lib/auth";
import { LocaleProvider } from "~/provider/locale-provider";
import { SessionProvider } from "~/provider/session-provider";

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
	const t = await getRequestTranslator();
	return {
		title: t("app.title"),
		description: t("app.description"),
		icons: [{ rel: "icon", url: "/favicon.ico" }],
	};
}

const nunito = Nunito({
	subsets: ["latin"],
	variable: "--font-nunito",
	weight: ["400", "500", "600", "700"],
	style: ["normal", "italic"],
});

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const session = await getAuth();
	const locale = await getRequestLocale();
	return (
		<html lang={locale} className={cn("dark", nunito.variable, "font-sans", nunitoSans.variable)}>
			<head>
				<meta name="darkreader-lock" />
			</head>
			<body>
				<LocaleProvider locale={locale}>
					<SessionProvider initialSession={session}>
						<TRPCReactProvider>
							<HydrateClient>
								<TooltipProvider disableHoverableContent>{children}</TooltipProvider>
							</HydrateClient>
						</TRPCReactProvider>
					</SessionProvider>
				</LocaleProvider>
			</body>
		</html>
	);
}
