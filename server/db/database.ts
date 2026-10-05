import { Database } from "bun:sqlite";

let db: Database | null = null;

export function getDb(dbPath = "game.db"): Database {
  if (!db) {
    db = new Database(dbPath);
    db.run("PRAGMA journal_mode = WAL;");
    db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        host_name TEXT NOT NULL,
        host_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'LOBBY',
        turn_timer INTEGER NOT NULL DEFAULT 10,
        winner_id TEXT,
        winner_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Migrasi jika tabel rooms sudah ada dari versi sebelumnya
    try { db.run("ALTER TABLE rooms ADD COLUMN host_id TEXT NOT NULL DEFAULT '';"); } catch (e) {}
    try { db.run("ALTER TABLE rooms ADD COLUMN turn_timer INTEGER NOT NULL DEFAULT 10;"); } catch (e) {}
    try { db.run("ALTER TABLE rooms ADD COLUMN board_config TEXT;"); } catch (e) {}
    try { db.run("ALTER TABLE rooms ADD COLUMN winner_id TEXT;"); } catch (e) {}
    try { db.run("ALTER TABLE rooms ADD COLUMN winner_name TEXT;"); } catch (e) {}
    try { db.run("ALTER TABLE rooms ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (e) {}
    try { db.run("ALTER TABLE rooms ADD COLUMN number_range TEXT;"); } catch (e) {}
    db.run(`
      CREATE TABLE IF NOT EXISTS room_players (
        room_code TEXT NOT NULL,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        avatar TEXT,
        current_square INTEGER NOT NULL DEFAULT 1,
        rolls_count INTEGER NOT NULL DEFAULT 0,
        is_winner INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (room_code, id)
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS avatars (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        data BLOB NOT NULL
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
  }
  return db;
}

export function initDatabase(dbPath = "game.db"): Database {
  if (dbPath !== "game.db" && db) {
    try { db.close(); } catch (e) {}
    db = null;
  }
  return getDb(dbPath);
}

export function saveAvatarToDb(id: string, mime: string, buffer: Uint8Array) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO avatars (id, mime, data)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      mime = excluded.mime,
      data = excluded.data
  `);
  stmt.run(id, mime, buffer);
}

export function getAvatarFromDb(id: string): { mime: string; data: Uint8Array } | null {
  const database = getDb();
  const row = database.prepare("SELECT mime, data FROM avatars WHERE id = ?").get(id) as any;
  if (!row) return null;
  return { mime: row.mime, data: new Uint8Array(row.data) };
}

export function saveRoomToDb(room: any) {
  const database = getDb();
  const upsertRoom = database.prepare(`
    INSERT INTO rooms (code, host_name, host_id, status, turn_timer, board_config, number_range, winner_id, winner_name, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(code) DO UPDATE SET
      host_name = excluded.host_name,
      host_id = excluded.host_id,
      status = excluded.status,
      turn_timer = excluded.turn_timer,
      board_config = excluded.board_config,
      number_range = excluded.number_range,
      winner_id = excluded.winner_id,
      winner_name = excluded.winner_name,
      updated_at = CURRENT_TIMESTAMP
  `);
  upsertRoom.run(
    room.code,
    room.players[0]?.name || "Host",
    room.hostId,
    room.status,
    room.turnTimer || 10,
    room.boardConfig ? JSON.stringify(room.boardConfig) : null,
    room.numberRange ? JSON.stringify(room.numberRange) : null,
    room.winner?.id || null,
    room.winner?.name || null
  );

  const upsertPlayer = database.prepare(`
    INSERT INTO room_players (room_code, id, name, color, avatar, current_square, rolls_count, is_winner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_code, id) DO UPDATE SET
      name = excluded.name,
      color = excluded.color,
      avatar = excluded.avatar,
      current_square = excluded.current_square,
      rolls_count = excluded.rolls_count,
      is_winner = excluded.is_winner
  `);

  for (const p of room.players) {
    upsertPlayer.run(
      room.code,
      p.id,
      p.name,
      p.color,
      p.avatar || null,
      p.currentSquare || 1,
      p.rollsCount || 0,
      p.isWinner ? 1 : 0
    );
  }
}

export function loadRoomFromDb(code: string): any | null {
  const database = getDb();
  const cleanCode = code.toUpperCase().trim();
  const roomRow = database.prepare("SELECT * FROM rooms WHERE code = ?").get(cleanCode) as any;
  if (!roomRow) return null;

  const playerRows = database
    .prepare("SELECT * FROM room_players WHERE room_code = ?")
    .all(cleanCode) as any[];

  let parsedBoard = null;
  if (roomRow.board_config) {
    try { parsedBoard = JSON.parse(roomRow.board_config); } catch (e) {}
  }

  let parsedRange = null;
  if (roomRow.number_range) {
    try { parsedRange = JSON.parse(roomRow.number_range); } catch (e) {}
  }

  return {
    code: roomRow.code,
    hostId: roomRow.host_id,
    status: roomRow.status,
    turnTimer: roomRow.turn_timer || 10,
    boardConfig: parsedBoard,
    numberRange: parsedRange,
    winner: roomRow.winner_id
      ? { id: roomRow.winner_id, name: roomRow.winner_name }
      : null,
    players: playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      currentSquare: p.current_square,
      rollsCount: p.rolls_count,
      isWinner: Boolean(p.is_winner),
      currentChallenge: null,
      lastRoll: null,
      lastMove: null,
    })),
  };
}

export function removeRoomFromDb(code: string) {
  const database = getDb();
  const cleanCode = code.toUpperCase().trim();
  database.prepare("DELETE FROM room_players WHERE room_code = ?").run(cleanCode);
  database.prepare("DELETE FROM rooms WHERE code = ?").run(cleanCode);
}

export function recordMatchWin(roomCode: string, winnerName: string, totalRounds: number) {
  const database = getDb();
  const insertMatch = database.prepare(`
    INSERT INTO matches (room_code, winner_name, total_rounds, finished_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  insertMatch.run(roomCode, winnerName, totalRounds);

  const upsertStats = database.prepare(`
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
  const database = getDb();
  return database
    .prepare("SELECT name, games_played, wins FROM player_stats ORDER BY wins DESC, games_played ASC LIMIT ?")
    .all(limit) as Array<{ name: string; games_played: number; wins: number }>;
}
