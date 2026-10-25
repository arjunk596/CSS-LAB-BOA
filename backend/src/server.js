import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { loadLevels } from "./levelRegistry.js";
import {
  createSession,
  openShell,
  resizeShell,
  destroySession,
} from "./sessionManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const app = express();

app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/levels", (_req, res) => {
  res.json(loadLevels());
});

const server = app.listen(PORT, () => {
  console.log(`CSS-LAB-BOA backend listening on :${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

const wss = new WebSocketServer({ server, path: "/session" });

wss.on("connection", async (ws) => {
  let container, exec, stream;
  try {
    container = await createSession();
    ({ exec, stream } = await openShell(container));
    console.log(`Session started: container ${container.id.slice(0, 12)}`);
  } catch (err) {
    console.error("Failed to start session:", err);
    ws.close(1011, "sandbox failed to start");
    return;
  }

  stream.on("data", (chunk) => { if (ws.readyState === ws.OPEN) ws.send(chunk); });
  stream.on("end", () => ws.close());

  ws.on("message", (data, isBinary) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "resize") { resizeShell(exec, msg.cols, msg.rows); return; }
      } catch (_) {}
    }
    stream.write(data);
  });

  const cleanup = async () => {
    stream.end();
    if (container) {
      await destroySession(container);
      console.log(`Session destroyed: container ${container.id.slice(0, 12)}`);
    }
  };
  ws.on("close", cleanup);
  ws.on("error", cleanup);
});
