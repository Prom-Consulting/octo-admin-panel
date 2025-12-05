import type { NextFunction, Request, Response } from "express";
import { parseFile } from "../../../utils /uploadFile/uploadFile.ts";
import ImportJob from "../models/ImportJobs.ts";
import { getBranchAndOrganization } from "../../../utils /auth/getBranchAndOrganization.ts";
import path from "path";
import { connect, StringCodec } from "nats";
import { envConfig } from "../../../../config/envConfig.ts";

export const createImportAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { fields, files, durationMs, uploadDir } = await parseFile(req);

    const { importType, organizationId, branchId } = fields;
    console.log(importType);
    if (!importType) {
      return res.status(400).send("Import type is required");
    }

    const { branch, organization } = await getBranchAndOrganization(req, {
      required: true
    });

    const rawFile = files.file;
    if (!rawFile) {
      return res.status(400).json({ error: "File not loaded" });
    }

    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    if (!file) return res.status(400).json({ error: "File not loaded" });

    const ext = path.extname(file.originalFilename || "").toLowerCase();
    if (ext !== ".xlsx") {
      return res.status(400).json({
        error:
          "Invalid file format. Only .xlsx is supported. The old .xls format is not supported."
      });
    }

    if (
      file.mimetype !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || !file
    ) {
      return res.status(400).json({
        error: "Incorrect file MIME type. Expected .xlsx"
      });
    }

    const newImport = await ImportJob.create({
      user_id: user.id,
      branch_id: branch.id,
      organization_id: organization.id,
      file_name: file.originalFilename,
      stored_file_name: path.basename(file.filepath),
      status: "PENDING",
    });

    const nc = await connect({ servers: envConfig.NATS_SERVER });
    const sc = StringCodec();

    await nc.publish(
      "import.excel",
      sc.encode(JSON.stringify({
        importJobId: newImport.id,
        filePath: path.basename(file.filepath),
        relativePath: uploadDir + "/" +  path.basename(file.filepath),
        importType: importType[0],
        organization: {
          id: organization.id,
          name: organization.name,
        },
        branch: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          timezone: branch.timezone,
        }
      }))
    );

    await nc.close();

    res.status(200).send({
      file_name: file.originalFilename,
      stored: path.basename(file.filepath),
      duration: durationMs,
      job_id: newImport.id,
      message: "File uploaded",
      newImport,
      uploadDir,
      relativePath: uploadDir + "/" +  path.basename(file.filepath),
    });
  } catch (e) {
    console.error("Creating new importJob", e);
    next(e);
  }
};