<script>
  import { game } from '../gameStore.svelte';

  let copied = $state(false);

  function copyCode() {
    if (game.roomCode) {
      navigator.clipboard.writeText(game.roomCode);
      copied = true;
      setTimeout(() => (copied = false), 2500);
    }
  }
</script>

<div class="max-w-md w-full mx-auto bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
  <!-- Top bar -->
  <div class="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Lobi Ruang Tunggu</span>
    </div>
    <button
      onclick={() => game.leaveRoom()}
      class="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
    >
      Keluar
    </button>
  </div>

  <!-- Room Code Card -->
  <div class="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-4 text-center mb-6">
    <div class="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
      Kode Room Kamu
    </div>
    <div class="flex items-center justify-center gap-3">
      <span class="text-4xl font-mono-code font-black tracking-widest text-amber-300">
        {game.roomCode}
      </span>
      <button
        onclick={copyCode}
        class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 rounded-lg border border-slate-600 transition"
      >
        {copied ? '✓ Tersalin' : 'Salin'}
      </button>
    </div>
    <p class="text-[11px] text-slate-400 mt-2">
      Bagikan kode 4 huruf ini ke temanmu agar mereka bisa bergabung!
    </p>
    <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-xs text-amber-300 font-bold">
    ⏱️ Timer Giliran: {game.roomState?.turnTimer || 10} Detik
    </div>
    <div class="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-xs text-sky-300 font-bold">
    🎯 Angka Soal: {game.roomState?.numberRange?.min ?? -20} .. {game.roomState?.numberRange?.max ?? 20}
    </div>
  </div>

  <!-- Players List -->
  <div class="mb-6">
    <div class="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
      <span>Pemain di Room ({game.roomState?.players?.length || 0})</span>
      <span class="text-slate-500 font-normal lowercase">minimal 1 pemain</span>
    </div>

    <div class="space-y-2">
      {#each game.roomState?.players || [] as player}
        {@const isMe = player.id === game.playerId}
        {@const isPlayerHost = player.id === game.roomState?.hostId}

        <div class="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl">
          <div class="flex items-center gap-3">
            {#if player.avatarUrl || player.avatar}
              <img src={player.avatarUrl || player.avatar} alt="Avatar" class="w-6 h-6 rounded-full object-cover border border-sky-400" />
            {:else}
              <span
                class="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                style="background-color: {player.color};"
              ></span>
            {/if}
            <span class="font-bold text-slate-100 text-sm">
              {player.name}
              {#if isMe}
                <span class="text-xs font-normal text-sky-400 ml-1">(Kamu)</span>
              {/if}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            {#if isPlayerHost}
              <span class="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase rounded border border-amber-400/40">
                Host
              </span>
            {/if}
            <span class="text-xs text-emerald-400">Siap</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Action Button -->
  {#if game.isHost}
    <button
      onclick={() => game.startGame()}
      class="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
    >
      <span>Mulai Game Serentak! 🚀</span>
    </button>
  {:else}
    <div class="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
      <div class="animate-pulse font-medium text-slate-300">
        Menunggu Host memulai permainan...
      </div>
      <div class="text-[11px] text-slate-500 mt-1">
        Siapkan kecepatan jarimu untuk menghitung dadu matematika!
      </div>
    </div>
  {/if}
</div>
