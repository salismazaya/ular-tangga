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

export async function initRealtime(code, onEvent) {
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
    pusherInstance.unsubscribe(`room-${currentCode}`);
    currentChannel = null;
  }

  if (!currentChannel || currentCode !== cleanCode) {
    currentCode = cleanCode;
    currentChannel = pusherInstance.subscribe(channelName);

    const events = [
      'room_updated',
      'player_joined',
      'round_started',
      'player_submitted',
      'timer_tick',
      'round_resolved',
      'game_finished',
      'player_left',
    ];

    events.forEach((eventName) => {
      currentChannel.bind(eventName, (data) => {
        if (typeof onEvent === 'function') {
          onEvent(eventName, data);
        }
      });
    });
  }

  return pusherInstance;
}

export function disconnectRealtime() {
  if (currentChannel && currentCode && pusherInstance) {
    pusherInstance.unsubscribe(`room-${currentCode}`);
    currentChannel = null;
    currentCode = null;
  }
}
