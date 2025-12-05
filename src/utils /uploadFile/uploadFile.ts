import formidable, { type Fields, type Files, type Options } from "formidable";
import type { IncomingMessage } from "http";
import * as fs from "node:fs";

export interface ParseFileOptions extends Options {}

export const parseFile = (
  req: IncomingMessage,
  options: ParseFileOptions = {}
): Promise<{ fields: Fields; files: Files; durationMs: number, uploadDir: string | undefined }> => {
  const uploadDir = options.uploadDir || "./uploads";

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const start = Date.now();

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: options.maxFileSize || 1000 * 1024 * 1024,
    ...options,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields: Fields, files: Files) => {
      if (err) return reject(err);

      const durationMs = Date.now() - start;

      resolve({ fields, files, durationMs, uploadDir });
    });
  });
};
