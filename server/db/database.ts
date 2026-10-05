import { Database } from "bun:sqlite";

let db: Database;

export function initDatabase(dbPath = "game.db"): Database {
  db = new Database(dbPath);
  db.run("PRAGMA journal_mode = WAL;");
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      host_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'LOBBY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      winner_name TEXT,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS player_stats (
      name TEXT PRIMARY KEY,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

export function recordMatchWin(roomCode: string, winnerName: string, totalRounds: number) {
  const insertMatch = db.prepare(`
    INSERT INTO matches (room_code, winner_name, total_rounds, finished_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  insertMatch.run(roomCode, winnerName, totalRounds);

  const upsertStats = db.prepare(`
    INSERT INTO player_stats (name, games_played, wins, last_played_at)
    VALUES (?, 1, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      games_played = games_played + 1,
      wins = wins + 1,
      last_played_at = CURRENT_TIMESTAMP
  `);
  upsertStats.run(winnerName);
}

export function getLeaderboard(limit = 10): Array<{ name: string; games_played: number; wins: number }> {
  return db
    .prepare("SELECT name, games_played, wins FROM player_stats ORDER BY wins DESC, games_played ASC LIMIT ?")
    .all(limit) as Array<{ name: string; games_played: number; wins: number }>;
}
