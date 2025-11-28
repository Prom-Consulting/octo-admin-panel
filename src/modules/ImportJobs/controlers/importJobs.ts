import type { NextFunction, Request, Response } from "express";
import { parseFile } from "../../../utils /uploadFile/uploadFile.ts";

export const createImportJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fields, files, durationMs } = await parseFile(req);

    const file = files.file;
    console.log(req.file);

    console.log("Fields:", fields);
    console.log("File:", file);

    if (!file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    res.status(200).send({
      file_name: files[0],
      duration: durationMs,
      message: "File uploaded"
    });
  } catch (e) {
    console.error("Creating new importJob", e);
    next(e);
  }
};