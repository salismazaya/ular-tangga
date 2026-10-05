<script>
  let {
    challenge = null,
    status = 'PLAYING',
    rolling = false,
    latestRoll = null,
    players = [],
    myId = '',
    winner = null,
    onSubmit = (num) => {},
  } = $props();

  let inputVal = $state('');

  // Reset input saat soal baru datang
  $effect(() => {
    if (challenge) {
      inputVal = '';
    }
  });

  function handleSubmit() {
    if (rolling || status !== 'PLAYING') return;
    const num = inputVal === '' || isNaN(Number(inputVal)) ? 0 : Math.round(Number(inputVal));
    onSubmit(num);
  }

  function handleRandom() {
    if (rolling || status !== 'PLAYING') return;
    const rnd = Math.floor(Math.random() * 41) - 20; // -20 s/d 20
    inputVal = String(rnd);
    onSubmit(rnd);
  }

  const myPlayer = $derived(players.find((p) => p.id === myId));
</script>

<div class="w-full max-w-[620px] mx-auto mt-3 bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
  <!-- Winner Announcement -->
  {#if status === 'FINISHED' && winner}
    <div class="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-center mb-3 animate-pulse">
      <div class="text-xs uppercase tracking-wider font-extrabold text-emerald-400">JUARA 1 MENCAPAI KOTAK 100! 🏆</div>
      <div class="text-2xl font-black text-white mt-1">{winner.name}</div>
    </div>
  {/if}

  <!-- Header Info -->
  <div class="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3 text-xs">
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-1 bg-sky-500/20 text-sky-300 font-bold rounded-lg border border-sky-500/30">
        Balapan Serentak
      </span>
      <span class="text-slate-400">
        Kotak Saat Ini: <strong class="text-amber-300 font-mono-code font-bold text-sm">{myPlayer?.currentSquare || 1}</strong>
      </span>
    </div>

    <span class="text-slate-400">
      Total Lemparan: <strong class="text-slate-200 font-mono-code">{myPlayer?.rollsCount || 0}</strong>
    </span>
  </div>

  <!-- Math Challenge Form (TANPA PREVIEW LANGKAH SESUAI PERMINTAAN BOS) -->
  {#if challenge && status === 'PLAYING'}
    <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-center">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        Tantangan Dadu Matematika
      </div>

      <!-- Persamaan Matematika -->
      <div class="flex items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-4xl font-mono-code font-extrabold text-white my-2">
        <span class="px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-amber-300 shadow-inner">
          {challenge.screenNumber}
        </span>

        <span class="text-slate-400 font-bold">{challenge.op}</span>

        <div class="inline-block">
          <input
            type="number"
            bind:value={inputVal}
            disabled={rolling}
            placeholder="?"
            class="w-24 sm:w-28 px-2 py-1.5 text-center bg-slate-800 border-2 border-sky-400 text-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 font-mono-code font-black text-2xl shadow-inner"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <span class="text-slate-500">=</span>

        <span class="px-3.5 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-xl text-xl">
          🎲
        </span>
      </div>

      <!-- Tombol Aksi Roll & Acak -->
      <div class="mt-4 flex items-center justify-center gap-2">
        <button
          onclick={handleSubmit}
          disabled={rolling}
          class="flex-1 max-w-[220px] py-3 px-5 rounded-xl font-black text-sm transition-all shadow-lg shadow-sky-500/20 active:scale-95 {rolling
            ? 'bg-slate-700 text-slate-400 cursor-wait'
            : 'bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950'}"
        >
          {rolling ? '⏳ Mengocok Dadu...' : 'Kocok Dadu! 🎲'}
        </button>

        <button
          onclick={handleRandom}
          disabled={rolling}
          title="Pilih angka acak (-20 s/d 20)"
          class="py-3 px-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
        >
          🎲 Acak (-20..20)
        </button>
      </div>
    </div>
  {/if}

  <!-- Hasil Dadu Setelah Di-Roll -->
  {#if latestRoll?.roll}
    {@const r = latestRoll.roll}
    {@const m = latestRoll.move}
    <div class="mt-3 p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs space-y-1 animate-fade-in">
      <div class="flex items-center justify-between">
        <span class="text-slate-400">Hasil Lemparan:</span>
        <span class="font-mono-code font-bold text-white">
          {r.screenNumber} {r.op} {r.userInput} = <span class="text-amber-300 font-extrabold">{r.raw}</span>
        </span>
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-slate-800">
        <span class="text-slate-300">
          Aksi Pion:
          {#if r.direction === 'FORWARD'}
            <strong class="text-emerald-400 font-bold ml-1">Maju +{r.steps} Langkah</strong>
          {:else if r.direction === 'BACKWARD'}
            <strong class="text-rose-400 font-bold ml-1">Mundur -{r.steps} Langkah</strong>
          {:else}
            <strong class="text-slate-400 font-bold ml-1">Diam di Tempat (0)</strong>
          {/if}
        </span>

        {#if m?.isLadder}
          <span class="text-amber-400 font-extrabold">🚀 Naik Tangga ke {m.targetSquare}!</span>
        {:else if m?.isSnake}
          <span class="text-rose-400 font-extrabold">🐍 Digigit Ular ke {m.targetSquare}!</span>
        {:else}
          <span class="text-slate-400">Menuju kotak <strong class="text-amber-300">{m?.targetSquare}</strong></span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Leaderboard Balapan Pemain di Room -->
  <div class="mt-3 pt-3 border-t border-slate-700/60 text-xs">
    <div class="font-bold text-slate-400 uppercase tracking-wider mb-2">Posisi Balapan Saat Ini:</div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {#each [...players].sort((a, b) => (b.currentSquare || 1) - (a.currentSquare || 1)) as p, idx}
        <div class="flex items-center justify-between p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-slate-500 font-bold">#{idx + 1}</span>
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {p.color};"></span>
            <span class="font-semibold text-slate-200 truncate">{p.name}</span>
          </div>
          <span class="font-mono-code font-bold text-amber-300 shrink-0 ml-1">
            {p.currentSquare || 1}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>
