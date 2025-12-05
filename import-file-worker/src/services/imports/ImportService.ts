import type {AssignmentService} from "./AssignmentService";
import { ZapisiKzParser } from "../parsing/formats/ZapisiKzParser.ts";
import type { BranchFields, OrganizationInfo } from "../../../../src/types";
import type { ClientService } from "./ClientService.ts";
import type { StaffService } from "./StaffService.ts";
import { DikidiParser } from "../parsing/formats/DikidiParser.ts";

export class ImportService {
    constructor(
        private assignmentService: AssignmentService,
        private clientService: ClientService,
        private employeeService: StaffService,
        private parser: ZapisiKzParser | DikidiParser
    ) {}

  async processImport(filePath: string, organization: OrganizationInfo, branch: BranchFields) {
    console.log(`📥 Processing import for ${organization.name}`);

    try {
      const result = await this.parser.parseFile(filePath);

      const stats = {
        total: result.records.length,
        created: 0,
        duplicates: 0,
        errors: 0
      };

      const concurrency = 50;
      const records = [...result.records];

      while (records.length > 0) {
        const chunk = records.splice(0, concurrency);

        await Promise.all(
          chunk.map(async (record) => {
            try {

              // const employee = await this.employeeService.findOrCreate(
              //   record.masterFirsName,
              //   record.masterLastName,
              //   organization,
              //   branch
              // );
              //
              // const client = await this.clientService.findOrCreate(
              //   record.clientName,
              //   record.phoneNumber
              // );
              //
              // await this.assignmentService.createFromImport(
              //   record,
              //   branch,
              //   organization,
              //   client,
              //   employee,
              //   branch.timezone
              // );


              stats.created++;
            } catch (error) {
              if (error instanceof Error) {
                if (error.name === "SequelizeDatabaseError") {
                  console.error(`❌ Critical DB error, stopping import:`, error);
                  stats.errors++;
                  throw error;
                } else if (error.message.includes("Duplicate")) {
                  stats.duplicates++;
                } else {
                  console.error(`❌ Error processing record:`, error);
                  stats.errors++;
                }
              }
            }
          })
        );
      }

      console.log(`✅ Import completed:`);
      console.log(`   Total: ${stats.total}`);
      console.log(`   Created: ${stats.created}`);
      console.log(`   Duplicates: ${stats.duplicates}`);
      console.log(`   Errors: ${stats.errors}`);

      return stats;
    } catch (e) {
      console.error("Import service error", e);
    }
  }
}