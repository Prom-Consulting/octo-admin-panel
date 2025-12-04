import type {AssignmentService} from "./AssignmentService";
import { ZapisiKzParser } from "../parsing/formats/ZapisiKzParser.ts";
import type { OrganizationInfo } from "../../../../src/types";
import type { BranchInfo } from "../../../../src/modules/staff/models/OrganizationStaff.ts";

export class ImportService {
    constructor(
        private assignmentService: AssignmentService,
        private parser: ZapisiKzParser
    ) {}

    async processImport(
        filePath: string,
        organization: OrganizationInfo,
        branch: BranchInfo,
    ) {
        console.log(`📥 Processing import for ${organization.name}`);

        const result = await this.parser.parseFile(filePath);

        const stats = {
            total: result.records.length,
            created: 0,
            duplicates: 0,
            errors: 0
        };

      for (const record of result.records) {
        try {
          await this.assignmentService.createFromImport(record, branch, organization, branch.timezone);
          stats.created++;
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === "SequelizeDatabaseError") {
              console.error(`❌ Critical DB error, stopping import:`, error);
              stats.errors++;
              break;
            } else if (error.message.includes('Duplicate')) {
              stats.duplicates++;
            } else {
              console.error(`❌ Error processing record:`, error);
              stats.errors++;
            }
          }
        }
      }

      console.log(`✅ Import completed:`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   Created: ${stats.created}`);
        console.log(`   Duplicates: ${stats.duplicates}`);
        console.log(`   Errors: ${stats.errors}`);

        return stats;
    }
}