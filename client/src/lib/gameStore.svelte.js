import { initRealtime, disconnectRealtime } from './realtime';
import { audio } from './audio';

export class GameStore {
  playerName = $state(localStorage.getItem('ut_player_name') || '');
  playerAvatar = $state(localStorage.getItem('ut_player_avatar') || '');
  playerId = $state(localStorage.getItem('ut_player_id') || '');
  roomCode = $state(localStorage.getItem('ut_room_code') || '');
  roomState = $state(null);
  errorMessage = $state(null);
  loading = $state(false);
  rolling = $state(false);
  leaderboard = $state([]);
  publicRooms = $state([]);

  // Posisi pion animasi step-by-step: playerId -> displaySquare
  pawnPositions = $state({});

  // Hasil lemparan terakhir yang baru saja di-roll
  latestRollInfo = $state(null);

  isHost = $derived(
    Boolean(this.roomState && this.playerId && this.roomState.hostId === this.playerId)
  );

  me = $derived(
    this.roomState?.players?.find((p) => p.id === this.playerId) || null
  );

  myChallenge = $derived(
    this.me?.currentChallenge || null
  );

  async init() {
    this.fetchPublicRooms();
    this.fetchLeaderboard();

    if (this.roomCode && this.playerId) {
      await this.refreshRoom();
    }
  }

  setError(msg) {
    this.errorMessage = msg;
    setTimeout(() => {
      if (this.errorMessage === msg) this.errorMessage = null;
    }, 4500);
  }

  setAvatar(dataUrl) {
    this.playerAvatar = dataUrl;
    localStorage.setItem('ut_player_avatar', dataUrl);
  }

  syncInitialPawnPositions(players = []) {
    players.forEach((p) => {
      if (this.pawnPositions[p.id] === undefined) {
        this.pawnPositions[p.id] = p.currentSquare || 1;
      }
    });
  }

  // Animasi pion bergerak dari block ke block (hop by hop)
  async animatePawnMovement(playerId, move, roll) {
    if (!move) return;
    const path = move.path || [];

    // Step-by-step hopping
    for (let i = 0; i < path.length; i++) {
      await new Promise((r) => setTimeout(r, 180));
      this.pawnPositions[playerId] = path[i];
      audio.playStep(i);
    }

    // Tangga atau Ular
    if (move.isLadder) {
      await new Promise((r) => setTimeout(r, 260));
      audio.playLadder();
      this.pawnPositions[playerId] = move.targetSquare;
    } else if (move.isSnake) {
      await new Promise((r) => setTimeout(r, 260));
      audio.playSnake();
      this.pawnPositions[playerId] = move.targetSquare;
    } else {
      this.pawnPositions[playerId] = move.targetSquare;
    }

    if (move.finished) {
      audio.playWin();
    }
  }

  async fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        this.leaderboard = await res.json();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async fetchPublicRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        this.publicRooms = await res.json();
      }
    } catch (e) {
      console.error(e);
    }
  }

  setupRealtime(code) {
    initRealtime(code, async (event, data) => {
      if (event === 'player_moved') {
        const { playerId, move, roll, state } = data;
        if (state) {
          this.roomState = state;
        }
        if (move) {
          await this.animatePawnMovement(playerId, move, roll);
        }
      } else if (event === 'game_finished') {
        if (data.state) this.roomState = data.state;
        if (data.lastMove?.move) {
          await this.animatePawnMovement(data.lastMove.playerId, data.lastMove.move, data.lastMove.roll);
        }
        audio.playWin();
      } else if (data?.state) {
        this.roomState = data.state;
        this.syncInitialPawnPositions(data.state.players || []);
      }
    });
  }

  async createRoom(name) {
    const cleanName = (name || this.playerName || 'Pemain').trim();
    this.loading = true;
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          avatar: this.playerAvatar || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat room');

      this.playerName = cleanName;
      this.playerId = data.playerId;
      this.roomCode = data.roomCode;
      this.roomState = data.state;
      this.syncInitialPawnPositions(data.state.players || []);

      localStorage.setItem('ut_player_name', this.playerName);
      localStorage.setItem('ut_player_id', this.playerId);
      localStorage.setItem('ut_room_code', this.roomCode);

      this.setupRealtime(data.roomCode);
    } catch (err) {
      this.setError(err.message);
    } finally {
      this.loading = false;
    }
  }

  async joinRoom(code, name) {
    const cleanCode = (code || '').toUpperCase().trim();
    const cleanName = (name || this.playerName || 'Pemain').trim();
    if (!cleanCode) {
      this.setError('Masukkan kode room');
      return;
    }

    this.loading = true;
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          avatar: this.playerAvatar || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal masuk room');

      this.playerName = cleanName;
      this.playerId = data.playerId;
      this.roomCode = data.roomCode;
      this.roomState = data.state;
      this.syncInitialPawnPositions(data.state.players || []);

      localStorage.setItem('ut_player_name', this.playerName);
      localStorage.setItem('ut_player_id', this.playerId);
      localStorage.setItem('ut_room_code', this.roomCode);

      this.setupRealtime(data.roomCode);
    } catch (err) {
      this.setError(err.message);
    } finally {
      this.loading = false;
    }
  }

  async refreshRoom() {
    if (!this.roomCode) return;
    try {
      const res = await fetch(`/api/rooms/${this.roomCode}`);
      if (!res.ok) {
        this.leaveRoom(false);
        return;
      }
      const data = await res.json();
      this.roomState = data.state;
      this.syncInitialPawnPositions(data.state.players || []);
      this.setupRealtime(this.roomCode);
    } catch (err) {
      console.error(err);
    }
  }

  async startGame() {
    if (!this.roomCode || !this.isHost) return;
    try {
      const res = await fetch(`/api/rooms/${this.roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai game');
      this.roomState = data.state;
      this.syncInitialPawnPositions(data.state.players || []);
      // Reset positions to 1
      for (const p of data.state.players || []) {
        this.pawnPositions[p.id] = 1;
      }
    } catch (err) {
      this.setError(err.message);
    }
  }

  async submitRoll(inputNumber) {
    if (!this.roomCode || !this.playerId || this.rolling) return;
    this.rolling = true;
    audio.playRoll();

    try {
      const res = await fetch(`/api/rooms/${this.roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, input: inputNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal submit angka');

      this.latestRollInfo = {
        roll: data.roll,
        move: data.move,
      };

      if (data.state) {
        this.roomState = data.state;
      }

      // Animasi pion saya sendiri langsung berjalan
      if (data.move) {
        await this.animatePawnMovement(this.playerId, data.move, data.roll);
      }
    } catch (err) {
      this.setError(err.message);
    } finally {
      this.rolling = false;
    }
  }

  async leaveRoom(callServer = true) {
    if (callServer && this.roomCode && this.playerId) {
      try {
        await fetch(`/api/rooms/${this.roomCode}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: this.playerId }),
        });
      } catch (e) {
        // ignore
      }
    }
    disconnectRealtime();
    this.roomCode = '';
    this.roomState = null;
    this.latestRollInfo = null;
    this.pawnPositions = {};
    localStorage.removeItem('ut_room_code');
    this.fetchPublicRooms();
  }
}

export const game = new GameStore();
