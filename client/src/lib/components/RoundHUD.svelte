<script>
  import NumberPad from './NumberPad.svelte';
  import RangeSetting from './RangeSetting.svelte';
  import { calculateRollWithInput, sanitizeNumberRange, DEFAULT_NUMBER_RANGE } from '../game/MathDice';

  let {
    challenge = null,
    status = 'PLAYING',
    turnState = 'IDLE', // 'IDLE' | 'SPINNING' | 'WAITING_INPUT' | 'MOVING'
    timerSeconds = 10,
    maxTimer = 10,
    latestRoll = null,
    players = [],
    myId = '',
    winner = null,
    numberRange = DEFAULT_NUMBER_RANGE,
    isHost = false,
    onStartRoll = () => {},
    onSubmit = (num) => {},
    onLeave = () => {},
    onRangeApply = (range) => {},
  } = $props();

  let inputVal = $state('');
  let rangeOpen = $state(false);

  const activeRange = $derived(sanitizeNumberRange(numberRange));

  $effect(() => {
    if (turnState === 'WAITING_INPUT') inputVal = '';
  });

  const myPlayer = $derived(players.find((p) => p.id === myId));

  const sortedPlayers = $derived.by(() => {
    return [...players].sort((a, b) => (b.currentSquare || 1) - (a.currentSquare || 1));
  });

  const myRank = $derived.by(() => {
    const idx = sortedPlayers.findIndex((p) => p.id === myId);
    return idx >= 0 ? idx + 1 : 1;
  });

  function handleKey(key) {
    if (turnState !== 'WAITING_INPUT') return;

    if (key.type === 'digit') {
      if (inputVal === '0') inputVal = key.digit;
      else if (inputVal === '-0') inputVal = '-' + key.digit;
      else if (inputVal === '-') inputVal = '-' + key.digit;
      else if (inputVal.replace('-', '').length < 4) inputVal += key.digit;
      return;
    }

    if (key.type === 'minus' || key.type === 'sign') {
      if (inputVal.startsWith('-')) {
        inputVal = inputVal.slice(1);
      } else {
        inputVal = '-' + inputVal;
      }
      return;
    }

    if (key.type === 'back') {
      inputVal = inputVal.slice(0, -1);
      return;
    }

    if (key.type === 'clear') inputVal = '';
  }

  function handleSubmit() {
    if (turnState !== 'WAITING_INPUT') return;
    const num = inputVal === '' || inputVal === '-' || isNaN(Number(inputVal)) ? 0 : Math.round(Number(inputVal));
    onSubmit(num);
  }

  function handleRandom() {
    if (turnState !== 'WAITING_INPUT') return;
    const { min, max } = activeRange;
    onSubmit(min + Math.floor(Math.random() * (max - min + 1)));
  }

  function timerWidth() {
    return Math.max(0, Math.min(100, (timerSeconds / (maxTimer || 10)) * 100));
  }
</script>

<div class="w-full flex flex-col justify-start">
  <!-- Winner Announcement -->
  {#if status === 'FINISHED' && winner}
    <div class="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-center mb-2">
      <div class="text-[11px] uppercase tracking-wider font-extrabold text-emerald-400">JUARA 1 MENCAPAI KOTAK 100! 🏆</div>
      <div class="text-xl font-black text-white mt-0.5">{winner.name}</div>
      <button
        onclick={onLeave}
        class="mt-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-rose-300 hover:text-rose-200 border border-rose-500/40 font-bold text-xs rounded-lg transition"
      >
        🚪 Keluar ke Menu Utama
      </button>
    </div>
  {/if}

  <!-- Header Info Ringkas (1 Baris Rapi) -->
  <div class="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5 text-xs text-slate-300">
    <div class="flex items-center gap-2">
      <span class="px-2 py-0.5 bg-sky-500/20 text-sky-300 font-bold rounded-md border border-sky-500/30 text-[10px]">
        Posisi #{myRank}
      </span>
      <span class="text-slate-400 text-xs">
        Kotak: <strong class="text-amber-300 font-mono-code font-bold text-sm">{myPlayer?.currentSquare || 1}</strong>
      </span>
    </div>

    <span class="text-slate-400 text-xs">
      Langkah: <strong class="text-slate-200 font-mono-code">{myPlayer?.rollsCount || 0}x</strong>
    </span>
  </div>

  <!-- Status Playing (HUD & Keypad Terpadu) -->
  {#if status === 'PLAYING'}
    <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 sm:p-2 shadow-xl">
      {#if turnState === 'WAITING_INPUT' && challenge}
        <!-- Timer -->
        <div class="flex items-center justify-between pb-1 mb-1 border-b border-slate-800/80">
          <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            Tentukan Dadu
          </span>
          <div class="flex items-center gap-2">
            <div class="w-16 sm:w-20 bg-slate-800 h-1 rounded-full overflow-hidden border border-slate-700">
              <div
                class="h-full transition-all duration-1000 ease-linear {timerSeconds <= 3 ? 'bg-rose-500' : 'bg-amber-400'}"
                style="width: {timerWidth()}%;"
              ></div>
            </div>
            <span class="font-mono-code font-bold text-xs {timerSeconds <= 3 ? 'text-rose-400 animate-bounce' : 'text-amber-300'}">
              {timerSeconds}s
            </span>
          </div>
        </div>

        <!-- Persamaan Matematika (Ramping) -->
        <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-xl sm:text-2xl font-mono-code font-extrabold text-white my-0.5">
          <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-amber-300 shadow-inner text-base sm:text-lg">
            {challenge.screenNumber}
          </span>

          <span class="text-slate-400 font-bold">{challenge.op}</span>

          <span class="min-w-[52px] sm:min-w-[60px] px-2 py-0.5 text-center bg-slate-950/80 border-2 border-sky-400 text-sky-200 rounded-lg font-black text-lg sm:text-xl">
            {inputVal === '' ? '?' : inputVal}
          </span>

          <span class="text-slate-500">=</span>

          <span class="px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-lg text-xs sm:text-sm">
            🎲
          </span>
        </div>
      {/if}

      <!-- Keypad & Kontrol Terpadu -->
      <NumberPad
        value={inputVal}
        disabled={turnState !== 'WAITING_INPUT'}
        {turnState}
        onKey={handleKey}
        onSubmit={handleSubmit}
        onRoll={onStartRoll}
      />

      {#if turnState === 'WAITING_INPUT'}
        <div class="mt-1 flex items-center justify-between gap-2 text-[10px]">
          <button
            type="button"
            onclick={handleRandom}
            class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold rounded border border-slate-700 transition"
          >
            🎲 Acak {activeRange.min}..{activeRange.max}
          </button>
          <span class="text-slate-500 truncate">
            Rentang: {activeRange.min} .. {activeRange.max}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Hasil Lemparan Terakhir (Single Line Compact) -->
  {#if latestRoll?.roll}
    {@const r = latestRoll.roll}
    {@const m = latestRoll.move}
    <div class="mt-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-[11px] flex items-center justify-between gap-1.5">
      <div class="flex items-center gap-1 truncate">
        <span class="text-slate-400 shrink-0">Hasil:</span>
        <span class="font-mono-code font-bold text-white shrink-0">
          {r.screenNumber} {r.op} {r.userInput} = <span class="text-amber-300 font-extrabold">{r.raw}</span>
        </span>
      </div>
      <div class="truncate text-right">
        {#if m?.isLadder}
          <span class="text-amber-400 font-extrabold">🚀 Naik ke {m.targetSquare}!</span>
        {:else if m?.isSnake}
          <span class="text-rose-400 font-extrabold">🐍 Digigit ke {m.targetSquare}!</span>
        {:else if r.direction === 'FORWARD'}
          <span class="text-emerald-400 font-bold">Maju +{r.steps} ➔ {m?.targetSquare}</span>
        {:else if r.direction === 'BACKWARD'}
          <span class="text-rose-400 font-bold">Mundur -{r.steps} ➔ {m?.targetSquare}</span>
        {:else}
          <span class="text-slate-400">Tetap ({m?.targetSquare})</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Posisi Balapan -->
  <div class="mt-1.5 pt-1.5 border-t border-slate-800 text-xs">
    <div class="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Posisi Balapan:</div>
    <div class="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto no-scrollbar">
      {#each sortedPlayers as p, idx}
        <div class="flex items-center justify-between p-1 bg-slate-900/60 rounded-md border border-slate-800/80">
          <div class="flex items-center gap-1 truncate">
            <span class="text-slate-500 font-bold text-[9px]">#{idx + 1}</span>
            {#if p.avatarUrl || p.avatar}
              <img src={p.avatarUrl || p.avatar} alt="Avatar" class="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-sky-400" />
            {:else}
              <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: {p.color};"></span>
            {/if}
            <span class="font-semibold text-slate-200 truncate text-[10px]">{p.name}</span>
          </div>
          <span class="font-mono-code font-bold text-amber-300 shrink-0 ml-1 text-[11px]">
            {p.currentSquare || 1}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Rentang angka soal (hanya tampil jika bukan PLAYING atau di-toggle) -->
  {#if status !== 'PLAYING'}
    <div class="mt-2">
      <button
        onclick={() => (rangeOpen = !rangeOpen)}
        class="w-full flex items-center justify-between px-3 py-1.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition"
      >
        <span>Pengaturan Rentang Angka Soal</span>
        <span class="flex items-center gap-2">
          <span class="font-mono-code text-amber-300">{activeRange.min} .. {activeRange.max}</span>
          <span class="text-slate-400">{rangeOpen ? '▲' : '▼'}</span>
        </span>
      </button>

      {#if rangeOpen}
        <div class="mt-1.5">
          <RangeSetting
            range={activeRange}
            mode="room"
            canEdit={isHost}
            onApply={onRangeApply}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>
