import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { roomManager } from "./game/RoomManager";
import { sanitizeNumberRange } from "./game/MathDice";
import { initDatabase, getLeaderboard, recordMatchWin, saveAvatarToDb, getAvatarFromDb } from "./db/database";
import { upgradeWebSocket, websocket, registerSocket, unregisterSocket } from "./realtime";

initDatabase(process.env.DATABASE_PATH || "game.db");

const app = new Hono();

app.use("/api/*", cors());

// Native WebSocket endpoint bawaan Bun + Hono
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const code = c.req.query("code") || "";
    const playerId = c.req.query("playerId") || "";

    return {
      onOpen(event, ws) {
        if (code) {
          registerSocket(code, ws, playerId);
        }
      },
      onMessage(event, ws) {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data.toString();
          const msg = JSON.parse(raw);
          if (msg.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          } else if (msg.type === "subscribe" && msg.code) {
            registerSocket(msg.code, ws, msg.playerId);
          }
        } catch (e) {}
      },
      onClose(event, ws) {
        unregisterSocket(ws);
      },
    };
  })
);

// Avatar in-memory cache to prevent huge base64 strings in Pusher payloads
const avatarStore = new Map<string, { buffer: Uint8Array; mime: string }>();

function storeAvatar(playerId: string, dataUrl: string | null) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    const mime = match[1];
    const buffer = new Uint8Array(Buffer.from(match[2], "base64"));
    avatarStore.set(playerId, { buffer, mime });
    try {
      saveAvatarToDb(playerId, mime, buffer);
    } catch (e) {
      console.error("Gagal simpan avatar ke DB", e);
    }
  }
}

// REST APIs
app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/pusher-config", (c) => {
  const cfg = getPusherConfig();
  return c.json({
    key: cfg.key,
    cluster: cfg.cluster,
  });
});

app.get("/api/avatars/:id", (c) => {
  const id = c.req.param("id");
  let item = avatarStore.get(id);
  if (!item) {
    const dbItem = getAvatarFromDb(id);
    if (dbItem) {
      item = { buffer: dbItem.data, mime: dbItem.mime };
      avatarStore.set(id, item);
    }
  }
  if (!item) return c.notFound();
  c.header("Content-Type", item.mime);
  c.header("Cache-Control", "public, max-age=86400");
  return c.body(item.buffer);
});

app.get("/api/leaderboard", (c) => c.json(getLeaderboard()));

app.get("/api/rooms", (c) => c.json(roomManager.listPublicRooms()));

app.post("/api/rooms", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || "Pemain").trim();
    const avatar = body.avatar ? String(body.avatar) : null;
    const turnTimer = [10, 20, 30].includes(Number(body.turnTimer)) ? Number(body.turnTimer) : 10;
    const numberRange = sanitizeNumberRange(body.numberRange);
    const playerId = crypto.randomUUID();

    if (avatar) {
      storeAvatar(playerId, avatar);
    }

    const room = roomManager.createRoom(name, playerId, avatar, turnTimer, numberRange);

    room.onGameEnd = (winnerName, rollsCount) => {
      recordMatchWin(room.code, winnerName, rollsCount);
    };

    return c.json({
      roomCode: room.code,
      playerId,
      state: room.getState(),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/api/rooms/:code/join", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || "Pemain").trim();
    const avatar = body.avatar ? String(body.avatar) : null;
    const room = roomManager.getRoom(code);

    if (!room) {
      return c.json({ error: `Room ${code.toUpperCase()} tidak ditemukan` }, 404);
    }

    const reqPlayerId = body.playerId ? String(body.playerId) : null;
    if (reqPlayerId) {
      const existing = room.players.find((p) => p.id === reqPlayerId);
      if (existing) {
        if (avatar) {
          storeAvatar(existing.id, avatar);
          existing.avatar = avatar;
        }
        return c.json({
          roomCode: room.code,
          playerId: existing.id,
          state: room.getState(),
        });
      }
    }

    if (room.status !== "LOBBY") {
      return c.json({ error: "Game di room ini sudah berlangsung" }, 400);
    }

    const playerId = crypto.randomUUID();
    if (avatar) {
      storeAvatar(playerId, avatar);
    }

    room.addPlayer(name, playerId, avatar);
    await room.broadcastState("player_joined");

    return c.json({
      roomCode: room.code,
      playerId,
      state: room.getState(),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.get("/api/rooms/:code", (c) => {
  const code = c.req.param("code");
  const room = roomManager.getRoom(code);
  if (!room) {
    return c.json({ error: "Room tidak ditemukan" }, 404);
  }
  return c.json({ state: room.getState() });
});

app.post("/api/rooms/:code/start", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const playerId = String(body.playerId || "");
    const room = roomManager.getRoom(code);

    if (!room) return c.json({ error: "Room tidak ditemukan" }, 404);

    await room.startGame(playerId);
    return c.json({ success: true, state: room.getState() });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/api/rooms/:code/range", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const playerId = String(body.playerId || "");
    const room = roomManager.getRoom(code);

    if (!room) return c.json({ error: "Room tidak ditemukan" }, 404);

    const numberRange = room.setNumberRange(body.numberRange, playerId);
    await room.broadcastState("room_updated");
    return c.json({ success: true, numberRange, state: room.getState() });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/api/rooms/:code/spin", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const playerId = String(body.playerId || "");
    const room = roomManager.getRoom(code);

    if (!room) return c.json({ error: "Room tidak ditemukan" }, 404);

    const result = room.spinRoll(playerId);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/api/rooms/:code/submit", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const playerId = String(body.playerId || "");
    const input = body.input === null || body.input === undefined ? null : Number(body.input);
    const room = roomManager.getRoom(code);

    if (!room) return c.json({ error: "Room tidak ditemukan" }, 404);

    const result = await room.submitPlayerRoll(playerId, input);
    return c.json({ success: true, ...result, state: room.getState() });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/api/rooms/:code/leave", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const playerId = String(body.playerId || "");
    const room = roomManager.getRoom(code);

    if (room) {
      await room.removePlayer(playerId);
      if (room.players.length === 0) {
        roomManager.removeRoom(room.code);
      }
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// Serve frontend dist with strict no-cache for HTML/routes to prevent mobile stale cache
app.use("/*", async (c, next) => {
  await next();
  const path = c.req.path;
  if (path === "/" || path.endsWith(".html") || !path.includes(".")) {
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    c.header("Pragma", "no-cache");
    c.header("Expires", "0");
  } else if (path.startsWith("/assets/")) {
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  }
});
app.use("/*", serveStatic({ root: "./client/dist" }));
app.get("*", serveStatic({ path: "./client/dist/index.html" }));

const port = Number(process.env.PORT) || 3456;

export { app };
export default {
  port,
  fetch: app.fetch,
  websocket,
};
