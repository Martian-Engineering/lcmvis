import { useEffect, useState } from "react";

/**
 * Dev-only overlay that enables visual annotation feedback via agentation.
 * Uses lazy dynamic import so agentation is fully tree-shaken from
 * production bundles.
 */
export function AgentationOverlay() {
  const [Comp, setComp] = useState(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    import("agentation").then((mod) => setComp(() => mod.Agentation));
  }, []);

  if (!Comp) return null;
  return <Comp endpoint="http://localhost:4747" />;
}
