"use client";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup } from "~/components/ui/field";
import { useState } from "react";
import { Spinner } from "~/components/ui/spinner";
import { signIn } from "~/lib/auth-client";

import { toast } from "sonner";

import { useSearchParams } from "next/navigation";

import Link from "next/link";
import { GithubDark } from "~/components/ui/svgs/githubDark";
import type { MessageKey } from "@novastatus/lib/i18n/index.ts";
import { useT } from "~/provider/locale-provider";

const AUTH_ERROR_KEYS = {
	"dc-email-not-verified": "auth.errors.dc-email-not-verified",
	"no-discord-2fa": "auth.errors.no-discord-2fa",
	"not-allowed-to-create-account": "auth.errors.not-allowed-to-create-account",
	"account-locked": "auth.errors.account-locked",
	"account-inactive": "auth.errors.account-inactive",
	invalid_code: "auth.errors.invalid_code",
	"discord-auth-required": "auth.errors.discord-auth-required",
} as const satisfies Record<string, MessageKey>;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const t = useT();
	const [loading, setLoading] = useState(false);

	const searchParams = useSearchParams();

	const getErrorMessage = (error: string | null) => {
		if (!error) return null;
		const key = AUTH_ERROR_KEYS[error as keyof typeof AUTH_ERROR_KEYS];
		return key ? t(key) : t("auth.errors.unexpected");
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">{t("auth.signIn.welcome")}</CardTitle>
					<CardDescription>{t("auth.signIn.description")}</CardDescription>
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

										await signIn.social({
											provider: "github",
											fetchOptions: {
												onError: () => {
													toast.error(t("auth.errors.loginFailed"), {
														description: t("auth.errors.loginFailedDescription"),
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
											<GithubDark />
											{t("auth.signIn.github")}
										</>
									)}
								</Button>
							</Field>
							<FieldError>{getErrorMessage(searchParams.get("error"))}</FieldError>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				{t("auth.signIn.termsPrefix")} <br />
				<Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
					{t("auth.signIn.terms")}
				</Link>
				.
			</FieldDescription>
		</div>
	);
}
