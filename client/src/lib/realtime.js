import Pusher from 'pusher-js';

let pusherInstance = null;
let currentChannel = null;
let currentCode = null;

export async function fetchPusherConfig() {
  try {
    const res = await fetch('/api/pusher-config');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[REALTIME] Gagal memuat config Pusher:', err);
    return null;
  }
}

export async function initRealtime(code, handlers = {}) {
  if (typeof window === 'undefined' || !code) return null;

  const cfg = await fetchPusherConfig();
  if (!cfg?.key) {
    console.warn('[REALTIME] Pusher key tidak tersedia.');
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher(cfg.key, {
      cluster: cfg.cluster || 'ap1',
      forceTLS: true,
    });
  }

  const cleanCode = String(code).toUpperCase().trim();
  const channelName = `room-${cleanCode}`;

  if (currentChannel && currentCode !== cleanCode) {
    try {
      pusherInstance.unsubscribe(`room-${currentCode}`);
    } catch (e) {}
    currentChannel = null;
  }

  if (!currentChannel || currentCode !== cleanCode) {
    currentCode = cleanCode;
    currentChannel = pusherInstance.subscribe(channelName);
  }

  // Lepas binding lama agar tidak duplikat listener
  try {
    currentChannel.unbind_all();
  } catch (e) {}

  const eventMap = {
    room_updated: handlers.onRoomUpdated,
    player_joined: handlers.onPlayerJoined || handlers.onRoomUpdated,
    game_started: handlers.onGameStarted,
    player_moved: handlers.onPlayerMoved,
    game_finished: handlers.onGameFinished,
    player_left: handlers.onPlayerLeft || handlers.onRoomUpdated,
  };

  Object.entries(eventMap).forEach(([eventName, handler]) => {
    if (typeof handler === 'function') {
      currentChannel.bind(eventName, (data) => {
        handler(data);
      });
    }
  });

  return pusherInstance;
}

export function disconnectRealtime() {
  if (currentChannel && currentCode && pusherInstance) {
    try {
      currentChannel.unbind_all();
      pusherInstance.unsubscribe(`room-${currentCode}`);
    } catch (e) {}
    currentChannel = null;
    currentCode = null;
  }
}
