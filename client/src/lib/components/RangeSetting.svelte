<script>
  import { sanitizeNumberRange, DEFAULT_NUMBER_RANGE } from '../game/MathDice';

  let {
    range = DEFAULT_NUMBER_RANGE,
    mode = 'draft', // 'draft' = dipakai saat buat room, 'room' = disimpan ke room
    canEdit = true,
    onApply = async () => true,
  } = $props();

  let minVal = $state(0);
  let maxVal = $state(0);
  let saved = $state(false);

  $effect(() => {
    const incoming = sanitizeNumberRange(range);
    minVal = incoming.min;
    maxVal = incoming.max;
  });

  const changed = $derived(
    minVal !== sanitizeNumberRange(range).min || maxVal !== sanitizeNumberRange(range).max
  );
  const spread = $derived(maxVal - minVal + 1);

  function handleMinInput(e) {
    const val = parseInt(e.target.value, 10);
    if (Number.isFinite(val)) {
      minVal = val;
      saved = false;
      if (mode === 'draft') {
        onApply({ min: minVal, max: maxVal });
      }
    }
  }

  function handleMaxInput(e) {
    const val = parseInt(e.target.value, 10);
    if (Number.isFinite(val)) {
      maxVal = val;
      saved = false;
      if (mode === 'draft') {
        onApply({ min: minVal, max: maxVal });
      }
    }
  }

  async function apply() {
    if (!canEdit) return;
    const clean = sanitizeNumberRange({ min: minVal, max: maxVal });
    minVal = clean.min;
    maxVal = clean.max;
    const ok = await onApply(clean);
    if (ok !== false) {
      saved = true;
      setTimeout(() => (saved = false), 2500);
    }
  }
</script>

<div class="p-3 bg-slate-900/70 border border-slate-700/70 rounded-xl">
  <div class="flex items-start justify-between gap-3 mb-3">
    <div>
      <div class="text-xs font-bold uppercase tracking-wider text-slate-200">
        🎯 Rentang Angka Soal
      </div>
      <div class="text-[11px] text-slate-400 mt-0.5">
        {canEdit
          ? 'Masukkan batas angka minimum & maksimum untuk soal matematika'
          : 'Rentang angka ditentukan oleh host room.'}
      </div>
    </div>
    <div class="text-right shrink-0">
      <div class="font-mono-code text-sm font-black text-amber-300">{minVal} .. {maxVal}</div>
      <div class="text-[10px] text-slate-500">{spread > 0 ? `${spread} angka` : 'Rentang tidak valid'}</div>
    </div>
  </div>

  {#if canEdit}
    <div class="grid grid-cols-2 gap-3 mb-3">
      <!-- Input Min -->
      <div>
        <label for="range-min" class="block text-[11px] font-bold uppercase text-slate-400 mb-1">
          Batas Minimum (Min)
        </label>
        <input
          id="range-min"
          type="number"
          value={minVal}
          oninput={handleMinInput}
          class="w-full h-11 px-3 bg-slate-950/80 border border-slate-700 focus:border-amber-400 focus:outline-none rounded-lg text-white font-mono-code text-base font-bold text-center"
          placeholder="-20"
        />
      </div>

      <!-- Input Max -->
      <div>
        <label for="range-max" class="block text-[11px] font-bold uppercase text-slate-400 mb-1">
          Batas Maksimum (Maks)
        </label>
        <input
          id="range-max"
          type="number"
          value={maxVal}
          oninput={handleMaxInput}
          class="w-full h-11 px-3 bg-slate-950/80 border border-slate-700 focus:border-amber-400 focus:outline-none rounded-lg text-white font-mono-code text-base font-bold text-center"
          placeholder="20"
        />
      </div>
    </div>

    {#if mode === 'room'}
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={apply}
          disabled={!changed}
          class="flex-1 h-10 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-black transition active:scale-95"
        >
          Simpan Rentang ke Room
        </button>
        {#if saved}
          <span class="text-[11px] font-bold text-emerald-400 shrink-0">Tersimpan</span>
        {:else if changed}
          <span class="text-[11px] font-bold text-amber-400 shrink-0">Belum disimpan</span>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400">
      Soal memakai angka antara
      <strong class="font-mono-code text-amber-300">{minVal}</strong> dan
      <strong class="font-mono-code text-amber-300">{maxVal}</strong>.
    </div>
  {/if}
</div>
