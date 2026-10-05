import { describe, expect, it } from "bun:test";
import { app } from "../index";

describe("E2E Server & API Integration", () => {
  it("responds to /api/health", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("serves static HTML on /", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Ular Tangga Multiplayer");
  });

  it("handles room lifecycle: create, join, and start", async () => {
    // 1. Create Room
    const createRes = await app.request("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Salis" }),
    });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    expect(createData.roomCode).toBeDefined();
    expect(createData.roomCode.length).toBe(4);
    expect(createData.playerId).toBeDefined();

    const roomCode = createData.roomCode;
    const hostId = createData.playerId;

    // 2. Join Room
    const joinRes = await app.request(`/api/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Budi" }),
    });
    expect(joinRes.status).toBe(200);
    const joinData = await joinRes.json();
    expect(joinData.state.players.length).toBe(2);

    const joinerId = joinData.playerId;

    // 3. Start Game
    const startRes = await app.request(`/api/rooms/${roomCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: hostId }),
    });
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    expect(startData.state.status).toBe("PLAYING");
    expect(startData.state.currentRound).toBe(1);

    // 4. Submit Inputs for both players
    const submitHost = await app.request(`/api/rooms/${roomCode}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: hostId, input: 5 }),
    });
    expect(submitHost.status).toBe(200);

    const submitJoiner = await app.request(`/api/rooms/${roomCode}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: joinerId, input: -3 }),
    });
    expect(submitJoiner.status).toBe(200);
    const submitJoinerData = await submitJoiner.json();
    expect(submitJoinerData.resolved).toBe(true);
  });
});
