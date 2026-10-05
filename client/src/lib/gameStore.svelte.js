import { initRealtime, disconnectRealtime } from './realtime';
import { audio } from './audio';

export class GameStore {
  playerName = $state(localStorage.getItem('ut_player_name') || '');
  playerAvatar = $state(localStorage.getItem('ut_player_avatar') || null);
  playerId = $state(localStorage.getItem('ut_player_id') || '');
  roomCode = $state(localStorage.getItem('ut_room_code') || '');

  roomState = $state(null);
  loading = $state(false);
  errorMessage = $state(null);

  // Status giliran lokal pemain saat ini
  turnState = $state('IDLE'); // 'IDLE' | 'SPINNING' | 'WAITING_INPUT' | 'MOVING'
  currentChallenge = $state(null);
  timerSeconds = $state(10);
  latestRollInfo = $state(null);

  // Koordinat petak pion tiap pemain untuk animasi hop
  pawnPositions = $state({});

  publicRooms = $state([]);
  leaderboard = $state([]);

  timerInterval = null;

  async init() {
    this.fetchPublicRooms();
    this.fetchLeaderboard();

    // Periksa apakah ada parameter ?room= di URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        this.roomCode = roomParam.toUpperCase().trim();
        localStorage.setItem('ut_room_code', this.roomCode);
      }
    }

    if (this.roomCode) {
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
      this.pawnPositions[p.id] = p.currentSquare || 1;
    });
  }

  // Animasi pion bergerak dari block ke block (hop by hop)
  async animatePawnMovement(playerId, move, roll) {
    if (!move) return;
    const path = move.path || [];

    // Step-by-step hopping
    for (let i = 0; i < path.length; i++) {
      await new Promise((r) => setTimeout(r, 190));
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
  }

  async fetchPublicRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        this.publicRooms = data.rooms || [];
      }
    } catch (e) {
      console.error(e);
    }
  }

  async fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        this.leaderboard = data.leaderboard || [];
      }
    } catch (e) {
      console.error(e);
    }
  }

  setupRealtime(code) {
    initRealtime(code, {
      onRoomUpdated: (data) => {
        if (data?.state) {
          this.roomState = data.state;
          this.syncInitialPawnPositions(data.state.players || []);
        }
      },
      onPlayerJoined: (data) => {
        if (data?.state) {
          this.roomState = data.state;
          this.syncInitialPawnPositions(data.state.players || []);
        }
      },
      onGameStarted: (data) => {
        if (data?.state) {
          this.roomState = data.state;
          this.syncInitialPawnPositions(data.state.players || []);
        }
        this.turnState = 'IDLE';
        this.currentChallenge = null;
        audio.startBgm();
      },
      onPlayerMoved: async (data) => {
        this.latestRollInfo = {
          playerName: data.playerName,
          roll: data.roll,
          move: data.move,
        };

        // Jalankan animasi per-kotak
        await this.animatePawnMovement(data.playerId, data.move, data.roll);

        if (data?.state) {
          this.roomState = data.state;
        }
      },
      onGameFinished: async (data) => {
        if (data?.lastMove) {
          await this.animatePawnMovement(data.lastMove.playerId, data.lastMove.move, data.lastMove.roll);
        }
        if (data?.state) {
          this.roomState = data.state;
        }
        audio.playWin();
        this.fetchLeaderboard();
      },
      onPlayerLeft: (data) => {
        if (data?.state) {
          this.roomState = data.state;
        }
      },
    });
  }

  async createRoom(name, turnTimer = 10) {
    const cleanName = (name || this.playerName || 'Host').trim();
    const cleanTimer = [10, 20, 30].includes(Number(turnTimer)) ? Number(turnTimer) : 10;
    this.loading = true;
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          turnTimer: cleanTimer,
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

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `?room=${this.roomCode}`);
      }

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
          playerId: this.playerId || null,
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

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `?room=${this.roomCode}`);
      }

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
      if (res.status === 404) {
        // Room benar-benar sudah tidak ada
        this.leaveRoom(false);
        return;
      }
      if (!res.ok) {
        console.warn('Gagal refresh room:', res.statusText);
        return;
      }

      const data = await res.json();
      this.roomState = data.state;
      this.syncInitialPawnPositions(data.state.players || []);

      // Cek apakah player id lokal masih ada di room
      const exists = (data.state.players || []).some((p) => p.id === this.playerId);
      if (!exists && this.playerName && data.state.status === 'LOBBY') {
        // Otomatis gabung ulang jika belum ada di room lobby
        await this.joinRoom(this.roomCode, this.playerName);
      } else {
        this.setupRealtime(this.roomCode);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `?room=${this.roomCode}`);
        }
      }
    } catch (err) {
      console.error('Error saat refreshRoom:', err);
    }
  }

  async startGame() {
    if (!this.roomCode || !this.playerId) return;
    this.loading = true;
    try {
      const res = await fetch(`/api/rooms/${this.roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai game');
      this.roomState = data.state;
      this.turnState = 'IDLE';
      this.currentChallenge = null;
      audio.startBgm();
    } catch (err) {
      this.setError(err.message);
    } finally {
      this.loading = false;
    }
  }

  // Dipanggil saat pemain klik tombol "Roll Dadu"
  async startRoll() {
    if (this.turnState !== 'IDLE' || !this.roomCode || !this.playerId) return;

    this.turnState = 'SPINNING';
    try {
      const res = await fetch(`/api/rooms/${this.roomCode}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengocok dadu');

      this.currentChallenge = data.challenge;
      this.turnState = 'WAITING_INPUT';
      this.timerSeconds = this.roomState?.turnTimer || 10;

      audio.playRoll();

      // Mulai timer mundur 10 detik
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (this.turnState !== 'WAITING_INPUT') {
          clearInterval(this.timerInterval);
          return;
        }

        this.timerSeconds -= 1;
        if (this.timerSeconds <= 0) {
          clearInterval(this.timerInterval);
          // Waktu habis! Otomatis submit input saat ini (atau 0)
          this.submitRoll(0);
        }
      }, 1000);
    } catch (err) {
      this.setError(err.message);
      this.turnState = 'IDLE';
    }
  }

  // Submit hasil input angka dadu
  async submitRoll(inputVal) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.turnState === 'MOVING') return;
    this.turnState = 'MOVING';

    try {
      const parsed = parseInt(String(inputVal || 0), 10) || 0;
      const res = await fetch(`/api/rooms/${this.roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          input: parsed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim dadu');

      this.latestRollInfo = {
        playerName: this.me?.name || 'Kamu',
        roll: data.roll,
        move: data.move,
      };

      // Jalankan animasi per-kotak pion kita sendiri
      await this.animatePawnMovement(this.playerId, data.move, data.roll);

      if (data.state) {
        this.roomState = data.state;
      }
    } catch (err) {
      this.setError(err.message);
    } finally {
      this.currentChallenge = null;
      this.turnState = 'IDLE';
    }
  }

  async leaveRoom(callServer = true) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (callServer && this.roomCode && this.playerId) {
      fetch(`/api/rooms/${this.roomCode}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId }),
      }).catch(() => {});
    }

    disconnectRealtime();
    audio.stopBgm();

    this.roomCode = '';
    this.roomState = null;
    this.turnState = 'IDLE';
    this.currentChallenge = null;
    this.pawnPositions = {};
    this.latestRollInfo = null;

    localStorage.removeItem('ut_room_code');

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }

    this.fetchPublicRooms();
  }

  get me() {
    if (!this.roomState || !this.roomState.players) return null;
    return this.roomState.players.find((p) => p.id === this.playerId) || null;
  }

  get isHost() {
    return this.roomState?.hostId === this.playerId;
  }

  get isPlaying() {
    return this.roomState?.status === 'PLAYING';
  }

  get isFinished() {
    return this.roomState?.status === 'FINISHED';
  }
}

export const game = new GameStore();
