import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { roomManager } from "./game/RoomManager";
import { initDatabase, getLeaderboard, recordMatchWin } from "./db/database";
import { getPusherConfig } from "./realtime";

initDatabase("game.db");

const app = new Hono();

app.use("/api/*", cors());

// REST APIs
app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/pusher-config", (c) => {
  const cfg = getPusherConfig();
  return c.json({
    key: cfg.key,
    cluster: cfg.cluster,
  });
});

app.get("/api/leaderboard", (c) => c.json(getLeaderboard()));

app.get("/api/rooms", (c) => c.json(roomManager.listPublicRooms()));

app.post("/api/rooms", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || "Pemain").trim();
    const playerId = crypto.randomUUID();
    const room = roomManager.createRoom(name, playerId);

    room.onGameEnd = (winnerName, totalRounds) => {
      recordMatchWin(room.code, winnerName, totalRounds);
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
    const room = roomManager.getRoom(code);

    if (!room) {
      return c.json({ error: `Room ${code.toUpperCase()} tidak ditemukan` }, 404);
    }
    if (room.status !== "LOBBY") {
      return c.json({ error: "Game di room ini sudah berlangsung" }, 400);
    }

    const playerId = crypto.randomUUID();
    room.addPlayer(name, playerId);
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

    room.startGame(playerId);
    return c.json({ success: true, state: room.getState() });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.post("/api/rooms/:code/submit", async (c) => {
  try {
    const code = c.req.param("code");
    const body = await c.req.json().catch(() => ({}));
    const playerId = String(body.playerId || "");
    const input = Number(body.input);
    const room = roomManager.getRoom(code);

    if (!room) return c.json({ error: "Room tidak ditemukan" }, 404);

    const resolved = room.submitPlayerInput(playerId, input);
    return c.json({ success: true, resolved, state: room.getState() });
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
      room.removePlayer(playerId);
      if (room.players.length === 0) {
        roomManager.removeRoom(room.code);
      }
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// Serve frontend dist
app.use("/*", serveStatic({ root: "./client/dist" }));
app.get("*", serveStatic({ path: "./client/dist/index.html" }));

const port = Number(process.env.PORT) || 3456;

export { app };
export default {
  port,
  fetch: app.fetch,
};
