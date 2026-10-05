import { describe, expect, it } from "bun:test";
import { initDatabase, recordMatchWin, getLeaderboard } from "../db/database";

describe("Database Layer", () => {
  it("initializes tables and records win correctly", () => {
    initDatabase(":memory:");
    recordMatchWin("ROOM1", "Salis", 12);
    recordMatchWin("ROOM2", "Salis", 8);
    recordMatchWin("ROOM3", "Budi", 15);

    const leaders = getLeaderboard();
    expect(leaders.length).toBeGreaterThanOrEqual(2);
    expect(leaders[0].name).toBe("Salis");
    expect(leaders[0].wins).toBe(2);
    expect(leaders[0].games_played).toBe(2);
  });
});
