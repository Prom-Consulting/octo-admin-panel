import path from "path";
import { ImportService } from "./services/imports/ImportService";
import { ClientService } from "./services/imports/ClientService";
import { StaffService } from "./services/imports/StaffService";
import { getTenantDb, testTenantConnection } from "../db/tenantDb";
import { AssignmentService } from "./services/imports/AssignmentService";
import { connect, StringCodec } from "nats";
import { envConfig } from "../../config/envConfig.ts";
import type { ImportJobPayload } from "../../src/types";
import { getParser } from "./services/parsing/parsers/getParser.ts";

export const startWorker = async () => {
  console.log("🚀 Starting import worker...");

  const nc = await connect({ servers: envConfig.NATS_SERVER });
  const sc = StringCodec();

  const sub = nc.subscribe("import.excel");
  console.log("👂 Listening for import jobs...");

  for await (const msg of sub) {
    const dataImport: ImportJobPayload = JSON.parse(sc.decode(msg.data));
    console.log("📥 Received job:", dataImport.importJobId);

    try {
      const tenantDb = getTenantDb(dataImport.organization.name);
      await testTenantConnection(tenantDb);

      const clientService = new ClientService(tenantDb);
      const staffService = new StaffService();
      const assignmentService = new AssignmentService();

      console.log(dataImport.importType);

      const parser = getParser(dataImport.importType);

      const importService = new ImportService(
        assignmentService,
        clientService,
        staffService,
        parser
      );

      const uploadsDir = path.resolve(__dirname, "../../uploads");
      const filePath = path.resolve(uploadsDir, dataImport.filePath);

      const stats = await importService.processImport(
        filePath,
        dataImport.organization,
        dataImport.branch,
      );

      console.log(path.resolve(__dirname, "../../../uploads"));

      if (msg.respond) {
        msg.respond(sc.encode(JSON.stringify({
          success: true,
          stats,
          importJobId: dataImport.importJobId
        })));
      }

    } catch (error) {
      console.error("❌ Import failed:", error);

      if (msg.respond) {
        msg.respond(sc.encode(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          importJobId: dataImport.importJobId
        })));
      }
    }
  }
};