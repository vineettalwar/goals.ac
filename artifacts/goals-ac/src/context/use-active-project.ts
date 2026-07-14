import { useContext } from "react";
import { ActiveProjectContext } from "./active-project-context";

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) throw new Error("useActiveProject must be used within ActiveProjectProvider");
  return ctx;
}
