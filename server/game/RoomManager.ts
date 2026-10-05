import { GameRoom } from "./GameRoom";

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

  createRoom(hostName: string, hostId: string, hostAvatar?: string | null): GameRoom {
    const code = this.generateCode();
    const room = new GameRoom(code, hostName, hostId, hostAvatar);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    if (!code) return undefined;
    return this.rooms.get(code.toUpperCase().trim());
  }

  removeRoom(code: string) {
    this.rooms.delete(code.toUpperCase().trim());
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
