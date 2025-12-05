import { startWorker } from "./worker.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log(path.resolve(__dirname, "../.env"));

startWorker().catch((err) => {
    console.error("Worker failed to start:", err);
    process.exit(1);
});
