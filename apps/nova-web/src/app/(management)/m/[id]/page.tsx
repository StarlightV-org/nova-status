import { tryCatch } from "@novastatus/lib";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { MonitorDetail } from "../monitor-detail";

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const result = await tryCatch(api.monitor.getById({ id }));

	if (!result.data) {
		notFound();
	}

	return <MonitorDetail monitorId={id} initialData={result.data} />;
}
