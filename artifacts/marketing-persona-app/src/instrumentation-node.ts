import { initCfBindings } from "@/lib/init-cf-bindings";

export async function registerNodeInstrumentation(): Promise<void> {
  initCfBindings();
}
