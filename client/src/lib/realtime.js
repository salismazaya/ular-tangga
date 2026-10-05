let activeWs = null;
let activeCode = null;
let pingInterval = null;
let reconnectTimer = null;
let currentHandlers = {};

export function initRealtime(code, handlers = {}, playerId = '') {
  if (typeof window === 'undefined' || !code) return null;

  const cleanCode = String(code).toUpperCase().trim();
  currentHandlers = handlers;

  // Jika sudah terhubung ke room yang sama dan socket OPEN, cukup update handler
  if (activeWs && activeWs.readyState === WebSocket.OPEN && activeCode === cleanCode) {
    return activeWs;
  }

  disconnectRealtime();
  activeCode = cleanCode;

  function connect() {
    if (!activeCode || activeCode !== cleanCode) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const pid = playerId || localStorage.getItem('ut_player_id') || '';
      const wsUrl = `${protocol}//${window.location.host}/ws?code=${encodeURIComponent(cleanCode)}&playerId=${encodeURIComponent(pid)}`;

      const ws = new WebSocket(wsUrl);
      activeWs = ws;

      ws.onopen = () => {
        // Mulai ping interval tiap 15 detik agar koneksi tetap hidup
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return;

          const eventName = data.event;
          const h = currentHandlers;
          if (!h) return;

          if (eventName === 'room_updated' && typeof h.onRoomUpdated === 'function') {
            h.onRoomUpdated(data);
          } else if (eventName === 'player_joined') {
            if (typeof h.onPlayerJoined === 'function') h.onPlayerJoined(data);
            else if (typeof h.onRoomUpdated === 'function') h.onRoomUpdated(data);
          } else if (eventName === 'game_started' && typeof h.onGameStarted === 'function') {
            h.onGameStarted(data);
          } else if (eventName === 'player_moved' && typeof h.onPlayerMoved === 'function') {
            h.onPlayerMoved(data);
          } else if (eventName === 'game_finished' && typeof h.onGameFinished === 'function') {
            h.onGameFinished(data);
          } else if (eventName === 'player_left') {
            if (typeof h.onPlayerLeft === 'function') h.onPlayerLeft(data);
            else if (typeof h.onRoomUpdated === 'function') h.onRoomUpdated(data);
          }
        } catch (err) {
          console.error('[WS PARSE ERROR]', err);
        }
      };

      ws.onclose = () => {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }

        // Auto-reconnect jika masih di room yang sama
        if (activeCode === cleanCode) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        // onclose akan terpanggil otomatis untuk penanganan reconnect
      };
    } catch (err) {
      console.error('[WS CONNECT ERROR]', err);
    }
  }

  connect();
  return activeWs;
}

export function disconnectRealtime() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (activeWs) {
    activeWs.onclose = null;
    try {
      activeWs.close();
    } catch (e) {}
    activeWs = null;
  }
  activeCode = null;
  currentHandlers = {};
}
