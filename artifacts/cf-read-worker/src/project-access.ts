export {
  getAccessibleProject,
  listAccessibleProjectIds,
  requireProjectAccess,
} from "@workspace/cf-edge/project-access";

export function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
