"use client";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup } from "~/components/ui/field";
import { useEffect, useState } from "react";
import { Spinner } from "~/components/ui/spinner";
import { authClient, signIn } from "~/lib/auth-client";


import { toast } from "sonner";

import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { GithubLight } from "~/components/ui/svgs/githubLight";
import { GithubDark } from "~/components/ui/svgs/githubDark";

const ERROR_MESSAGES = {
	"dc-email-not-verified":
		"Dein Discord Account ist nicht verifiziert. Bitte bestätige dort deine E-Mail Adresse, bevor du dich einloggst.",
	"no-discord-2fa":
		"Dein Discord Account ist nicht mit 2FA aktiviert. Bitte aktiviere 2FA in deinem Discord Account, bevor du dich einloggst.",
	"not-allowed-to-create-account":
		"Du darfst dich nicht anmelden. Bitte wende dich an die Projektleitung, wenn du glaubst, dass dies ein Fehler ist.",
	"account-locked":
		"Dein Account ist gesperrt. Bitte wende dich an die Projektleitung, wenn du glaubst, dass dies ein Fehler ist.",
	"account-inactive":
		"Dein Account ist nicht mehr aktiv. Bitte wende dich an die Projektleitung, wenn du glaubst, dass dies ein Fehler ist.",
	invalid_code: "Bitte warte einen Moment und versuche es erneut.",
	"discord-auth-required": "Bitte melde dich mit deinem Discord Account an, um dich einzuloggen.",
};

const getErrorMessage = (error: string | null) => {
	if (!error) return null;
	return (
		ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ??
		"Ein unerwarteter Fehler ist aufgetreten. Bitte wende dich an die Projektleitung."
	);
};

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const searchParams = useSearchParams();

	// const requestPasskey = async (autoFill = true) => {
	// 	if (
	// 		!PublicKeyCredential.isConditionalMediationAvailable ||
	// 		!(await PublicKeyCredential.isConditionalMediationAvailable())
	// 	) {
	// 		return;
	// 	}

	// 	async function pass() {
	// 		await authClient.signIn.passkey({
	// 			autoFill: autoFill,
	// 			fetchOptions: {
	// 				onRequest(context) {
	// 					setLoading(true);
	// 				},
	// 				onError(context) {
	// 					Print.Error("[AUTH] Passkey login error", context.error);
	// 					window.history.pushState({}, "", `/auth/signin?error=${context.error.message}`);
	// 					toast.error("Login fehlgeschlagen", {
	// 						description: "Bitte versuche es erneut.",
	// 					});
	// 					setLoading(false);
	// 				},
	// 				onSuccess() {
	// 					setLoading(false);
	// 					toast.success("Login erfolgreich");
	// 					router.refresh();
	// 				},
	// 			},
	// 		});
	// 	}

	// 	if (mounted) void pass();
	// };

	// useEffect(() => {
	// 	if (mounted) ensureDeviceIdCookie();
	// }, [mounted]);

	// useEffect(() => {
	// 	let timeout: NodeJS.Timeout | undefined;
	// 	if (mounted) {
	// 		timeout = setTimeout(() => {
	// 			void requestPasskey();
	// 		}, 300);
	// 	}
	// 	return () => {
	// 		if (timeout) clearTimeout(timeout);
	// 	};
	// }, [mounted, router]);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Willkommen zurück</CardTitle>
					<CardDescription>Melde dich mit deinem GitHub Account an.</CardDescription>
				</CardHeader>
				<CardContent>
					<form>
						<FieldGroup>
							<Field>
								<Button
									variant="outline"
									type="button"
									className="cursor-pointer"
									disabled={loading}
									onClick={async () => {
										setLoading(true);
										// removeErrorParam();

										await signIn.social({
											provider: "github",
											fetchOptions: {
												onError: () => {
													toast.error("Login fehlgeschlagen", {
														description: "Bitte versuche es erneut.",
													});
												},
											},
											callbackURL: "/m",
										});
									}}
								>
									{loading ? (
										<Spinner />
									) : (
										<>
										<GithubDark/>
											Login with GitHub
										</>
									)}
								</Button>
							</Field>
							<FieldError>{getErrorMessage(searchParams.get("error"))}</FieldError>
						</FieldGroup>
						{/*{mounted && <input hidden type="text" name="name" autoComplete="webauthn" />}*/}
					</form>
				</CardContent>
				{/*<CardHeader className="text-center">
					<CardDescription>
						Oder verwende dein{" "}
						<button
							type="button"
							className="font-bold underline"
							onClick={() => {
								removeErrorParam();
								requestPasskey(false);
							}}
						>
							Passkey
						</button>
					</CardDescription>
				</CardHeader>*/}
			</Card>
			<FieldDescription className="px-6 text-center">
				Mit dem Login bestätigst du unsere <br />
				<Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
					Nutzungsbedingungen
				</Link>
				.
			</FieldDescription>
		</div>
	);
}
