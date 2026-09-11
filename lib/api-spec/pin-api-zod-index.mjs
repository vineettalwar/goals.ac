import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Orval appends `export * from "./generated/types"` which collides with
// zod schemas already exported from `./generated/api`. Keep the package
// surface as hooks/schemas from api only (types stay importable via deep path).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const indexPath = path.join(root, "lib", "api-zod", "src", "index.ts");
writeFileSync(indexPath, 'export * from "./generated/api";\n');
