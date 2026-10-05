<script>
  import { getSquareCoordinates, DEFAULT_LADDERS, DEFAULT_SNAKES } from '../game/Board';

  let {
    players = [],
    myId = '',
    pawnPositions = {},
    boardConfig = null,
  } = $props();

  // Helper koordinat cell center di viewBox 1000x1000
  function getSquareCenter(sq) {
    const { row, col } = getSquareCoordinates(sq);
    return {
      x: col * 100 + 50,
      y: row * 100 + 50,
    };
  }

  // Pre-generate grid squares 1..100
  const squares = Array.from({ length: 100 }, (_, i) => i + 1);

  // Dynamic Ladders & Snakes based on room boardConfig
  const activeLadders = $derived(boardConfig?.ladders || DEFAULT_LADDERS);
  const activeSnakes = $derived(boardConfig?.snakes || DEFAULT_SNAKES);

  // Group pawns by square to apply clean grid layout (supports up to 30 players per square!)
  const pawnsBySquare = $derived.by(() => {
    const map = new Map();
    players.forEach((p) => {
      const sq = pawnPositions[p.id] !== undefined ? pawnPositions[p.id] : (p.currentSquare || 1);
      if (!map.has(sq)) map.set(sq, []);
      map.get(sq).push(p);
    });
    return map;
  });

  // Calculate dynamic position & size for up to 30 pawns on the same square
  function getPawnLayout(player, square) {
    const list = pawnsBySquare.get(square) || [];
    const count = list.length;
    const idx = list.findIndex((p) => p.id === player.id);

    if (count <= 1 || idx === -1) {
      return { dx: 0, dy: 0, radius: 22, count: 1 };
    }

    // Grid layout: 2-4 -> 2x2, 5-9 -> 3x3, 10-16 -> 4x4, 17-25 -> 5x5, 26-36 -> 6x6
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const boxSize = 76; // usable box within 100x100
    const cellW = boxSize / cols;
    const cellH = boxSize / rows;
    const radius = Math.max(5.5, Math.min(18, Math.min(cellW, cellH) * 0.44));

    const c = idx % cols;
    const r = Math.floor(idx / cols);

    const startX = -boxSize / 2 + cellW / 2;
    const startY = -boxSize / 2 + cellH / 2;

    const dx = startX + c * cellW;
    const dy = startY + r * cellH;

    return { dx, dy, radius, count };
  }

  // Ladder SVG path generator (reactive to activeLadders)
  const ladderPaths = $derived.by(() => {
    return Object.entries(activeLadders).map(([start, end]) => {
      const s = getSquareCenter(Number(start));
      const e = getSquareCenter(Number(end));
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;
      const width = 14;

      const ox = Math.cos(perpAngle) * width;
      const oy = Math.sin(perpAngle) * width;

      // Rungs (anak tangga)
      const dist = Math.hypot(dx, dy);
      const numRungs = Math.max(3, Math.floor(dist / 38));
      const rungs = [];
      for (let i = 1; i <= numRungs; i++) {
        const t = i / (numRungs + 1);
        const rx = s.x + dx * t;
        const ry = s.y + dy * t;
        rungs.push({
          x1: rx - ox,
          y1: ry - oy,
          x2: rx + ox,
          y2: ry + oy,
        });
      }

      return {
        startNum: Number(start),
        endNum: Number(end),
        leftRail: `M ${s.x - ox} ${s.y - oy} L ${e.x - ox} ${e.y - oy}`,
        rightRail: `M ${s.x + ox} ${s.y + oy} L ${e.x + ox} ${e.y + oy}`,
        rungs,
      };
    });
  });

  // Snake SVG generator (reactive to activeSnakes)
  const snakePaths = $derived.by(() => {
    return Object.entries(activeSnakes).map(([head, tail]) => {
      const h = getSquareCenter(Number(head));
      const t = getSquareCenter(Number(tail));
      const dx = t.x - h.x;
      const dy = t.y - h.y;
      const dist = Math.hypot(dx, dy);

      // Create natural wave S-curve path
      const angle = Math.atan2(dy, dx);
      const perp = angle + Math.PI / 2;
      const waveAmp = Math.min(38, Math.max(18, dist * 0.16));

      const cp1x = h.x + dx * 0.3 + Math.cos(perp) * waveAmp;
      const cp1y = h.y + dy * 0.3 + Math.sin(perp) * waveAmp;
      const cp2x = h.x + dx * 0.7 - Math.cos(perp) * waveAmp;
      const cp2y = h.y + dy * 0.7 - Math.sin(perp) * waveAmp;

      const pathData = `M ${h.x} ${h.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${t.x} ${t.y}`;

      return {
        headNum: Number(head),
        tailNum: Number(tail),
        pathData,
        headPos: h,
        tailPos: t,
      };
    });
  });

  // Urutkan pemain: diri sendiri (isMe) selalu di paling belakang/atas agar tidak tertutup pemain lain
  const sortedPlayers = $derived.by(() => {
    return [...players].sort((a, b) => {
      if (a.id === myId) return 1;
      if (b.id === myId) return -1;
      return 0;
    });
  });
</script>

<div class="relative w-auto h-full max-h-full max-w-full aspect-square mx-auto rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-700/80 bg-slate-900 select-none flex items-center justify-center">
  <svg
    viewBox="0 0 1000 1000"
    class="w-full h-full block"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <!-- Gradient Kotak Papan -->
      <linearGradient id="sqLight" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>

      <linearGradient id="sqDark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#182234" />
        <stop offset="100%" stop-color="#0b1120" />
      </linearGradient>

      <linearGradient id="sqStart" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#065f46" />
        <stop offset="100%" stop-color="#022c22" />
      </linearGradient>

      <linearGradient id="sqFinish" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#854d0e" />
        <stop offset="100%" stop-color="#422006" />
      </linearGradient>

      <!-- Glow Filters -->
      <filter id="pawnGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.6" />
      </filter>

      <filter id="myPawnHalo" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- 1. Grid 100 Kotak -->
    {#each squares as sq}
      {@const { row, col } = getSquareCoordinates(sq)}
      {@const isStart = sq === 1}
      {@const isFinish = sq === 100}
      {@const isEven = (row + col) % 2 === 0}
      {@const fillGrad = isStart ? 'url(#sqStart)' : isFinish ? 'url(#sqFinish)' : isEven ? 'url(#sqLight)' : 'url(#sqDark)'}

      <g transform="translate({col * 100}, {row * 100})">
        <!-- Kotak -->
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="12"
          fill={fillGrad}
          stroke={isStart ? '#10b981' : isFinish ? '#f59e0b' : '#334155'}
          stroke-width={isStart || isFinish ? '2.5' : '1'}
          class="transition-colors"
        />

        <!-- Nomor Kotak -->
        <text
          x="10"
          y="24"
          fill={isStart ? '#6ee7b7' : isFinish ? '#fde047' : '#94a3b8'}
          font-size="15"
          font-weight="800"
          font-family="system-ui, sans-serif"
          opacity="0.8"
        >
          {sq}
        </text>

        <!-- Keterangan START & FINISH -->
        {#if isStart}
          <text
            x="50"
            y="68"
            fill="#34d399"
            font-size="12"
            font-weight="900"
            text-anchor="middle"
            letter-spacing="1"
          >
            START
          </text>
        {:else if isFinish}
          <text
            x="50"
            y="68"
            fill="#fbbf24"
            font-size="12"
            font-weight="900"
            text-anchor="middle"
            letter-spacing="1"
          >
            FINISH 🏆
          </text>
        {/if}

        <!-- Indikator Tangga / Ular di Kotak -->
        {#if activeLadders[sq]}
          <g transform="translate(74, 10)">
            <circle cx="10" cy="10" r="9" fill="#0284c7" opacity="0.85" />
            <text x="10" y="14" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">▲</text>
          </g>
        {:else if activeSnakes[sq]}
          <g transform="translate(74, 10)">
            <circle cx="10" cy="10" r="9" fill="#dc2626" opacity="0.85" />
            <text x="10" y="14" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">▼</text>
          </g>
        {/if}
      </g>
    {/each}

    <!-- 2. Jalur Tangga (Ladders) Dinamis -->
    {#each ladderPaths as ladder}
      <g opacity="0.88">
        <!-- Rel Kiri dan Kanan Tangga -->
        <path
          d={ladder.leftRail}
          stroke="#0284c7"
          stroke-width="5"
          stroke-linecap="round"
        />
        <path
          d={ladder.rightRail}
          stroke="#0284c7"
          stroke-width="5"
          stroke-linecap="round"
        />
        <!-- Anak Tangga (Rungs) -->
        {#each ladder.rungs as rung}
          <line
            x1={rung.x1}
            y1={rung.y1}
            x2={rung.x2}
            y2={rung.y2}
            stroke="#38bdf8"
            stroke-width="3.5"
            stroke-linecap="round"
          />
        {/each}
      </g>
    {/each}

    <!-- 3. Jalur Ular (Snakes) Dinamis -->
    {#each snakePaths as snake}
      <g opacity="0.9">
        <!-- Bayangan Ular -->
        <path
          d={snake.pathData}
          fill="none"
          stroke="#000000"
          stroke-width="12"
          stroke-linecap="round"
          opacity="0.4"
          transform="translate(2, 4)"
        />

        <!-- Tubuh Ular Luar -->
        <path
          d={snake.pathData}
          fill="none"
          stroke="#dc2626"
          stroke-width="8"
          stroke-linecap="round"
        />

        <!-- Motif Sisik Ular -->
        <path
          d={snake.pathData}
          fill="none"
          stroke="#fca5a5"
          stroke-width="3"
          stroke-dasharray="8 8"
          stroke-linecap="round"
        />

        <!-- Kepala Ular -->
        <circle
          cx={snake.headPos.x}
          cy={snake.headPos.y}
          r="10"
          fill="#991b1b"
          stroke="#fecaca"
          stroke-width="2"
        />
        <!-- Mata Ular -->
        <circle cx={snake.headPos.x - 3} cy={snake.headPos.y - 2} r="1.5" fill="#fde047" />
        <circle cx={snake.headPos.x + 3} cy={snake.headPos.y - 2} r="1.5" fill="#fde047" />

        <!-- Ekor Ular -->
        <circle
          cx={snake.tailPos.x}
          cy={snake.tailPos.y}
          r="4.5"
          fill="#dc2626"
        />
      </g>
    {/each}

    <!-- 4. Pion Pemain (Mendukung hingga 30 pemain di kotak yang sama!) -->
    {#each sortedPlayers as player}
      {@const sq = pawnPositions[player.id] !== undefined ? pawnPositions[player.id] : (player.currentSquare || 1)}
      {@const center = getSquareCenter(sq)}
      {@const layout = getPawnLayout(player, sq)}
      {@const cx = center.x + layout.dx}
      {@const cy = center.y + layout.dy}
      {@const isMe = player.id === myId}
      {@const initial = (player.name || 'P').charAt(0).toUpperCase()}

      <!-- ClipPath per avatar -->
      <clipPath id="avatar-clip-{player.id}">
        <circle cx="0" cy="0" r={layout.radius} />
      </clipPath>

      <g
        class="transition-all duration-300 ease-out cursor-pointer"
        style="transform: translate({cx}px, {cy}px);"
        filter="url(#pawnGlow)"
      >
        <!-- CIRI KHAS PION DIRI SENDIRI (IS_ME): Halo Emas Menyala + Animasi Denyut -->
        {#if isMe}
          <!-- Glowing pulse outer ring -->
          <circle
            cx="0"
            cy="0"
            r={layout.radius + 6}
            fill="none"
            stroke="#fbbf24"
            stroke-width="3"
            opacity="0.8"
            class="animate-ping"
            style="transform-origin: 0px 0px; animation-duration: 2s;"
          />
          <circle
            cx="0"
            cy="0"
            r={layout.radius + 4}
            fill="none"
            stroke="#f59e0b"
            stroke-width="2.5"
          />
        {/if}

        <!-- Lingkaran Tubuh / Border Pion -->
        <circle
          cx="0"
          cy="0"
          r={layout.radius}
          fill={player.color}
          stroke={isMe ? '#fbbf24' : '#0f172a'}
          stroke-width={isMe ? '3' : '1.5'}
        />

        <!-- Foto Avatar Kustom ATAU Inisial Huruf -->
        {#if player.avatarUrl || player.avatar}
          <image
            href={player.avatarUrl || player.avatar}
            x={-layout.radius}
            y={-layout.radius}
            width={layout.radius * 2}
            height={layout.radius * 2}
            clip-path="url(#avatar-clip-{player.id})"
            preserveAspectRatio="xMidYMid slice"
          />
        {:else}
          <text
            x="0"
            y={layout.radius * 0.35}
            fill="#ffffff"
            font-size={Math.max(8, layout.radius * 0.9)}
            font-weight="900"
            text-anchor="middle"
            font-family="system-ui, sans-serif"
          >
            {initial}
          </text>
        {/if}

        <!-- CIRI KHAS DIRI SENDIRI: Badge Pointer 'KAMU' di atas pion -->
        {#if isMe}
          <g transform="translate(0, {-layout.radius - 8})">
            <!-- Segitiga panah ke bawah -->
            <polygon points="-4,-2 4,-2 0,4" fill="#f59e0b" />
            <!-- Kotak badge KAMU -->
            <rect
              x="-18"
              y="-15"
              width="36"
              height="13"
              rx="4"
              fill="#f59e0b"
              stroke="#ffffff"
              stroke-width="1"
            />
            <text
              x="0"
              y="-6"
              fill="#0f172a"
              font-size="8"
              font-weight="900"
              text-anchor="middle"
              font-family="system-ui, sans-serif"
              letter-spacing="0.5"
            >
              KAMU
            </text>
          </g>
        {:else if layout.count <= 4}
          <!-- Label Nama Pemain lain (hanya jika kotak tidak terlalu padat <= 4) -->
          <g transform="translate(0, {layout.radius + 10})">
            <rect
              x="-24"
              y="-6"
              width="48"
              height="12"
              rx="3"
              fill="#0f172a"
              opacity="0.9"
              stroke="#334155"
              stroke-width="0.8"
            />
            <text
              x="0"
              y="2.5"
              fill="#f8fafc"
              font-size="7.5"
              font-weight="700"
              text-anchor="middle"
            >
              {player.name.slice(0, 7)}
            </text>
          </g>
        {/if}
      </g>
    {/each}
  </svg>
</div>
