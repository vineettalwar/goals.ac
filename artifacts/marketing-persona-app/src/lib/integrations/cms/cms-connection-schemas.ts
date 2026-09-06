import type { ConnectionMethod, PublishDestinationId } from "../../projects/publishing-destinations";
import { PRIMARY_SCHEMAS } from "./cms-schemas-primary";
import { SHOPS_SCHEMAS } from "./cms-schemas-shops";
import { HEADLESS_SCHEMAS } from "./cms-schemas-headless";
import { EMAIL_SCHEMAS } from "./cms-schemas-email";

// Re-export types so callers that import from this path keep working.
export type {
  ConnectionFieldType,
  ConnectionFieldOption,
  ConnectionFieldDef,
  ConnectedDetailRow,
  CmsConnectionSchema,
} from "./cms-schema-helpers";
export { buildOutputModeField } from "./cms-schema-helpers";

const CMS_CONNECTION_SCHEMAS: Partial<Record<PublishDestinationId, import("./cms-schema-helpers").CmsConnectionSchema>> = {
  ...PRIMARY_SCHEMAS,
  ...SHOPS_SCHEMAS,
  ...HEADLESS_SCHEMAS,
  ...EMAIL_SCHEMAS,
};

export function getCmsConnectionSchema(
  id: PublishDestinationId,
): import("./cms-schema-helpers").CmsConnectionSchema | undefined {
  return CMS_CONNECTION_SCHEMAS[id];
}

export function getInitialFormValues(id: PublishDestinationId): Record<string, string> {
  const schema = getCmsConnectionSchema(id);
  if (!schema) return {};
  const values = schema.resetValues();
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined && !values[field.key]) {
      values[field.key] = field.defaultValue;
    }
  }
  return values;
}

export function fieldIsVisible(
  field: import("./cms-schema-helpers").ConnectionFieldDef,
  connectionMethod: ConnectionMethod,
  values: Record<string, string>,
): boolean {
  if (!field.when) return true;
  if (
    field.when.connectionMethod &&
    !field.when.connectionMethod.includes(connectionMethod)
  ) {
    return false;
  }
  if (field.when.authType) {
    const authType = values.authType || "basic";
    if (!field.when.authType.includes(authType)) return false;
  }
  return true;
}
