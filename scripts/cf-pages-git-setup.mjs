#!/usr/bin/env node
/**
 * Migrate direct-upload Cloudflare Pages projects to Git-connected builds.
 *
 * Direct-upload Pages projects cannot add Git later (Cloudflare API error 8000069).
 * This script deletes and recreates them with GitHub source once the account Git
 * installation is healthy.
 *
 *   node scripts/cf-pages-git-setup.mjs check
 *   node scripts/cf-pages-git-setup.mjs migrate
 *   node scripts/cf-pages-git-setup.mjs migrate --dry-run
 *
 * Requires: pnpm exec wrangler login (OAuth) or CLOUDFLARE_API_TOKEN.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const cfAccount = JSON.parse(
  readFileSync(join(root, "scripts/cloudflare-account.json"), "utf8"),
);

const GITHUB = {
  owner: "vineettalwar",
  repo_name: "goals.ac",
  production_branch: "main",
};

const PAGE_PROJECTS = [
  {
    name: "goals-ac-app",
    build_command:
      "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/goals-app-ui run build",
    destination_dir: "artifacts/goals-app-ui/dist",
    path_includes: [
      "artifacts/goals-app-ui/**",
      "lib/api-client-react/**",
      "lib/api-zod/**",
      "lib/api-spec/**",
      "pnpm-lock.yaml",
      "package.json",
    ],
    deploy: "pnpm run cf:pages:app",
  },
  {
    name: "goals-ac-marketing",
    build_command:
      "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/marketing-pages run build",
    destination_dir: "artifacts/marketing-pages/dist",
    path_includes: [
      "artifacts/marketing-pages/**",
      "artifacts/marketing-persona-app/**",
      "scripts/build-marketing-static.mjs",
      "pnpm-lock.yaml",
      "package.json",
    ],
    deploy: "pnpm run cf:pages:marketing",
  },
];

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-")) ?? "check";
const dryRun = args.includes("--dry-run");

function readApiToken() {
  if (process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    return process.env.CLOUDFLARE_API_TOKEN.trim();
  }
  const configPath = join(homedir(), "Library/Preferences/.wrangler/config/default.toml");
  const text = readFileSync(configPath, "utf8");
  const match = text.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error(
      "No Cloudflare credentials. Run `pnpm exec wrangler login` or set CLOUDFLARE_API_TOKEN.",
    );
  }
  return match[1];
}

async function cfApi(path, { method = "GET", body } = {}) {
  const token = readApiToken();
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  return json;
}

function gitInstallHelp() {
  console.log(`
Cloudflare Pages Git installation is broken on this account (error 8000011).

Fix GitHub integration, then rerun this script:

  1. Open https://github.com/settings/installations
  2. Uninstall "Cloudflare Workers and Pages" (if present)
  3. Open https://github.com/apps/cloudflare-workers-and-pages/installations/new
  4. Install on vineettalwar and grant access to goals.ac
  5. Run: node scripts/cf-pages-git-setup.mjs check
  6. Run: node scripts/cf-pages-git-setup.mjs migrate

Dashboard fallback (per project):
  Workers & Pages → select project → Settings → Builds → Connect
  Repo: vineettalwar/goals.ac, branch: main
`);
}

function projectPayload(project) {
  return {
    name: project.name,
    production_branch: GITHUB.production_branch,
    source: {
      type: "github",
      config: {
        owner: GITHUB.owner,
        repo_name: GITHUB.repo_name,
        production_branch: GITHUB.production_branch,
        deployments_enabled: true,
        production_deployments_enabled: true,
        preview_deployment_setting: "all",
        path_includes: project.path_includes,
      },
    },
    build_config: {
      root_dir: "/",
      build_command: project.build_command,
      destination_dir: project.destination_dir,
      build_caching: true,
    },
  };
}

async function checkGitInstallation() {
  const probeName = `goals-ac-git-probe-${Date.now()}`;
  console.log(`→ Probing Git installation (${probeName})…`);
  const created = await cfApi(`/accounts/${cfAccount.account_id}/pages/projects`, {
    method: "POST",
    body: projectPayload({ ...PAGE_PROJECTS[0], name: probeName }),
  });

  if (!created.success) {
    const code = created.errors?.[0]?.code;
    if (code === 8000011) {
      gitInstallHelp();
      process.exit(1);
    }
    throw new Error(created.errors?.map((e) => e.message).join("; ") ?? "Git probe failed");
  }

  console.log("✓ Git installation healthy");
  if (!dryRun) {
    await cfApi(`/accounts/${cfAccount.account_id}/pages/projects/${probeName}`, {
      method: "DELETE",
    });
    console.log("→ Removed probe project");
  } else {
    console.log(`  (dry-run: would delete probe project ${probeName})`);
  }
}

async function getProject(name) {
  const res = await cfApi(`/accounts/${cfAccount.account_id}/pages/projects/${name}`);
  if (!res.success) return null;
  return res.result;
}

async function migrateProject(project) {
  const existing = await getProject(project.name);
  if (!existing) {
    console.log(`→ ${project.name}: not found — creating Git-connected project`);
  } else if (existing.source?.type === "github") {
    console.log(`✓ ${project.name}: already Git-connected (${GITHUB.owner}/${GITHUB.repo_name})`);
    return;
  } else {
    console.log(`→ ${project.name}: direct-upload — delete + recreate with Git`);
    if (dryRun) {
      console.log(`  (dry-run: would DELETE ${project.name})`);
    } else {
      const deleted = await cfApi(
        `/accounts/${cfAccount.account_id}/pages/projects/${project.name}`,
        { method: "DELETE" },
      );
      if (!deleted.success) {
        throw new Error(
          `${project.name}: delete failed — ${deleted.errors?.map((e) => e.message).join("; ")}`,
        );
      }
    }
  }

  if (dryRun) {
    console.log(`  (dry-run: would CREATE ${project.name} with GitHub source)`);
    return;
  }

  const created = await cfApi(`/accounts/${cfAccount.account_id}/pages/projects`, {
    method: "POST",
    body: projectPayload(project),
  });
  if (!created.success) {
    const message = created.errors?.map((e) => e.message).join("; ") ?? "create failed";
    throw new Error(`${project.name}: ${message}`);
  }
  console.log(`✓ ${project.name}: Git-connected — ${created.result.subdomain}`);
}

async function listProjects() {
  const res = await cfApi(`/accounts/${cfAccount.account_id}/pages/projects`);
  if (!res.success) throw new Error("Failed to list Pages projects");
  for (const project of res.result) {
    const git =
      project.source?.type === "github"
        ? `${project.source.config.owner}/${project.source.config.repo_name}`
        : "No Git connection";
    console.log(`  ${project.name}: ${git}`);
  }
}

async function main() {
  console.log(`goals.ac — Pages Git setup (${cfAccount.account_name})\n`);

  if (command === "check") {
    await checkGitInstallation();
    await listProjects();
    return;
  }

  if (command === "migrate") {
    await checkGitInstallation();
    for (const project of PAGE_PROJECTS) {
      await migrateProject(project);
    }
    console.log("\nDone. Push to main to trigger builds, or run manual deploy:");
    for (const project of PAGE_PROJECTS) {
      console.log(`  ${project.deploy}`);
    }
    return;
  }

  if (command === "status") {
    await listProjects();
    return;
  }

  console.log(`Unknown command: ${command}`);
  console.log("Usage: node scripts/cf-pages-git-setup.mjs [check|migrate|status] [--dry-run]");
  process.exit(1);
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
