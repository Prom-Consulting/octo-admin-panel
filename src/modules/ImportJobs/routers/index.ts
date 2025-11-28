import express from "express";
import { createImportJob } from "../controlers/importJobs.ts";

const importJobsIndexRoute = express.Router();

importJobsIndexRoute.post("/", createImportJob);

export default importJobsIndexRoute;