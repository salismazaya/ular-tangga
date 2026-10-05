<script>
  import { calculateRollWithInput } from '../game/MathDice';

  let {
    challenge = null,
    timeLeft = 10,
    currentRound = 1,
    status = 'PLAYING',
    hasSubmitted = false,
    players = [],
    myId = '',
    winner = null,
    onSubmit = (num) => {},
  } = $props();

  let inputVal = $state('');

  // Live calculation preview as user types
  const parsedInput = $derived(
    inputVal === '' || isNaN(Number(inputVal)) ? 0 : Math.round(Number(inputVal))
  );

  const previewRoll = $derived.by(() => {
    if (!challenge) return null;
    return calculateRollWithInput(challenge.screenNumber, challenge.op, parsedInput);
  });

  // Reset input value when round changes / challenge updates
  $effect(() => {
    if (challenge) {
      inputVal = '';
    }
  });

  function handleSubmit() {
    if (hasSubmitted || status !== 'PLAYING') return;
    onSubmit(parsedInput);
  }

  function handleRandom() {
    if (hasSubmitted || status !== 'PLAYING') return;
    const rnd = Math.floor(Math.random() * 41) - 20; // -20 s/d 20
    inputVal = String(rnd);
    onSubmit(rnd);
  }

  const myPlayer = $derived(players.find((p) => p.id === myId));
  const myLastRoll = $derived(myPlayer?.lastRoll);
  const myLastMove = $derived(myPlayer?.lastMove);
</script>

<div class="w-full max-w-[620px] mx-auto mt-3 bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
  <!-- Top Bar: Ronde & Non-blocking Timer -->
  <div class="flex items-center justify-between pb-3 border-b border-slate-700/70 mb-3">
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-lg border border-amber-500/30">
        Ronde {currentRound}
      </span>
      <span class="text-xs text-slate-400">
        {status === 'RESOLVING' ? 'Sedang bergerak...' : status === 'FINISHED' ? 'Permainan Selesai' : 'Serentak Berjalan'}
      </span>
    </div>

    <!-- Timer Countdown -->
    <div class="flex items-center gap-2">
      <div class="w-24 bg-slate-700 h-2.5 rounded-full overflow-hidden">
        <div
          class="h-full transition-all duration-1000 ease-linear {timeLeft <= 3 ? 'bg-rose-500' : 'bg-emerald-400'}"
          style="width: {Math.max(0, Math.min(100, (timeLeft / 10) * 100))}%;"
        ></div>
      </div>
      <span class="font-mono-code font-bold text-sm {timeLeft <= 3 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}">
        {timeLeft}s
      </span>
    </div>
  </div>

  <!-- Winner Banner if Finished -->
  {#if status === 'FINISHED' && winner}
    <div class="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center mb-3">
      <div class="text-xs uppercase tracking-wider font-bold text-emerald-400">Pemenang Juara 1 🎉</div>
      <div class="text-xl font-extrabold text-white mt-0.5">{winner.name} Mencapai Kotak 100!</div>
    </div>
  {/if}

  <!-- Math Challenge Box -->
  {#if challenge}
    <div class="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 text-center">
      <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Tantangan Dadu Matematika
      </div>

      <div class="flex items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-mono-code font-extrabold text-white">
        <!-- Angka Layar -->
        <span class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-amber-300">
          {challenge.screenNumber}
        </span>

        <!-- Operator -->
        <span class="text-slate-400 font-bold">{challenge.op}</span>

        <!-- Input Angka Pemain -->
        <div class="relative inline-block">
          <input
            type="number"
            bind:value={inputVal}
            disabled={hasSubmitted || status !== 'PLAYING'}
            placeholder="0"
            class="w-20 sm:w-24 px-2 py-1.5 text-center bg-slate-800 border-2 {hasSubmitted ? 'border-emerald-500 text-emerald-400' : 'border-sky-500 text-sky-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono-code font-bold"
            onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <span class="text-slate-500">=</span>

        <!-- Hasil Raw -->
        <span class="px-3 py-1.5 bg-slate-800/90 border border-slate-700 text-slate-300 rounded-lg text-lg sm:text-xl">
          {previewRoll ? previewRoll.raw : 0}
        </span>
      </div>

      <!-- Live Preview Badge -->
      {#if previewRoll}
        <div class="mt-2.5 flex items-center justify-center gap-2 text-xs">
          {#if previewRoll.direction === 'FORWARD'}
            <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded border border-emerald-500/40">
              Maju {previewRoll.steps} Langkah
            </span>
          {:else if previewRoll.direction === 'BACKWARD'}
            <span class="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold rounded border border-rose-500/40">
              Mundur {previewRoll.steps} Langkah
            </span>
          {:else}
            <span class="px-2 py-0.5 bg-slate-700 text-slate-300 font-bold rounded">
              Diam di Tempat (0)
            </span>
          {/if}

          {#if previewRoll.extraTurn}
            <span class="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-bold rounded border border-amber-400/50">
              ★ Ekstra Roll (6)
            </span>
          {/if}
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="mt-3 flex items-center justify-center gap-2">
        <button
          onclick={handleSubmit}
          disabled={hasSubmitted || status !== 'PLAYING'}
          class="flex-1 max-w-[200px] py-2 px-4 rounded-xl font-bold text-sm transition-all shadow-md {hasSubmitted
            ? 'bg-emerald-600 text-white cursor-default'
            : 'bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-extrabold'}"
        >
          {hasSubmitted ? '✓ Angka Terkunci' : 'Kunci Jawaban'}
        </button>

        <button
          onclick={handleRandom}
          disabled={hasSubmitted || status !== 'PLAYING'}
          title="Pilih angka acak (-20 s/d 20)"
          class="py-2 px-3 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-semibold text-xs rounded-xl border border-slate-600 transition"
        >
          🎲 Acak (-20..20)
        </button>
      </div>
    </div>
  {/if}

  <!-- Player Readiness Bar (Siapa yang sudah submit) -->
  <div class="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-1.5 text-xs">
    <span class="text-slate-400 font-medium">Status Pemain:</span>
    <div class="flex flex-wrap items-center gap-1.5">
      {#each players as p}
        <div
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] {p.hasSubmitted
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
            : 'bg-slate-800/80 border-slate-700 text-slate-400'}"
        >
          <span class="w-2 h-2 rounded-full" style="background-color: {p.color};"></span>
          <span class="font-semibold">{p.name}</span>
          <span>{p.hasSubmitted ? '✓' : '...'}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Move Feedback History (Setelah ronde dieksekusi) -->
  {#if myLastMove}
    <div class="mt-2.5 p-2 bg-slate-900/60 rounded-lg text-xs flex items-center justify-between text-slate-300">
      <div>
        Langkahmu:
        <span class="font-bold text-white">
          {myLastRoll?.direction === 'FORWARD' ? `+${myLastRoll.steps}` : myLastRoll?.direction === 'BACKWARD' ? `-${myLastRoll.steps}` : '0'}
        </span>
        menuju kotak <span class="font-bold text-amber-300">{myLastMove.finalSquare}</span>
      </div>

      {#if myLastMove.isLadder}
        <span class="text-amber-400 font-bold">Naik Tangga ke {myLastMove.targetSquare}! 🚀</span>
      {:else if myLastMove.isSnake}
        <span class="text-rose-400 font-bold">Digigit Ular turun ke {myLastMove.targetSquare}! 🐍</span>
      {/if}
    </div>
  {/if}
</div>
