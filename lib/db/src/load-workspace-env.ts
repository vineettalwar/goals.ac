import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../..");

config({ path: path.join(workspaceRoot, ".env") });
config({ path: path.join(workspaceRoot, ".env.local"), override: true });
