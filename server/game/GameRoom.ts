import { Challenge, RollResult, calculateRollWithInput, generateChallenge } from "./MathDice";
import { computeNewPosition, MoveResolution } from "./Board";
import { broadcast } from "../realtime";
import { saveRoomToDb } from "../db/database";

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar?: string | null;
  currentSquare: number;
  currentChallenge: Challenge | null;
  lastRoll: RollResult | null;
  lastMove: MoveResolution | null;
  isWinner: boolean;
  rollsCount: number;
}

const PLAYER_COLORS = [
  "#EF4444", // Merah
  "#3B82F6", // Biru
  "#10B981", // Hijau
  "#F59E0B", // Kuning/Oranye
  "#8B5CF6", // Ungu
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Oranye tua
];

export class GameRoom {
  code: string;
  hostId: string;
  status: "LOBBY" | "PLAYING" | "FINISHED" = "LOBBY";
  players: Player[] = [];
  winner: Player | null = null;
  onGameEnd?: (winnerName: string, rollsCount: number) => void;

  constructor(code: string, hostName: string, hostId: string, hostAvatar?: string | null) {
    this.code = code;
    this.hostId = hostId;
    this.addPlayer(hostName, hostId, hostAvatar);
  }

  addPlayer(name: string, id: string, avatar?: string | null): Player {
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      if (avatar) existing.avatar = avatar;
      try { saveRoomToDb(this); } catch (e) {}
      return existing;
    }

    const color = PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
    const player: Player = {
      id,
      name,
      color,
      avatar: avatar || null,
      currentSquare: 1,
      currentChallenge: null,
      lastRoll: null,
      lastMove: null,
      isWinner: false,
      rollsCount: 0,
    };
    this.players.push(player);
    try { saveRoomToDb(this); } catch (e) {}
    return player;
  }

  removePlayer(id: string) {
    this.players = this.players.filter((p) => p.id !== id);
    if (this.hostId === id && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
    try { saveRoomToDb(this); } catch (e) {}
    if (this.players.length > 0) {
      this.broadcastState("player_left");
    }
  }

  async broadcastState(eventName = "room_updated", extra: any = {}) {
    await broadcast(this.code, eventName, {
      state: this.getState(),
      ...extra,
    });
  }

  startGame(requesterId: string) {
    if (this.hostId !== requesterId) throw new Error("Hanya host yang dapat memulai game");
    if (this.players.length < 1) throw new Error("Minimal butuh 1 pemain untuk bermain");

    this.status = "PLAYING";
    this.winner = null;
    for (const p of this.players) {
      p.currentSquare = 1;
      p.currentChallenge = null;
      p.lastRoll = null;
      p.lastMove = null;
      p.isWinner = false;
      p.rollsCount = 0;
    }

    try { saveRoomToDb(this); } catch (e) {}
    this.broadcastState("game_started");
  }

  spinRoll(playerId: string) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Pemain tidak ditemukan");
    if (this.status !== "PLAYING") throw new Error("Game belum dimulai atau sudah selesai");

    player.currentChallenge = generateChallenge();
    return { challenge: player.currentChallenge };
  }

  submitPlayerRoll(playerId: string, input: number) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Pemain tidak ditemukan");
    if (this.status !== "PLAYING") throw new Error("Game belum dimulai atau sudah selesai");

    if (!player.currentChallenge) {
      player.currentChallenge = generateChallenge();
    }

    const roll = calculateRollWithInput(
      player.currentChallenge.screenNumber,
      player.currentChallenge.op,
      input
    );
    const move = computeNewPosition(player.currentSquare, roll.steps, roll.direction);

    player.lastRoll = roll;
    player.lastMove = move;
    player.currentSquare = move.targetSquare;
    player.rollsCount += 1;
    player.currentChallenge = null;

    try { saveRoomToDb(this); } catch (e) {}

    if (move.finished && !this.winner) {
      player.isWinner = true;
      this.winner = player;
      this.status = "FINISHED";

      this.broadcastState("game_finished", {
        winner: { id: player.id, name: player.name, avatarUrl: player.avatar ? `/api/avatars/${player.id}` : null },
        lastMove: { playerId: player.id, move, roll },
      });

      if (this.onGameEnd) {
        this.onGameEnd(player.name, player.rollsCount);
      }

      return { roll, move, finished: true };
    }

    this.broadcastState("player_moved", {
      playerId: player.id,
      playerName: player.name,
      roll,
      move,
    });

    return { roll, move, finished: false };
  }

  getState() {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        avatarUrl: p.avatar ? `/api/avatars/${p.id}` : null,
        currentSquare: p.currentSquare,
        currentChallenge: p.currentChallenge,
        lastRoll: p.lastRoll,
        lastMove: p.lastMove,
        isWinner: p.isWinner,
        rollsCount: p.rollsCount,
      })),
      winner: this.winner
        ? { id: this.winner.id, name: this.winner.name, avatarUrl: this.winner.avatar ? `/api/avatars/${this.winner.id}` : null }
        : null,
    };
  }
}
