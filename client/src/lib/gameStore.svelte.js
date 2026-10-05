import { initRealtime, disconnectRealtime } from './realtime';

export class GameStore {
  playerName = $state(localStorage.getItem('ut_player_name') || '');
  playerId = $state(localStorage.getItem('ut_player_id') || '');
  roomCode = $state(localStorage.getItem('ut_room_code') || '');
  roomState = $state(null);
  timeLeft = $state(10);
  errorMessage = $state(null);
  loading = $state(false);
  leaderboard = $state([]);
  publicRooms = $state([]);

  isHost = $derived(
    Boolean(this.roomState && this.playerId && this.roomState.hostId === this.playerId)
  );

  me = $derived(
    this.roomState?.players?.find((p) => p.id === this.playerId) || null
  );

  hasSubmitted = $derived(
    Boolean(this.me?.hasSubmitted)
  );

  async init() {
    this.fetchPublicRooms();
    this.fetchLeaderboard();

    // Reconnect ke room jika ada state di localStorage
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
    initRealtime(code, (event, data) => {
      if (data?.state) {
        this.roomState = data.state;
        if (typeof data.state.timeLeft === 'number') {
          this.timeLeft = data.state.timeLeft;
        }
      } else if (event === 'timer_tick' && typeof data?.timeLeft === 'number') {
        this.timeLeft = data.timeLeft;
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
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat room');

      this.playerName = cleanName;
      this.playerId = data.playerId;
      this.roomCode = data.roomCode;
      this.roomState = data.state;

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
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal masuk room');

      this.playerName = cleanName;
      this.playerId = data.playerId;
      this.roomCode = data.roomCode;
      this.roomState = data.state;

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
    } catch (err) {
      this.setError(err.message);
    }
  }

  async submitInput(num) {
    if (!this.roomCode || !this.playerId) return;
    try {
      const res = await fetch(`/api/rooms/${this.roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, input: num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal submit angka');
      if (data.state) this.roomState = data.state;
    } catch (err) {
      this.setError(err.message);
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
    localStorage.removeItem('ut_room_code');
    this.fetchPublicRooms();
  }
}

export const game = new GameStore();
