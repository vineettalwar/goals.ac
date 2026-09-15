import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { handleV1Connections } from "./connections";
import { handleV1Render } from "./render";
import { handleV1Generate } from "./generate";
import { handleV1GenerateWithAgents } from "./generate-with-agents";
import { handleV1PublishAndImage } from "./publish";

export async function handleV1Api(
  request: Request,
  path: string,
  env?: CfEdgeBindings,
): Promise<Response | null> {
  return (
    (await handleV1Connections(request, path)) ??
    (await handleV1Render(request, path)) ??
    (await handleV1Generate(request, path)) ??
    (await handleV1GenerateWithAgents(request, path, env)) ??
    (await handleV1PublishAndImage(request, path, env))
  );
}
