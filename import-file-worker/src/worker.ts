import path from "path";
import { ImportService } from "./services/imports/ImportService";
import { ClientService } from "./services/imports/ClientService";
import { StaffService } from "./services/imports/StaffService";
import { getTenantDb, testTenantConnection } from "../db/tenantDb";
import { AssignmentService } from "./services/imports/AssignmentService";
import { connect, StringCodec } from "nats";
import { ZapisiKzParser } from "./services/parsing/formats/ZapisiKzParser";
import { envConfig } from "../../config/envConfig.ts";

export const startWorker = async () => {
  console.log("🚀 Starting import worker...");

  const nc = await connect({ servers: envConfig.NATS_SERVER });
  const sc = StringCodec();

  const sub = nc.subscribe("import.excel");
  console.log("👂 Listening for import jobs...");

  for await (const msg of sub) {
    const job = JSON.parse(sc.decode(msg.data));
    console.log("📥 Received job:", job.importJobId);


    try {
      const tenantDb = getTenantDb(job.organization.name);
      await testTenantConnection(tenantDb);

      const clientService = new ClientService(tenantDb);
      const staffService = new StaffService();
      const assignmentService = new AssignmentService(
        clientService,
        staffService
      );

      const parser = new ZapisiKzParser();
      const importService = new ImportService(assignmentService, parser);
      const uploadsDir = path.resolve(__dirname, "../../uploads");
      const filePath = path.resolve(uploadsDir, job.filePath);

      const stats = await importService.processImport(
        filePath,
        job.organization,
        job.branch,
      );

      console.log(path.resolve(__dirname, "../../../uploads"));

      if (msg.respond) {
        msg.respond(sc.encode(JSON.stringify({
          success: true,
          stats,
          importJobId: job.importJobId
        })));
      }

    } catch (error) {
      console.error("❌ Import failed:", error);

      if (msg.respond) {
        msg.respond(sc.encode(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          importJobId: job.importJobId
        })));
      }
    }
  }
};