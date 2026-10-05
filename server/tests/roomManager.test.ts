import { describe, expect, it } from "bun:test";
import { RoomManager } from "../game/RoomManager";

describe("RoomManager", () => {
  it("generates 4-character code without O, 0, I, 1, or L", () => {
    const manager = new RoomManager();
    const forbidden = ["O", "o", "0", "I", "i", "1", "L", "l"];

    for (let i = 0; i < 100; i++) {
      const code = manager.generateCode();
      expect(code.length).toBe(4);
      for (const char of forbidden) {
        expect(code.includes(char)).toBe(false);
      }
    }
  });

  it("creates and retrieves rooms case-insensitively", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("Host1", "ws1");
    expect(manager.getRoom(room.code)).toBe(room);
    expect(manager.getRoom(room.code.toLowerCase())).toBe(room);
  });
});
