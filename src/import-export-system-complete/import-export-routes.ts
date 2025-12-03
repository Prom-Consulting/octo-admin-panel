/**
 * 🌐 Import/Export API Routes
 *
 * RESTful API endpoints for import and export operations
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { ImportService, ExportService } from "./import-export-service";
import type { ImportJobData, ExportJobData } from "./import-export-service";

// ═══════════════════════════════════════════════════════════════════════════
// 📁 Multer Configuration
// ═══════════════════════════════════════════════════════════════════════════

const uploadDir = "/tmp/imports";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel and CSV files are allowed."));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ Middleware
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate branch access (you should implement proper auth)
 */
function validateBranchAccess(req: Request, res: Response, next: any) {
  const { branchId } = req.params;
  const { organizationId } = req.body;

  // TODO: Implement proper authentication and authorization
  // Check if user has access to this branch and organization

  if (!branchId || !organizationId) {
    return res.status(400).json({
      success: false,
      error: "branchId and organizationId are required",
    });
  }

  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// 📥 Import Routes
// ═══════════════════════════════════════════════════════════════════════════

export function registerImportExportRoutes(app: Express): void {
  // ─────────────────────────────────────────────────────────────────────────
  // 📥 IMPORT ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/branches/:branchId/imports/upload
   * Upload and queue import file
   */
  app.post(
    "/api/branches/:branchId/imports/upload",
    upload.single("file"),
    validateBranchAccess,
    async (req: Request, res: Response) => {
      try {
        const { branchId } = req.params;
        const {
          organizationId,
          importType,
          skipDuplicates,
          updateExisting,
          batchSize,
        } = req.body;

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: "No file uploaded",
          });
        }

        console.log(`📥 Import upload received:`);
        console.log(`   File: ${req.file.originalname}`);
        console.log(`   Branch: ${branchId}`);
        console.log(`   Organization: ${organizationId}`);
        console.log(`   Type: ${importType}`);

        const jobData: ImportJobData = {
          jobId: `import_${Date.now()}`,
          filePath: req.file.path,
          branchId: parseInt(branchId),
          organizationId: parseInt(organizationId),
          importType: importType || "dikidi",
          options: {
            skipDuplicates: skipDuplicates === "true",
            updateExisting: updateExisting === "true",
            batchSize: batchSize ? parseInt(batchSize) : 100,
          },
        };

        const jobId = await ImportService.createImportJob(jobData);

        res.json({
          success: true,
          data: {
            jobId,
            message: "Import queued successfully",
            estimatedTime: "1-5 minutes",
          },
        });
      } catch (error) {
        console.error("❌ Import upload error:", error);

        // Clean up uploaded file
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {}
        }

        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Import failed",
        });
      }
    }
  );

  /**
   * GET /api/branches/:branchId/imports/:jobId/status
   * Get import job status and progress
   */
  app.get(
    "/api/branches/:branchId/imports/:jobId/status",
    async (req: Request, res: Response) => {
      try {
        const { jobId } = req.params;

        const progress = await ImportService.getJobProgress(jobId);

        if (!progress) {
          return res.status(404).json({
            success: false,
            error: "Job not found",
          });
        }

        res.json({
          success: true,
          data: progress,
        });
      } catch (error) {
        console.error("❌ Status check error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to get status",
        });
      }
    }
  );

  /**
   * GET /api/branches/:branchId/imports/list
   * List all import jobs for branch
   */
  app.get(
    "/api/branches/:branchId/imports/list",
    async (req: Request, res: Response) => {
      try {
        const { branchId } = req.params;
        const { organizationId, status } = req.query;

        if (!organizationId) {
          return res.status(400).json({
            success: false,
            error: "organizationId is required",
          });
        }

        const jobs = await ImportService.getOrganizationJobs(
          parseInt(organizationId as string),
          status as any
        );

        // Filter by branch
        const filteredJobs = jobs; // You can add branch filtering here

        res.json({
          success: true,
          data: filteredJobs,
          pagination: {
            total: filteredJobs.length,
          },
        });
      } catch (error) {
        console.error("❌ List jobs error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to list jobs",
        });
      }
    }
  );

  /**
   * DELETE /api/branches/:branchId/imports/:jobId
   * Cancel import job
   */
  app.delete(
    "/api/branches/:branchId/imports/:jobId",
    async (req: Request, res: Response) => {
      try {
        const { jobId } = req.params;

        const success = await ImportService.cancelJob(jobId);

        if (!success) {
          return res.status(404).json({
            success: false,
            error: "Job not found or already completed",
          });
        }

        res.json({
          success: true,
          message: "Job cancelled successfully",
        });
      } catch (error) {
        console.error("❌ Cancel job error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to cancel job",
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 📤 EXPORT ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/branches/:branchId/exports/create
   * Create export job
   */
  app.post(
    "/api/branches/:branchId/exports/create",
    validateBranchAccess,
    async (req: Request, res: Response) => {
      try {
        const { branchId } = req.params;
        const { organizationId, exportType, format, dateFrom, dateTo } = req.body;

        console.log(`📤 Export requested:`);
        console.log(`   Branch: ${branchId}`);
        console.log(`   Organization: ${organizationId}`);
        console.log(`   Type: ${exportType}`);
        console.log(`   Format: ${format}`);

        const jobData: ExportJobData = {
          jobId: `export_${Date.now()}`,
          branchId: parseInt(branchId),
          organizationId: parseInt(organizationId),
          exportType: exportType || "assignments",
          format: format || "xlsx",
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        };

        const jobId = await ExportService.createExportJob(jobData);

        res.json({
          success: true,
          data: {
            jobId,
            message: "Export queued successfully",
            estimatedTime: "1-3 minutes",
          },
        });
      } catch (error) {
        console.error("❌ Export create error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Export failed",
        });
      }
    }
  );

  /**
   * GET /api/branches/:branchId/exports/:jobId/status
   * Get export job status
   */
  app.get(
    "/api/branches/:branchId/exports/:jobId/status",
    async (req: Request, res: Response) => {
      try {
        const { jobId } = req.params;

        const progress = await ExportService.getJobProgress(jobId);

        if (!progress) {
          return res.status(404).json({
            success: false,
            error: "Job not found",
          });
        }

        res.json({
          success: true,
          data: progress,
        });
      } catch (error) {
        console.error("❌ Status check error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to get status",
        });
      }
    }
  );

  /**
   * GET /api/branches/:branchId/exports/:jobId/download
   * Download exported file
   */
  app.get(
    "/api/branches/:branchId/exports/:jobId/download",
    async (req: Request, res: Response) => {
      try {
        const { jobId } = req.params;

        const progress = await ExportService.getJobProgress(jobId);

        if (!progress) {
          return res.status(404).json({
            success: false,
            error: "Job not found",
          });
        }

        if (progress.status !== "completed") {
          return res.status(400).json({
            success: false,
            error: "Export not yet completed",
            progress: progress.progress,
          });
        }

        const filePath = progress.result?.filePath;

        if (!filePath || !fs.existsSync(filePath)) {
          return res.status(404).json({
            success: false,
            error: "Export file not found",
          });
        }

        const fileName = path.basename(filePath);

        res.download(filePath, fileName, (err) => {
          if (err) {
            console.error("❌ Download error:", err);
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                error: "Failed to download file",
              });
            }
          }
        });
      } catch (error) {
        console.error("❌ Download error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Download failed",
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 📊 STATISTICS ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/branches/:branchId/imports/stats
   * Get import statistics
   */
  app.get(
    "/api/branches/:branchId/imports/stats",
    async (req: Request, res: Response) => {
      try {
        const { organizationId } = req.query;

        if (!organizationId) {
          return res.status(400).json({
            success: false,
            error: "organizationId is required",
          });
        }

        const jobs = await ImportService.getOrganizationJobs(
          parseInt(organizationId as string)
        );

        const stats = {
          total: jobs.length,
          completed: jobs.filter((j) => j.status === "completed").length,
          failed: jobs.filter((j) => j.status === "failed").length,
          processing: jobs.filter((j) => j.status === "processing").length,
          queued: jobs.filter((j) => j.status === "queued").length,
          totalRecordsImported: jobs.reduce(
            (sum, j) => sum + (j.createdRecords || 0),
            0
          ),
        };

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("❌ Stats error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to get stats",
        });
      }
    }
  );

  console.log("✅ Import/Export routes registered");
  console.log("   📥 Import: /api/branches/:branchId/imports/*");
  console.log("   📤 Export: /api/branches/:branchId/exports/*");
}
