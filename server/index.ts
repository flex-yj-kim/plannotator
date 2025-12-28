/**
 * Plannotator Ephemeral Server
 *
 * Spawned by ExitPlanMode hook to serve Plannotator UI and handle approve/deny decisions.
 * Uses random port to support multiple concurrent Claude Code sessions.
 *
 * Usage: bun run server/index.ts "<plan markdown content>"
 */

import { $ } from "bun";
import { join, dirname } from "path";

const planContent = process.argv[2] || Bun.env.PLAN_CONTENT || "";

if (!planContent) {
  console.error("No plan content provided. Usage: bun run server/index.ts \"<plan>\"");
  process.exit(1);
}

// Promise that resolves when user makes a decision
let resolveDecision: (result: { approved: boolean; feedback?: string }) => void;
const decisionPromise = new Promise<{ approved: boolean; feedback?: string }>(
  (resolve) => { resolveDecision = resolve; }
);

// Resolve paths relative to this script
const serverDir = dirname(import.meta.path);
const distDir = join(serverDir, "..", "dist");

const server = Bun.serve({
  port: 0, // Random available port - critical for multi-instance support

  async fetch(req) {
    const url = new URL(req.url);

    // API: Get plan content
    if (url.pathname === "/api/plan") {
      return Response.json({ plan: planContent });
    }

    // API: Approve plan
    if (url.pathname === "/api/approve" && req.method === "POST") {
      resolveDecision({ approved: true });
      return Response.json({ ok: true });
    }

    // API: Deny with feedback
    if (url.pathname === "/api/deny" && req.method === "POST") {
      try {
        const body = await req.json() as { feedback?: string };
        resolveDecision({ approved: false, feedback: body.feedback || "Plan rejected by user" });
      } catch {
        resolveDecision({ approved: false, feedback: "Plan rejected by user" });
      }
      return Response.json({ ok: true });
    }

    // Serve static files from dist/
    let filePath = url.pathname;
    if (filePath === "/" || filePath === "") {
      filePath = "/index.html";
    }

    const file = Bun.file(join(distDir, filePath));
    if (await file.exists()) {
      // Set appropriate content types
      const contentType = getContentType(filePath);
      return new Response(file, {
        headers: contentType ? { "Content-Type": contentType } : {}
      });
    }

    // Fallback to index.html for SPA routing
    const indexFile = Bun.file(join(distDir, "index.html"));
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" }
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

function getContentType(path: string): string | null {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  return null;
}

// Log to stderr so it doesn't interfere with hook stdout
console.error(`Plannotator server running on http://localhost:${server.port}`);

// Open browser
try {
  await $`open http://localhost:${server.port}`.quiet();
} catch {
  // Fallback for non-macOS
  console.error(`Open browser manually: http://localhost:${server.port}`);
}

// Wait for user decision (blocks until approve/deny)
const result = await decisionPromise;

// Give browser time to receive response and update UI
await Bun.sleep(1500);

// Cleanup
server.stop();

// Output JSON for PermissionRequest hook decision control
if (result.approved) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "allow"
      }
    }
  }));
} else {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "deny",
        message: result.feedback || "Plan changes requested"
      }
    }
  }));
}

process.exit(0);
