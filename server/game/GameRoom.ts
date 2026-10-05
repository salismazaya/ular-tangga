import { Challenge, RollResult, calculateRollWithInput, generateChallenge } from "./MathDice";
import { computeNewPosition, MoveResolution, BoardConfig, generateRandomBoard } from "./Board";
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
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
  "#06B6D4", "#F97316", "#14B8A6", "#84CC16", "#6366F1", "#D946EF",
  "#E11D48", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777",
  "#0891B2", "#EA580C", "#0D9488", "#65A30D", "#4F46E5", "#C026D3",
  "#DC2626", "#1D4ED8", "#047857", "#B45309", "#6D28D9", "#BE185D",
  "#0E7490", "#C2410C", "#0F766E", "#4D7C0F", "#4338CA", "#A21CAF",
];

export class GameRoom {
  code: string;
  hostId: string;
  status: "LOBBY" | "PLAYING" | "FINISHED" = "LOBBY";
  turnTimer: number = 10;
  boardConfig: BoardConfig;
  players: Player[] = [];
  winner: Player | null = null;
  onGameEnd?: (winnerName: string, rollsCount: number) => void;

  constructor(code: string, hostName: string, hostId: string, hostAvatar?: string | null, turnTimer = 10, boardConfig?: BoardConfig) {
    this.code = code;
    this.hostId = hostId;
    this.turnTimer = [10, 20, 30].includes(turnTimer) ? turnTimer : 10;
    this.boardConfig = boardConfig || generateRandomBoard();
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

  async removePlayer(id: string) {
    this.players = this.players.filter((p) => p.id !== id);
    if (this.hostId === id && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
    try { saveRoomToDb(this); } catch (e) {}
    if (this.players.length > 0) {
      await this.broadcastState("player_left");
    }
  }

  async broadcastState(eventName = "room_updated", extra: any = {}) {
    await broadcast(this.code, eventName, {
      state: this.getState(),
      ...extra,
    });
  }

  async startGame(requesterId: string) {
    if (this.hostId !== requesterId) throw new Error("Hanya host yang dapat memulai game");
    if (this.players.length < 1) throw new Error("Minimal butuh 1 pemain untuk bermain");

    this.status = "PLAYING";
    this.winner = null;
    this.boardConfig = generateRandomBoard(); // Acak posisi tangga dan ular setiap match!
    for (const p of this.players) {
      p.currentSquare = 1;
      p.currentChallenge = null;
      p.lastRoll = null;
      p.lastMove = null;
      p.isWinner = false;
      p.rollsCount = 0;
    }

    try { saveRoomToDb(this); } catch (e) {}
    await this.broadcastState("game_started");
  }

  spinRoll(playerId: string) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Pemain tidak ditemukan");
    if (this.status !== "PLAYING") throw new Error("Game belum dimulai atau sudah selesai");

    player.currentChallenge = generateChallenge();
    return { challenge: player.currentChallenge };
  }

  async submitPlayerRoll(playerId: string, input: number) {
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
    const move = computeNewPosition(player.currentSquare, roll.steps, roll.direction, this.boardConfig);

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

      await this.broadcastState("game_finished", {
        winner: { id: player.id, name: player.name, avatarUrl: player.avatar ? `/api/avatars/${player.id}` : null },
        lastMove: { playerId: player.id, move, roll },
      });

      if (this.onGameEnd) {
        this.onGameEnd(player.name, player.rollsCount);
      }

      return { roll, move, finished: true };
    }

    await this.broadcastState("player_moved", {
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
      turnTimer: this.turnTimer,
      boardConfig: this.boardConfig,
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
