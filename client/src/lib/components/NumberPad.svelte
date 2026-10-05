<script>
  let {
    value = '',
    disabled = false,
    turnState = 'WAITING_INPUT', // 'IDLE' | 'SPINNING' | 'WAITING_INPUT' | 'MOVING'
    onKey = () => {},
    onSubmit = () => {},
    onRoll = () => {},
  } = $props();

  // Keypad 2 Baris:
  // Baris 1: 1, 2, 3, 4, 5, - (mines)
  const ROW1 = [
    { type: 'digit', digit: '1', label: '1' },
    { type: 'digit', digit: '2', label: '2' },
    { type: 'digit', digit: '3', label: '3' },
    { type: 'digit', digit: '4', label: '4' },
    { type: 'digit', digit: '5', label: '5' },
    { type: 'minus', label: '−', title: 'Mines (-)' },
  ];

  // Baris 2: 6, 7, 8, 9, 0, ⌫ (hapus)
  const ROW2 = [
    { type: 'digit', digit: '6', label: '6' },
    { type: 'digit', digit: '7', label: '7' },
    { type: 'digit', digit: '8', label: '8' },
    { type: 'digit', digit: '9', label: '9' },
    { type: 'digit', digit: '0', label: '0' },
    { type: 'back', label: '⌫', title: 'Hapus satu digit' },
  ];

  function press(key) {
    if (disabled) return;
    onKey(key);
  }

  function handleKeydown(event) {
    if (disabled || turnState !== 'WAITING_INPUT') return;
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      onKey({ type: 'digit', digit: event.key });
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      onKey({ type: 'minus' });
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      onKey({ type: 'back' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mt-2 rounded-2xl bg-slate-950/80 border border-slate-700/80 p-2 sm:p-2.5">
  {#if turnState === 'IDLE'}
    <!-- Tombol Roll saat giliran belum dimulai -->
    <div class="py-2 text-center">
      <div class="text-xs text-slate-400 mb-2 font-medium">
        Siap melangkah di papan balapan?
      </div>
      <button
        type="button"
        onclick={onRoll}
        class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2"
      >
        <span class="text-xl">🎲</span>
        <span>Roll Dadu Sekarang!</span>
      </button>
    </div>

  {:else if turnState === 'SPINNING'}
    <div class="py-4 text-center">
      <div class="animate-spin text-3xl mb-1">🎲</div>
      <div class="text-xs font-bold text-amber-300">Menyiapkan tantangan dadu...</div>
    </div>

  {:else if turnState === 'MOVING'}
    <div class="py-3 text-center">
      <div class="text-xs font-black uppercase tracking-wider text-sky-400 mb-0.5">
        Pion Sedang Melangkah...
      </div>
      <div class="text-[11px] text-slate-300 font-medium">
        Memeriksa jalur kotak, tangga, dan ular! 🏃
      </div>
    </div>

  {:else}
    <!-- KEYPAD KHUSUS 2 BARIS (Zero Native Keyboard, Zero Scroll) -->
    <div class="grid grid-cols-7 gap-1.5 sm:gap-2 w-full">
      <!-- Baris 1: 1, 2, 3, 4, 5, - (mines) -->
      {#each ROW1 as key}
        <button
          type="button"
          onclick={() => press(key)}
          disabled={disabled}
          title={key.title || key.label}
          class="h-10 sm:h-11 rounded-xl font-mono-code text-base sm:text-lg font-black transition active:scale-90 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center
            {key.type === 'digit'
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm'
              : 'bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/60 shadow-sm'}"
        >
          {key.label}
        </button>
      {/each}

      <!-- Tombol Kunci Dadu: Merentang 2 Baris di Kolom ke-7 -->
      <button
        type="button"
        onclick={() => onSubmit()}
        disabled={disabled}
        title="Kunci angka dadu ini untuk melangkah"
        class="row-span-2 col-start-7 row-start-1 h-full min-h-[86px] rounded-xl bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 hover:brightness-110 active:scale-95 text-slate-950 font-black p-1 shadow-lg shadow-sky-500/25 disabled:opacity-40 flex flex-col items-center justify-center gap-0.5 transition"
      >
        <span class="text-base sm:text-lg">🔒</span>
        <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-none">Kunci</span>
        {#if value !== ''}
          <span class="mt-0.5 px-1 py-0.2 rounded bg-slate-950/70 text-white font-mono-code text-[11px] font-bold max-w-full truncate">
            {value}
          </span>
        {/if}
      </button>

      <!-- Baris 2: 6, 7, 8, 9, 0, ⌫ (hapus) -->
      {#each ROW2 as key}
        <button
          type="button"
          onclick={() => press(key)}
          disabled={disabled}
          title={key.title || key.label}
          class="h-10 sm:h-11 rounded-xl font-mono-code text-base sm:text-lg font-black transition active:scale-90 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center
            {key.type === 'digit'
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm'
              : 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 border border-rose-500/60 shadow-sm'}"
        >
          {key.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
