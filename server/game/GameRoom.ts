import { Challenge, RollResult, calculateRollWithInput, generateChallenge } from "./MathDice";
import { computeNewPosition, MoveResolution } from "./Board";
import { broadcast } from "../realtime";

export interface Player {
  id: string;
  name: string;
  color: string;
  currentSquare: number;
  submittedInput: number | null;
  lastRoll: RollResult | null;
  lastMove: MoveResolution | null;
  isWinner: boolean;
  connected: boolean;
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
  status: "LOBBY" | "PLAYING" | "RESOLVING" | "FINISHED" = "LOBBY";
  players: Player[] = [];
  currentRound = 0;
  currentChallenge: Challenge | null = null;
  roundTimerSeconds = 10;
  timeLeft = 10;
  timerInterval: any = null;
  winner: Player | null = null;
  onGameEnd?: (winnerName: string, totalRounds: number) => void;

  constructor(code: string, hostName: string, hostId: string) {
    this.code = code;
    this.hostId = hostId;
    this.addPlayer(hostName, hostId);
  }

  addPlayer(name: string, id: string): Player {
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      existing.connected = true;
      return existing;
    }

    const color = PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
    const player: Player = {
      id,
      name,
      color,
      currentSquare: 1,
      submittedInput: null,
      lastRoll: null,
      lastMove: null,
      isWinner: false,
      connected: true,
    };
    this.players.push(player);
    return player;
  }

  removePlayer(id: string) {
    this.players = this.players.filter((p) => p.id !== id);
    if (this.hostId === id && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
    if (this.players.length === 0) {
      this.stopTimer();
    } else {
      this.broadcastState("player_left");
    }
  }

  async broadcastState(eventName = "room_updated") {
    await broadcast(this.code, eventName, {
      state: this.getState(),
    });
  }

  startGame(requesterId: string) {
    if (this.hostId !== requesterId) throw new Error("Hanya host yang dapat memulai game");
    if (this.players.length < 1) throw new Error("Minimal butuh 1 pemain untuk bermain");

    this.status = "PLAYING";
    this.currentRound = 1;
    this.winner = null;
    for (const p of this.players) {
      p.currentSquare = 1;
      p.submittedInput = null;
      p.lastRoll = null;
      p.lastMove = null;
      p.isWinner = false;
    }

    this.startNewRound();
  }

  startNewRound() {
    this.status = "PLAYING";
    this.currentChallenge = generateChallenge();
    this.timeLeft = this.roundTimerSeconds;
    for (const p of this.players) {
      p.submittedInput = null;
    }

    this.stopTimer();
    this.broadcastState("round_started");

    this.timerInterval = setInterval(() => {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        this.stopTimer();
        // Auto submit 0 bagi pemain yang belum submit
        for (const p of this.players) {
          if (p.submittedInput === null) {
            p.submittedInput = 0;
          }
        }
        this.resolveRound();
      } else {
        broadcast(this.code, "timer_tick", {
          timeLeft: this.timeLeft,
        });
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  submitPlayerInput(playerId: string, input: number): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || this.status !== "PLAYING" || !this.currentChallenge) return false;

    player.submittedInput = input;

    // Cek apakah semua pemain sudah submit
    const allSubmitted = this.players.every((p) => p.submittedInput !== null);
    if (allSubmitted) {
      this.stopTimer();
      this.resolveRound();
      return true;
    } else {
      this.broadcastState("player_submitted");
      return false;
    }
  }

  resolveRound() {
    if (!this.currentChallenge) return;
    this.status = "RESOLVING";

    for (const player of this.players) {
      const input = player.submittedInput ?? 0;
      const roll = calculateRollWithInput(
        this.currentChallenge.screenNumber,
        this.currentChallenge.op,
        input
      );
      player.lastRoll = roll;

      const move = computeNewPosition(player.currentSquare, roll.steps, roll.direction);
      player.lastMove = move;
      player.currentSquare = move.targetSquare;

      if (move.finished && !this.winner) {
        player.isWinner = true;
        this.winner = player;
        this.status = "FINISHED";
      }
    }

    this.broadcastState("round_resolved");

    if (this.status === "FINISHED" && this.winner) {
      this.stopTimer();
      this.broadcastState("game_finished");
      if (this.onGameEnd) {
        this.onGameEnd(this.winner.name, this.currentRound);
      }
    } else {
      // Jeda 2.5 detik untuk animasi pion di layar
      setTimeout(() => {
        if (this.status === "RESOLVING") {
          this.currentRound += 1;
          this.startNewRound();
        }
      }, 2500);
    }
  }

  getState() {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      currentRound: this.currentRound,
      currentChallenge: this.currentChallenge,
      timeLeft: this.timeLeft,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        currentSquare: p.currentSquare,
        hasSubmitted: p.submittedInput !== null,
        lastRoll: p.lastRoll,
        lastMove: p.lastMove,
        isWinner: p.isWinner,
      })),
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
    };
  }
}
