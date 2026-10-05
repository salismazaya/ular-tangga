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

  onMount(() => {
    game.init();
  });

  function toggleBgm() {
    bgmActive = audio.toggleBgm();
  }

  function toggleSfx() {
    sfxActive = audio.toggleSfx();
  }
</script>

<main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-900">
  <!-- Top Navigation Header -->
  <header class="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2.5">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <!-- Title -->
      <div class="flex items-center gap-2">
        <span class="text-2xl">🎲</span>
        <div>
          <span class="font-extrabold tracking-tight text-white text-base sm:text-lg">
            Ular Tangga
          </span>
          <span class="text-xs text-amber-400 font-bold ml-1.5 px-2 py-0.5 bg-amber-400/10 rounded-full border border-amber-400/20">
            Matematika
          </span>
        </div>
      </div>

      <!-- Right Controls: Audio & Player Info -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Audio Controls -->
        <button
          onclick={toggleBgm}
          title={bgmActive ? 'Matikan Musik' : 'Nyalakan Musik'}
          class="px-2.5 py-1 text-xs rounded-xl font-bold border transition flex items-center gap-1 {bgmActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}"
        >
          <span>🎵</span>
          <span class="hidden sm:inline">{bgmActive ? 'BGM ON' : 'BGM OFF'}</span>
        </button>

        <button
          onclick={toggleSfx}
          title={sfxActive ? 'Matikan Suara Efek' : 'Nyalakan Suara Efek'}
          class="px-2.5 py-1 text-xs rounded-xl font-bold border transition flex items-center gap-1 {sfxActive ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}"
        >
          <span>{sfxActive ? '🔊' : '🔇'}</span>
        </button>

        <!-- Room & Player Info if in Room -->
        {#if game.roomCode && game.roomState}
          <div class="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
            <span class="text-slate-400">Room:</span>
            <span class="font-mono-code font-bold text-amber-300">{game.roomCode}</span>
          </div>

          <div class="flex items-center gap-2 px-2.5 py-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
            {#if game.me?.avatar}
              <img src={game.me.avatar} alt="Avatar" class="w-5 h-5 rounded-full object-cover border border-sky-400" />
            {:else}
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: {game.me?.color || '#38bdf8'};"></span>
            {/if}
            <span class="font-bold text-white max-w-[80px] truncate">{game.playerName}</span>
          </div>

          <button
            onclick={() => game.leaveRoom()}
            class="text-xs px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold rounded-xl transition"
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
  <div class="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-6 flex flex-col justify-center">
    {#if !game.roomCode || !game.roomState}
      <!-- Login & Room Selection View -->
      <LoginView />
    {:else if game.roomState.status === 'LOBBY'}
      <!-- Room Waiting Lobby -->
      <RoomLobby />
    {:else}
      <!-- Game Arena (Simultaneous Race) -->
      <div class="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
        <!-- Papan Ular Tangga -->
        <div class="w-full max-w-[620px]">
          <GameBoard
            players={game.roomState.players || []}
            myId={game.playerId}
            pawnPositions={game.pawnPositions}
          />
        </div>

        <!-- Inline HUD (Soal matematika, timer, status pemain) -->
        <div class="w-full max-w-[620px] lg:max-w-[420px] flex flex-col">
          <RoundHUD
            challenge={game.currentChallenge}
            status={game.roomState.status}
            turnState={game.turnState}
            timerSeconds={game.timerSeconds}
            latestRoll={game.latestRollInfo}
            players={game.roomState.players || []}
            myId={game.playerId}
            winner={game.roomState.winner}
            onStartRoll={() => game.startRoll()}
            onSubmit={(val) => game.submitRoll(val)}
          />

          {#if game.roomState.status === 'FINISHED' && game.isHost}
            <div class="mt-4 p-4 bg-slate-900/90 border border-slate-700 rounded-2xl text-center">
              <button
                onclick={() => game.startGame()}
                class="w-full py-3 bg-amber-400 hover:bg-amber-300 font-extrabold text-slate-950 text-sm rounded-xl transition shadow-lg shadow-amber-400/20"
              >
                Mulai Game Baru 🔁
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <footer class="w-full py-3 text-center text-xs text-slate-600 border-t border-slate-900">
    Game Ular Tangga Matematika • Balapan Serentak Realtime
  </footer>
</main>
