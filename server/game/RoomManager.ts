import { GameRoom } from "./GameRoom";
import { saveRoomToDb, loadRoomFromDb, removeRoomFromDb } from "../db/database";

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  generateCode(): string {
    // Tanpa O, 0, I, 1, L (mencegah typo & salah baca sesuai request bos)
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostName: string, hostId: string, hostAvatar?: string | null, turnTimer = 10): GameRoom {
    const code = this.generateCode();
    const room = new GameRoom(code, hostName, hostId, hostAvatar, turnTimer);
    this.rooms.set(code, room);
    saveRoomToDb(room);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    if (!code) return undefined;
    const cleanCode = code.toUpperCase().trim();
    let room = this.rooms.get(cleanCode);

    if (!room) {
      // Coba pulihkan dari SQLite jika server restart / memory kosong
      const dbRoom = loadRoomFromDb(cleanCode);
      if (dbRoom) {
        room = new GameRoom(
          dbRoom.code,
          dbRoom.players[0]?.name || "Host",
          dbRoom.hostId,
          dbRoom.players[0]?.avatar,
          dbRoom.turnTimer || 10,
          dbRoom.boardConfig || undefined
        );
        room.status = dbRoom.status;
        room.winner = dbRoom.winner;
        room.players = dbRoom.players;
        this.rooms.set(cleanCode, room);
      }
    }

    return room;
  }

  persistRoom(room: GameRoom) {
    saveRoomToDb(room);
  }

  removeRoom(code: string) {
    const cleanCode = code.toUpperCase().trim();
    const room = this.getRoom(cleanCode);
    if (room) {
      this.rooms.delete(cleanCode);
      removeRoomFromDb(cleanCode);
    }
  }

  listPublicRooms(): Array<{ code: string; playerCount: number; status: string; hostName: string }> {
    const list: Array<{ code: string; playerCount: number; status: string; hostName: string }> = [];
    for (const [code, r] of this.rooms.entries()) {
      list.push({
        code,
        playerCount: r.players.length,
        status: r.status,
        hostName: r.players[0]?.name || "Anonim",
      });
    }
    return list;
  }
}

export const roomManager = new RoomManager();
