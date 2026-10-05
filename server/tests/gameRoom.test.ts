import { describe, expect, it } from "bun:test";
import { GameRoom } from "../game/GameRoom";

describe("GameRoom Simultaneous Loop", () => {
  it("allows players to join and starts game", () => {
    const room = new GameRoom("ABCD", "Player1", "ws1");
    expect(room.players.length).toBe(1);
    expect(room.hostId).toBe("ws1");

    room.addPlayer("Player2", "ws2");
    expect(room.players.length).toBe(2);

    room.startGame("ws1");
    expect(room.status).toBe("PLAYING");
    expect(room.players[0].currentChallenge).not.toBeNull();
  });

  it("calculates player roll and animates path", () => {
    const room = new GameRoom("TEST", "Alice", "p1");
    room.addPlayer("Bob", "p2");
    room.startGame("p1");

    // Force known challenge for determinism
    const alice = room.players.find((p) => p.id === "p1")!;
    alice.currentChallenge = { screenNumber: 10, op: "+" };

    // Alice inputs 5 -> 10 + 5 = 15 -> steps: ((15-1)%6)+1 = 3 (FORWARD) -> square 1 + 3 = 4 -> Ladder to 14
    const result = room.submitPlayerRoll("p1", 5);

    expect(result.roll.raw).toBe(15);
    expect(result.roll.steps).toBe(3);
    expect(result.move.path).toEqual([2, 3, 4]);
    expect(result.move.isLadder).toBe(true);
    expect(result.move.targetSquare).toBe(14);
    expect(alice.currentSquare).toBe(14);
  });
});
