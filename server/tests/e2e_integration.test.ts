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
    expect(html).toContain("Ular Tangga");
  });

  it("handles room lifecycle: create, join, and start", async () => {
    const createRes = await app.request("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Salis", avatar: "data:image/jpeg;base64,sample" }),
    });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    expect(createData.roomCode).toBeDefined();
    expect(createData.roomCode.length).toBe(4);
    expect(createData.playerId).toBeDefined();

    const roomCode = createData.roomCode;
    const hostId = createData.playerId;

    const joinRes = await app.request(`/api/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Budi" }),
    });
    expect(joinRes.status).toBe(200);
    const joinData = await joinRes.json();
    expect(joinData.state.players.length).toBe(2);

    const startRes = await app.request(`/api/rooms/${roomCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: hostId }),
    });
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    expect(startData.state.status).toBe("PLAYING");

    const submitHost = await app.request(`/api/rooms/${roomCode}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: hostId, input: 5 }),
    });
    expect(submitHost.status).toBe(200);
    const submitHostData = await submitHost.json();
    expect(submitHostData.success).toBe(true);
    expect(submitHostData.roll).toBeDefined();
    expect(submitHostData.move).toBeDefined();
    expect(Array.isArray(submitHostData.move.path)).toBe(true);
  });

  it("stores a custom number range and uses it for new challenges", async () => {
    const createRes = await app.request("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Host", numberRange: { min: 100, max: 105 } }),
    });
    const { roomCode, playerId } = await createRes.json();
    expect(roomCode).toBeDefined();

    const stateRes = await app.request(`/api/rooms/${roomCode}`);
    const state = (await stateRes.json()).state;
    expect(state.numberRange).toEqual({ min: 100, max: 105 });

    await app.request(`/api/rooms/${roomCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });

    const spinRes = await app.request(`/api/rooms/${roomCode}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const { challenge } = await spinRes.json();
    expect(challenge.screenNumber).toBeGreaterThanOrEqual(100);
    expect(challenge.screenNumber).toBeLessThanOrEqual(105);
  });

  it("only lets the host change the range, and not while playing", async () => {
    const createRes = await app.request("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Host" }),
    });
    const created = await createRes.json();
    const { roomCode, playerId } = created;

    const joinRes = await app.request(`/api/rooms/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Teman" }),
    });
    const guestId = (await joinRes.json()).playerId;

    const guestTry = await app.request(`/api/rooms/${roomCode}/range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: guestId, numberRange: { min: 0, max: 5 } }),
    });
    expect(guestTry.status).toBe(400);

    const hostTry = await app.request(`/api/rooms/${roomCode}/range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, numberRange: { min: 0, max: 5 } }),
    });
    expect(hostTry.status).toBe(200);
    expect((await hostTry.json()).numberRange).toEqual({ min: 0, max: 5 });

    await app.request(`/api/rooms/${roomCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });

    const whilePlaying = await app.request(`/api/rooms/${roomCode}/range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, numberRange: { min: 1, max: 3 } }),
    });
    expect(whilePlaying.status).toBe(400);
  });

  it("resolves a missing input as an automatic roll", async () => {
    const createRes = await app.request("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Auto" }),
    });
    const { roomCode, playerId } = await createRes.json();

    await app.request(`/api/rooms/${roomCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });

    await app.request(`/api/rooms/${roomCode}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });

    const submitRes = await app.request(`/api/rooms/${roomCode}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, input: null }),
    });
    expect(submitRes.status).toBe(200);
    const data = await submitRes.json();
    expect(data.roll.auto).toBe(true);
    expect(data.roll.userInput).toBe(0);
  });
});
