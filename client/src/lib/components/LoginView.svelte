<script>
  import { game } from '../gameStore.svelte';
  import { compressImage } from '../imageCompress';

  let nameInput = $state(game.playerName || '');
  let joinCodeInput = $state('');
  let activeTab = $state('join');
  let selectedTimer = $state(10); // 10 | 20 | 30
  let compressing = $state(false);
  let fileInputRef = $state(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    compressing = true;
    try {
      const dataUrl = await compressImage(file, 128, 0.75);
      game.setAvatar(dataUrl);
    } catch (err) {
      game.setError('Gagal mengompres foto avatar: ' + err.message);
    } finally {
      compressing = false;
    }
  }

  function handleCreate() {
    if (!nameInput.trim()) {
      game.setError('Silakan isi nama kamu terlebih dahulu');
      return;
    }
    game.createRoom(nameInput.trim(), selectedTimer);
  }

  function handleJoin() {
    if (!nameInput.trim()) {
      game.setError('Silakan isi nama kamu terlebih dahulu');
      return;
    }
    if (!joinCodeInput.trim()) {
      game.setError('Silakan masukkan kode room');
      return;
    }
    game.joinRoom(joinCodeInput.trim().toUpperCase(), nameInput.trim());
  }
</script>

<div class="max-w-md w-full mx-auto bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
  <!-- Header -->
  <div class="text-center mb-6">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-sky-400 text-slate-950 font-black text-2xl shadow-lg mb-3">
      🎲
    </div>
    <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
      Ular Tangga Matematika
    </h1>
    <p class="text-xs sm:text-sm text-slate-400 mt-1">
      Multiplayer race serentak dengan dadu matematika
    </p>
  </div>

  <!-- Foto Avatar & Input Nama -->
  <div class="mb-5 space-y-4">
    <!-- Avatar Upload Section -->
    <div class="flex items-center gap-4 p-3 bg-slate-900/70 border border-slate-700/60 rounded-2xl">
      <button type="button" class="relative group cursor-pointer focus:outline-none" onclick={() => fileInputRef?.click()}>
        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-sky-400 bg-slate-800 flex items-center justify-center shadow-md">
          {#if game.playerAvatar}
            <img src={game.playerAvatar} alt="Avatar" class="w-full h-full object-cover" />
          {:else}
            <span class="text-2xl">👤</span>
          {/if}
        </div>
        <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] text-white font-bold">
          Ubah
        </div>
      </button>

      <div class="flex-1">
        <div class="text-xs font-bold text-slate-200">Foto Avatar Pion</div>
        <div class="text-[11px] text-slate-400">Pionmu di papan akan memakai foto ini!</div>
        <button
          type="button"
          onclick={() => fileInputRef?.click()}
          disabled={compressing}
          class="mt-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 font-bold text-xs rounded-lg border border-slate-700 transition"
        >
          {compressing ? 'Mengompres...' : game.playerAvatar ? 'Ganti Foto' : '+ Upload Foto'}
        </button>
        <input
          type="file"
          accept="image/*"
          bind:this={fileInputRef}
          onchange={handleFileChange}
          class="hidden"
        />
      </div>
    </div>

    <!-- Input Nama -->
    <div>
      <label for="pname" class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
        Nama Panggilan
      </label>
      <input
        id="pname"
        type="text"
        bind:value={nameInput}
        placeholder="Contoh: Salis, Budi, Maya..."
        maxlength="15"
        class="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
      />
    </div>
  </div>

  <!-- Tabs Navigation -->
  <div class="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 rounded-xl mb-5 border border-slate-700/50">
    <button
      onclick={() => (activeTab = 'join')}
      class="py-2 text-xs font-bold rounded-lg transition {activeTab === 'join' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}"
    >
      Gabung Room
    </button>
    <button
      onclick={() => (activeTab = 'create')}
      class="py-2 text-xs font-bold rounded-lg transition {activeTab === 'create' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}"
    >
      Buat Room Baru
    </button>
  </div>

  {#if activeTab === 'join'}
    <!-- Form Gabung Room -->
    <div class="space-y-4">
      <div>
        <label for="rcode" class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
          Kode Room (4 Karakter)
        </label>
        <input
          id="rcode"
          type="text"
          bind:value={joinCodeInput}
          placeholder="MISAL: 4K7P"
          maxlength="6"
          class="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-center text-xl font-mono-code font-bold uppercase tracking-widest text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
          onkeydown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <p class="text-[11px] text-slate-500 mt-1 text-center">
          *Kode tanpa huruf O/0/I/1/L agar bebas salah baca
        </p>
      </div>

      <button
        onclick={handleJoin}
        disabled={game.loading}
        class="w-full py-3.5 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
      >
        {#if game.loading}
          <span>Menghubungkan...</span>
        {:else}
          <span>Masuk ke Room ➔</span>
        {/if}
      </button>
    </div>
  {:else}
    <!-- Form Buat Room -->
    <div class="space-y-4">
      <!-- Pilihan Durasi Timer -->
      <div>
        <div class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
          ⏱️ Durasi Timer Giliran (Pikir Angka)
        </div>
        <div class="grid grid-cols-3 gap-2">
          {#each [10, 20, 30] as sec}
            <button
              type="button"
              onclick={() => (selectedTimer = sec)}
              class="py-2.5 px-2 rounded-xl border text-xs font-black transition flex flex-col items-center justify-center gap-0.5 {selectedTimer === sec
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 scale-[1.02]'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'}"
            >
              <span class="text-sm font-bold">{sec} Detik</span>
              <span class="text-[10px] font-medium opacity-80">
                {sec === 10 ? 'Cepat ⚡' : sec === 20 ? 'Santai 🧘' : 'Tenang 🐢'}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <div class="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
        <div class="font-bold text-amber-300">Pengaturan Room:</div>
        <div>• Mode: Balapan Serentak (Semua pemain berlari bersamaan)</div>
        <div>• Timer Giliran: <strong class="text-amber-300">{selectedTimer} Detik</strong></div>
        <div>• Dadu: Matematika (+ / -) menuju kotak finish 100</div>
        <div>• Rintangan: Tangga meluncur naik, Ular menggigit turun</div>
      </div>

      <button
        onclick={handleCreate}
        disabled={game.loading}
        class="w-full py-3.5 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2"
      >
        {#if game.loading}
          <span>Membuat Room...</span>
        {:else}
          <span>Buat Room & Ajak Teman 🎮</span>
        {/if}
      </button>
    </div>
  {/if}

  <!-- Aturan Ringkas Dadu Matematika -->
  <div class="mt-6 pt-5 border-t border-slate-700/60">
    <div class="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-800">
      <span class="font-bold text-slate-200">Cara Dadu Bekerja:</span>
      Layar memberikan angka acak dan operator (<code class="text-amber-300">+</code> atau <code class="text-amber-300">-</code>). Masukkan angkamu. Hasil kalkulasi menentukan jumlah langkah:
      <span class="text-emerald-400 font-semibold">Positif = Maju</span>,
      <span class="text-rose-400 font-semibold">Negatif = Mundur</span>,
      <span class="text-slate-300 font-semibold">0 = Diam</span>.
      Pion akan melompat kotak demi kotak sampai ke finish!
    </div>
  </div>

  <!-- Leaderboard & Active Rooms Drawer Link -->
  <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
    <button
      onclick={() => {
        game.fetchPublicRooms();
        activeTab = 'rooms';
      }}
      class="hover:text-sky-300 underline"
    >
      Room Publik ({game.publicRooms.length})
    </button>
    <button
      onclick={() => {
        game.fetchLeaderboard();
        activeTab = 'leaderboard';
      }}
      class="hover:text-amber-300 underline"
    >
      Papan Skor Juara 🏆
    </button>
  </div>

  <!-- Modal/Section Room Publik -->
  {#if activeTab === 'rooms'}
    <div class="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs">
      <div class="font-bold text-slate-200 mb-2 flex items-center justify-between">
        <span>Room Aktif</span>
        <button onclick={() => (activeTab = 'join')} class="text-slate-400 hover:text-white">✕</button>
      </div>
      {#if game.publicRooms.length === 0}
        <div class="text-slate-500 py-2 text-center">Belum ada room publik yang terbuka.</div>
      {:else}
        <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {#each game.publicRooms as r}
            <div class="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
              <div>
                <span class="font-mono-code font-bold text-sky-400">{r.code}</span>
                <span class="text-slate-400 ml-1.5">({r.playerCount} pemain)</span>
              </div>
              <button
                onclick={() => {
                  joinCodeInput = r.code;
                  activeTab = 'join';
                }}
                class="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 rounded font-semibold text-[11px]"
              >
                Pilih
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Modal/Section Leaderboard -->
  {#if activeTab === 'leaderboard'}
    <div class="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs">
      <div class="font-bold text-slate-200 mb-2 flex items-center justify-between">
        <span>🏆 Peringkat Kemenangan</span>
        <button onclick={() => (activeTab = 'join')} class="text-slate-400 hover:text-white">✕</button>
      </div>
      {#if game.leaderboard.length === 0}
        <div class="text-slate-500 py-2 text-center">Belum ada catatan kemenangan. Jadilah juara pertama!</div>
      {:else}
        <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
          {#each game.leaderboard as row, idx}
            <div class="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-md">
              <span class="font-medium text-slate-200">
                #{idx + 1} {row.name}
              </span>
              <span class="font-mono-code text-amber-300 font-bold">
                {row.wins}x Menang
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
