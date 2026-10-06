<script>
  import { onMount } from 'svelte';
  import { game } from './lib/gameStore.svelte';
  import { audio } from './lib/audio';
  import LoginView from './lib/components/LoginView.svelte';
  import RoomLobby from './lib/components/RoomLobby.svelte';
  import GameBoard from './lib/components/GameBoard.svelte';
  import RoundHUD from './lib/components/RoundHUD.svelte';

  let bgmActive = $state(audio.bgmEnabled);
  let sfxActive = $state(audio.sfxEnabled);
  let isFullscreen = $state(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (rfs) {
        rfs.call(el).then(() => {
          isFullscreen = true;
          try {
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(() => {});
            }
          } catch (e) {}
        }).catch(() => {});
      }
    } else {
      const efs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (efs) {
        efs.call(document).then(() => {
          isFullscreen = false;
        }).catch(() => {});
      }
    }
  }

  onMount(() => {
    game.init();
    const handleFsChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  });

  $effect(() => {
    if (game.roomCode && game.roomState && game.roomState.status !== 'LOBBY') {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    }
  });

  function toggleBgm() {
    bgmActive = audio.toggleBgm();
  }

  function toggleSfx() {
    sfxActive = audio.toggleSfx();
  }
</script>

<main
  class="{game.roomCode && game.roomState && game.roomState.status !== 'LOBBY' ? 'fixed inset-0 w-full h-[100dvh] max-h-[100dvh] overflow-hidden touch-none select-none overscroll-none' : 'min-h-screen'} bg-slate-950 text-slate-100 flex flex-col justify-start selection:bg-amber-400 selection:text-slate-900"
  style="{game.roomCode && game.roomState && game.roomState.status !== 'LOBBY' ? 'height: 100vh; height: 100dvh; max-height: 100dvh; padding-bottom: max(2px, env(safe-area-inset-bottom, 0px)); padding-top: max(2px, env(safe-area-inset-top, 0px)); padding-left: max(4px, env(safe-area-inset-left, 0px)); padding-right: max(4px, env(safe-area-inset-right, 0px));' : ''}"
>
  <!-- Top Navigation Header -->
  <header class="w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 {game.roomCode && game.roomState && game.roomState.status !== 'LOBBY' ? 'h-7 sm:h-8 px-2 sm:px-3 py-0.5' : 'px-3 sm:px-4 py-2.5'} shrink-0">
    <div class="w-full max-w-7xl mx-auto flex items-center justify-between h-full">
      <!-- Title -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <span class="text-base sm:text-xl">🎲</span>
        <div>
          <span class="font-extrabold tracking-tight text-white text-xs sm:text-base">
            Ular Tangga
          </span>
          <span class="text-[10px] sm:text-xs text-amber-400 font-bold ml-1 px-1.5 py-0.2 bg-amber-400/10 rounded-full border border-amber-400/20">
            Matematika
          </span>
        </div>
      </div>

      <!-- Right Controls: Audio & Player Info -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Audio Controls -->
        <button
          onclick={toggleBgm}
          title={bgmActive ? 'Matikan Musik' : 'Nyalakan Musik'}
          class="px-2 py-0.5 text-[11px] sm:text-xs rounded-lg font-bold border transition flex items-center gap-1 {bgmActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}"
        >
          <span>🎵</span>
          <span class="hidden sm:inline">{bgmActive ? 'BGM' : 'BGM OFF'}</span>
        </button>

        <button
          onclick={toggleSfx}
          title={sfxActive ? 'Matikan Suara Efek' : 'Nyalakan Suara Efek'}
          class="px-2 py-0.5 text-[11px] sm:text-xs rounded-lg font-bold border transition flex items-center gap-1 {sfxActive ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}"
        >
          <span>{sfxActive ? '🔊' : '🔇'}</span>
        </button>

        <!-- Fullscreen Button -->
        <button
          onclick={toggleFullscreen}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fit)'}
          class="px-2 py-0.5 text-[11px] sm:text-xs rounded-lg font-bold border transition flex items-center gap-1 {isFullscreen ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}"
        >
          <span>{isFullscreen ? '↙️' : '⛶'}</span>
          <span class="hidden sm:inline">{isFullscreen ? 'Normal' : 'Fullscreen'}</span>
        </button>

        <!-- Room & Player Info if in Room -->
        {#if game.roomCode && game.roomState}
          <div class="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded-lg border border-slate-700 text-[11px]">
            <span class="text-slate-400">Room:</span>
            <span class="font-mono-code font-bold text-amber-300">{game.roomCode}</span>
          </div>

          <div class="flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded-lg border border-slate-700 text-[11px]">
            {#if game.me?.avatar}
              <img src={game.me.avatar} alt="Avatar" class="w-4 h-4 rounded-full object-cover border border-sky-400" />
            {:else}
              <span class="w-2 h-2 rounded-full" style="background-color: {game.me?.color || '#38bdf8'};"></span>
            {/if}
            <span class="font-bold text-white max-w-[70px] truncate">{game.playerName}</span>
          </div>

          <button
            onclick={() => game.leaveRoom()}
            class="text-[11px] px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-lg transition"
          >
            Keluar
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Error Toast (Non-blocking notification) -->
  {#if game.errorMessage}
    <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-2xl border border-rose-400 animate-bounce">
      ⚠️ {game.errorMessage}
    </div>
  {/if}

  <!-- Main View Container -->
  <div class="flex-1 min-h-0 w-full {game.roomCode && game.roomState && game.roomState.status !== 'LOBBY' ? 'p-1 sm:p-2 flex flex-col justify-center overflow-hidden max-w-none' : 'max-w-7xl mx-auto p-3 sm:p-6 flex flex-col justify-center'}">
    {#if !game.roomCode || !game.roomState}
      <!-- Login & Room Selection View -->
      <LoginView />
    {:else if game.roomState.status === 'LOBBY'}
      <!-- Room Waiting Lobby -->
      <RoomLobby />
    {:else}
      <!-- Game Arena (Full Screen Landscape: Kiri Board, Kanan Input - FIT ZERO SCROLL) -->
      <div class="w-full h-full flex-1 min-h-0 flex flex-row items-center justify-center gap-1.5 sm:gap-3 overflow-hidden">
        <!-- Papan Ular Tangga (KIRI: Selalu 100% Fit & Utuh di Semua Device) -->
        <div class="flex-1 h-full min-h-0 min-w-0 flex items-center justify-center p-0.5 sm:p-1 overflow-hidden">
          <div class="w-full h-full max-w-full max-h-full flex items-center justify-center">
            <GameBoard
              players={game.roomState.players || []}
              myId={game.playerId}
              pawnPositions={game.pawnPositions}
              boardConfig={game.roomState.boardConfig}
            />
          </div>
        </div>

        <!-- Kontrol Terpadu & Keypad (KANAN: Fit 100%, No Scroll) -->
        <div class="w-[280px] sm:w-[310px] md:w-[340px] shrink-0 h-full max-h-full flex flex-col justify-between overflow-hidden px-1 py-0.5">
          <RoundHUD
            challenge={game.currentChallenge}
            status={game.roomState.status}
            turnState={game.turnState}
            timerSeconds={game.timerSeconds}
            maxTimer={game.roomState.turnTimer || 10}
            latestRoll={game.latestRollInfo}
            players={game.roomState.players || []}
            myId={game.playerId}
            winner={game.roomState.winner}
            numberRange={game.roomState.numberRange}
            isHost={game.isHost}
            onStartRoll={() => game.startRoll()}
            onSubmit={(val) => game.submitRoll(val)}
            onLeave={() => game.leaveRoom()}
            onRangeApply={(range) => game.setNumberRange(range)}
          />

          {#if game.roomState.status === 'FINISHED'}
            <div class="mt-2 p-2 bg-slate-900/95 border-2 border-amber-400/50 rounded-xl text-center space-y-1.5 shadow-2xl">
              <div class="text-xs font-black text-amber-300">
                🎉 Permainan Telah Selesai!
              </div>

              <div class="flex gap-2 justify-center">
                {#if game.isHost}
                  <button
                    onclick={() => game.startGame()}
                    disabled={game.loading}
                    class="flex-1 py-1.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 font-black text-slate-950 text-xs rounded-lg transition shadow-lg shadow-amber-400/20 active:scale-95"
                  >
                    🔁 Main Lagi
                  </button>
                {/if}

                <button
                  onclick={() => game.leaveRoom()}
                  class="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-rose-600/30 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-slate-200 font-extrabold text-xs rounded-lg transition active:scale-95"
                >
                  🚪 Keluar
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Prompt Putar Layar (Paksa Landscape Full Screen di HP) -->
  {#if game.roomCode && game.roomState && game.roomState.status !== 'LOBBY'}
    <div class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center landscape:hidden select-none">
      <div class="relative w-20 h-20 mb-5 flex items-center justify-center">
        <div class="absolute inset-0 rounded-full bg-amber-400/10 animate-ping"></div>
        <div class="text-5xl animate-bounce">📱</div>
        <div class="absolute -bottom-1 -right-1 text-2xl animate-spin" style="animation-duration: 3s;">🔄</div>
      </div>

      <h2 class="text-lg sm:text-xl font-black text-white mb-2">
        Putar HP ke Posisi Landscape
      </h2>
      <p class="text-xs sm:text-sm text-slate-300 max-w-xs mb-5 leading-relaxed">
        Game Ular Tangga berjalan dalam mode <strong class="text-amber-300">Layar Penuh Horizontal</strong> (Papan di Kiri & Keypad di Kanan) untuk pengalaman terbaik!
      </p>

      <button
        type="button"
        onclick={toggleFullscreen}
        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-400/25 transition flex items-center gap-2"
      >
        <span>⛶</span>
        <span>Aktifkan Layar Penuh (Landscape)</span>
      </button>
    </div>
  {/if}

  <!-- Footer (Hanya saat di luar permainan) -->
  {#if !game.roomCode || game.roomState?.status === 'LOBBY'}
    <footer class="w-full py-3 text-center text-xs text-slate-600 border-t border-slate-900 shrink-0">
      Game Ular Tangga Matematika • Balapan Serentak Realtime
    </footer>
  {/if}
</main>
