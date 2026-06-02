import { db } from "@novastatus/db";
import type { MonitorDB } from "@novastatus/db/schema";

export default async function checker() {
    const monitor = await db.query.monitors.findMany();
    for (const m of monitor) {

    }
}






async function executeMonitor(monitor: MonitorDB) {

}
