import { createBunWebSocket } from "hono/bun";

export const { upgradeWebSocket, websocket } = createBunWebSocket();

// roomCode -> Set of active WebSocket instances
const roomSockets = new Map<string, Set<any>>();
// WebSocket -> metadata { code, playerId }
const socketMeta = new WeakMap<any, { code: string; playerId?: string }>();

export function registerSocket(code: string, ws: any, playerId?: string) {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return;

  if (!roomSockets.has(cleanCode)) {
    roomSockets.set(cleanCode, new Set());
  }
  roomSockets.get(cleanCode)!.add(ws);
  socketMeta.set(ws, { code: cleanCode, playerId });
}

export function unregisterSocket(ws: any) {
  const meta = socketMeta.get(ws);
  if (!meta) return;

  const set = roomSockets.get(meta.code);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      roomSockets.delete(meta.code);
    }
  }
}

export async function broadcast(code: string, event: string, data: any) {
  const cleanCode = code.toUpperCase().trim();
  const set = roomSockets.get(cleanCode);
  if (!set || set.size === 0) return;

  const payload = JSON.stringify({ event, ...data });
  const deadSockets: any[] = [];

  for (const client of set) {
    try {
      client.send(payload);
    } catch (err) {
      deadSockets.push(client);
    }
  }

  for (const dead of deadSockets) {
    set.delete(dead);
  }
}
