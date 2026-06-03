import  { tryCatch } from "@novastatus/lib";
import { getAuth } from "~/lib/auth";
import { api } from "~/trpc/server";
import { StatusComponent } from "./status-components";

export default async function MonitorPage() {

  const session = await getAuth()


  return (
    <div className="whitespace-break-spaces">
      <StatusComponent />
    </div>
  );
}
