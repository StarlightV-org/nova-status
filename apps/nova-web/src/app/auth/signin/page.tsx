import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "~/app/auth/login-form";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import { getAuth } from "~/lib/auth";

export const metadata: Metadata = {
	metadataBase: new URL("https://control.starlightv.de"),
	title: "Anmelden beim StarlightV Control Panel",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
	openGraph: {
		title: "Anmelden beim StarlightV Control Panel",
		images: [
			{
				url: "/favicon.ico",
				alt: "starlightv.de Logo ",
			},
		],
	},
};

export default async function LoginPage() {
	const { user, session } = await getAuth();

	if (session) {
		return redirect("/m");
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Link href="https://starlightv.de" className="flex items-center gap-2 self-center font-medium">
					<div className="flex size-6 items-center justify-center rounded-md bg-transparent text-primary-foreground">
						<Avatar>
							<AvatarImage src="/favicon.ico" alt="StarlightV" />
						</Avatar>
					</div>
					StarlightV
				</Link>
				<LoginForm />
			</div>
		</div>
	);
}
