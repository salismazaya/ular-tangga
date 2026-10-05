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
    expect(room.currentRound).toBe(1);
    expect(room.currentChallenge).not.toBeNull();
  });

  it("resolves round simultaneously when all players submit input", () => {
    const room = new GameRoom("TEST", "Alice", "p1");
    room.addPlayer("Bob", "p2");
    room.startGame("p1");

    // Force known challenge for determinism
    room.currentChallenge = { screenNumber: 10, op: "+" };

    // Alice inputs 5 -> 10 + 5 = 15 -> steps: ((15-1)%6)+1 = 3 (FORWARD) -> square 1 + 3 = 4 -> Ladder to 14
    // Bob inputs -10 -> 10 + (-10) = 0 -> STAY -> square 1
    room.submitPlayerInput("p1", 5);
    const roundResolved = room.submitPlayerInput("p2", -10);

    expect(roundResolved).toBe(true);

    const alice = room.players.find((p) => p.id === "p1");
    const bob = room.players.find((p) => p.id === "p2");

    expect(alice?.currentSquare).toBe(14); // via ladder 4->14
    expect(bob?.currentSquare).toBe(1); // STAY
  });
});
