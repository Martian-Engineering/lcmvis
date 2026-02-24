---
name: agentation
description: Add Agentation visual feedback toolbar to a Vite + React project
---

# Agentation Setup

Set up the Agentation annotation toolbar in this project.

## Steps

1. **Check if already installed**
   - Look for `agentation` in package.json dependencies
   - If not found, run `npm install agentation`

2. **Check if already configured**
   - Search for `<Agentation` or `import { Agentation }` or `AgentationOverlay` in src/
   - If found, report that Agentation is already set up and exit

3. **Add the component**

   This is a Vite + React project. Create `src/components/AgentationOverlay.jsx`:

   ```jsx
   import { useEffect, useState } from "react";

   export function AgentationOverlay() {
     const [Comp, setComp] = useState(null);

     useEffect(() => {
       if (!import.meta.env.DEV) return;
       import("agentation").then((mod) => setComp(() => mod.Agentation));
     }, []);

     if (!Comp) return null;
     return <Comp endpoint="http://localhost:4747" />;
   }
   ```

   Then add `<AgentationOverlay />` to the root `App.jsx`, after all other content.

4. **Confirm component setup**
   - Tell the user the Agentation toolbar component is configured

5. **Check if MCP server already configured**
   - Run `claude mcp list` to check if `agentation` MCP server is already registered
   - If yes, skip to final confirmation step

6. **Configure Claude Code MCP server**
   - Run: `claude mcp add agentation -- npx agentation-mcp server`
   - This registers the MCP server with Claude Code automatically

7. **Confirm full setup**
   - Tell the user both components are set up:
     - React component for the toolbar (`<AgentationOverlay />`)
     - MCP server configured to auto-start with Claude Code
   - Tell user to restart Claude Code to load the MCP server
   - Explain that annotations will now sync to Claude automatically

## Notes

- The `import.meta.env.DEV` check ensures Agentation only loads in development (Vite convention)
- The lazy dynamic import tree-shakes agentation from production builds
- The MCP server auto-starts when Claude Code launches (uses npx, no global install needed)
- Port 4747 is used by default for the HTTP server
- Run `npx agentation-mcp doctor` to verify setup
