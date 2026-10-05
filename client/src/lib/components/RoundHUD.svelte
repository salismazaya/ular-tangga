<script>
  let {
    challenge = null,
    status = 'PLAYING',
    turnState = 'IDLE', // 'IDLE' | 'SPINNING' | 'WAITING_INPUT' | 'MOVING'
    timerSeconds = 10,
    latestRoll = null,
    players = [],
    myId = '',
    winner = null,
    onStartRoll = () => {},
    onSubmit = (num) => {},
  } = $props();

  let inputVal = $state('');
  let inputEl = $state(null);

  // Autofocus input saat turnState masuk ke WAITING_INPUT
  $effect(() => {
    if (turnState === 'WAITING_INPUT') {
      inputVal = '';
      setTimeout(() => inputEl?.focus(), 50);
    }
  });

  function handleSubmit() {
    if (turnState !== 'WAITING_INPUT') return;
    const num = inputVal === '' || isNaN(Number(inputVal)) ? 0 : Math.round(Number(inputVal));
    onSubmit(num);
  }

  function handleRandom() {
    if (turnState !== 'WAITING_INPUT') return;
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
      Total Langkahmu: <strong class="text-slate-200 font-mono-code">{myPlayer?.rollsCount || 0}x</strong>
    </span>
  </div>

  <!-- KONDISI 1: User belum klik ROLL (IDLE) -->
  {#if status === 'PLAYING' && turnState === 'IDLE'}
    <div class="p-5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center">
      <div class="text-xs font-bold text-slate-300 mb-2">Giliranmu untuk Melangkah!</div>
      <p class="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
        Klik tombol di bawah untuk memunculkan soal dadu matematika. Kamu memiliki <strong>10 detik</strong> untuk menentukan angka dadu!
      </p>

      <button
        onclick={onStartRoll}
        class="w-full max-w-xs py-3.5 px-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 mx-auto"
      >
        <span>🎲 Roll Dadu Sekarang!</span>
      </button>
    </div>

  <!-- KONDISI 2: Sedang Request Challenge (SPINNING) -->
  {:else if status === 'PLAYING' && turnState === 'SPINNING'}
    <div class="p-6 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center">
      <div class="animate-spin text-3xl mb-2">🎲</div>
      <div class="text-sm font-bold text-amber-300">Menyiapkan tantangan dadu...</div>
    </div>

  <!-- KONDISI 3: Timer 10 Detik Berjalan (WAITING_INPUT) -->
  {:else if status === 'PLAYING' && turnState === 'WAITING_INPUT' && challenge}
    <div class="bg-slate-900/90 border-2 border-amber-500/60 rounded-xl p-4 text-center">
      <!-- Timer Countdown Bar -->
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <span class="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          Tentukan Dadu (Batas Waktu!)
        </span>
        <div class="flex items-center gap-2">
          <div class="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
            <div
              class="h-full transition-all duration-1000 ease-linear {timerSeconds <= 3 ? 'bg-rose-500' : 'bg-amber-400'}"
              style="width: {Math.max(0, Math.min(100, (timerSeconds / 10) * 100))}%;"
            ></div>
          </div>
          <span class="font-mono-code font-bold text-sm {timerSeconds <= 3 ? 'text-rose-400 animate-bounce' : 'text-amber-300'}">
            {timerSeconds}s
          </span>
        </div>
      </div>

      <!-- Persamaan Matematika -->
      <div class="flex items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-4xl font-mono-code font-extrabold text-white my-3">
        <span class="px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-amber-300 shadow-inner">
          {challenge.screenNumber}
        </span>

        <span class="text-slate-400 font-bold">{challenge.op}</span>

        <div class="inline-block">
          <input
            type="number"
            bind:this={inputEl}
            bind:value={inputVal}
            placeholder="?"
            class="w-24 sm:w-28 px-2 py-1.5 text-center bg-slate-800 border-2 border-sky-400 text-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 font-mono-code font-black text-2xl shadow-inner"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <span class="text-slate-500">=</span>

        <span class="px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-xl text-xl">
          🎲
        </span>
      </div>

      <!-- Tombol Kunci Dadu & Acak -->
      <div class="mt-4 flex items-center justify-center gap-2">
        <button
          onclick={handleSubmit}
          class="flex-1 max-w-[220px] py-3 px-5 rounded-xl font-black text-sm transition-all shadow-lg shadow-sky-500/20 active:scale-95 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950"
        >
          Kunci Dadu! 🔒
        </button>

        <button
          onclick={handleRandom}
          title="Pilih angka acak (-20 s/d 20)"
          class="py-3 px-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
        >
          🎲 Acak (-20..20)
        </button>
      </div>
    </div>

  <!-- KONDISI 4: Sedang Melompat / Bergerak (MOVING) -->
  {:else if status === 'PLAYING' && turnState === 'MOVING'}
    <div class="p-5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center">
      <div class="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">
        Pion Sedang Melangkah...
      </div>
      <div class="text-sm text-slate-300 font-medium">
        Memeriksa jalur kotak, tangga, dan ular! 🏃‍♂️
      </div>
    </div>
  {/if}

  <!-- Hasil Dadu Terakhir (Setelah submit) -->
  {#if latestRoll?.roll}
    {@const r = latestRoll.roll}
    {@const m = latestRoll.move}
    <div class="mt-3 p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-slate-400">Hasil Lemparan Terakhir:</span>
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

  <!-- Posisi Balapan Pemain di Room -->
  <div class="mt-3 pt-3 border-t border-slate-700/60 text-xs">
    <div class="font-bold text-slate-400 uppercase tracking-wider mb-2">Posisi Balapan Saat Ini:</div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {#each [...players].sort((a, b) => (b.currentSquare || 1) - (a.currentSquare || 1)) as p, idx}
        <div class="flex items-center justify-between p-2 bg-slate-900/60 rounded-lg border border-slate-800">
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-slate-500 font-bold">#{idx + 1}</span>
            {#if p.avatarUrl || p.avatar}
              <img src={p.avatarUrl || p.avatar} alt="Avatar" class="w-4 h-4 rounded-full object-cover shrink-0 border border-sky-400" />
            {:else}
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {p.color};"></span>
            {/if}
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
