<script>
  import { getSquareCoordinates, LADDERS, SNAKES } from '../game/Board';

  let {
    players = [],
    myId = '',
    pawnPositions = {},
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

  // Group pawns by square to apply clean offset
  const pawnsBySquare = $derived.by(() => {
    const map = new Map();
    players.forEach((p) => {
      const sq = pawnPositions[p.id] !== undefined ? pawnPositions[p.id] : (p.currentSquare || 1);
      if (!map.has(sq)) map.set(sq, []);
      map.get(sq).push(p);
    });
    return map;
  });

  function getPawnOffset(player, square) {
    const list = pawnsBySquare.get(square) || [];
    const idx = list.findIndex((p) => p.id === player.id);
    if (list.length <= 1 || idx === -1) return { dx: 0, dy: 0 };

    const offsets = [
      { dx: -18, dy: -18 },
      { dx: 18, dy: -18 },
      { dx: -18, dy: 18 },
      { dx: 18, dy: 18 },
      { dx: 0, dy: -24 },
      { dx: 0, dy: 24 },
    ];
    return offsets[idx % offsets.length];
  }

  // Ladder SVG path generator
  const ladderPaths = Object.entries(LADDERS).map(([start, end]) => {
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
    const numRungs = Math.max(3, Math.floor(dist / 40));
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
      start: Number(start),
      end: Number(end),
      rail1: { x1: s.x - ox, y1: s.y - oy, x2: e.x - ox, y2: e.y - oy },
      rail2: { x1: s.x + ox, y1: s.y + oy, x2: e.x + ox, y2: e.y + oy },
      rungs,
    };
  });

  // Snake SVG curve generator
  const snakePaths = Object.entries(SNAKES).map(([head, tail]) => {
    const h = getSquareCenter(Number(head));
    const t = getSquareCenter(Number(tail));
    const mx = (h.x + t.x) / 2;
    const my = (h.y + t.y) / 2;
    const dx = t.x - h.x;
    const dy = t.y - h.y;
    const waveX = mx - dy * 0.25;
    const waveY = my + dx * 0.25;

    return {
      head: Number(head),
      tail: Number(tail),
      headPos: h,
      tailPos: t,
      d: `M ${h.x} ${h.y} Q ${waveX} ${waveY} ${t.x} ${t.y}`,
    };
  });
</script>

<div class="w-full max-w-[620px] aspect-square mx-auto p-2 sm:p-3 bg-slate-800/90 rounded-2xl shadow-2xl border border-slate-700/60 backdrop-blur-sm">
  <svg
    viewBox="0 0 1000 1000"
    class="w-full h-full rounded-xl overflow-hidden shadow-inner select-none"
  >
    <!-- Background Defs & Gradients -->
    <defs>
      <linearGradient id="ladderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>
      <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10b981" />
        <stop offset="100%" stop-color="#047857" />
      </linearGradient>
      <filter id="pawnGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.5" />
      </filter>

      <!-- Player Avatar Clip Paths -->
      {#each players as p}
        <clipPath id="avatar-clip-{p.id}">
          <circle cx="0" cy="0" r="22" />
        </clipPath>
      {/each}
    </defs>

    <!-- 10x10 Grid Squares -->
    {#each squares as sq}
      {@const coords = getSquareCoordinates(sq)}
      {@const x = coords.col * 100}
      {@const y = coords.row * 100}
      {@const isEven = (coords.row + coords.col) % 2 === 0}
      {@const isFinish = sq === 100}
      {@const isStart = sq === 1}
      {@const isLadderStart = Boolean(LADDERS[sq])}
      {@const isSnakeHead = Boolean(SNAKES[sq])}

      <g>
        <rect
          {x}
          {y}
          width="100"
          height="100"
          fill={isFinish
            ? '#059669'
            : isStart
            ? '#3b82f6'
            : isLadderStart
            ? '#78350f'
            : isSnakeHead
            ? '#831843'
            : isEven
            ? '#1e293b'
            : '#0f172a'}
          stroke="#334155"
          stroke-width="1.5"
          class="transition-colors duration-200"
        />

        <!-- Nomor Kotak -->
        <text
          x={x + 8}
          y={y + 24}
          fill={isFinish || isStart ? '#ffffff' : '#94a3b8'}
          font-size="20"
          font-weight="700"
          font-family="JetBrains Mono, monospace"
        >
          {sq}
        </text>

        <!-- Label Finis / Start -->
        {#if isFinish}
          <text
            x={x + 50}
            y={y + 64}
            fill="#fef08a"
            font-size="22"
            font-weight="800"
            text-anchor="middle"
          >
            FINISH
          </text>
        {:else if isStart}
          <text
            x={x + 50}
            y={y + 64}
            fill="#bae6fd"
            font-size="20"
            font-weight="800"
            text-anchor="middle"
          >
            START
          </text>
        {:else if isLadderStart}
          <text
            x={x + 50}
            y={y + 80}
            fill="#fef08a"
            font-size="14"
            font-weight="700"
            text-anchor="middle"
          >
            ↑ KE {LADDERS[sq]}
          </text>
        {:else if isSnakeHead}
          <text
            x={x + 50}
            y={y + 80}
            fill="#fbcfe8"
            font-size="14"
            font-weight="700"
            text-anchor="middle"
          >
            ↓ KE {SNAKES[sq]}
          </text>
        {/if}
      </g>
    {/each}

    <!-- Tangga (Ladders) Layer -->
    {#each ladderPaths as ladder}
      <g opacity="0.92">
        <line
          x1={ladder.rail1.x1}
          y1={ladder.rail1.y1}
          x2={ladder.rail1.x2}
          y2={ladder.rail1.y2}
          stroke="url(#ladderGrad)"
          stroke-width="8"
          stroke-linecap="round"
        />
        <line
          x1={ladder.rail2.x1}
          y1={ladder.rail2.y1}
          x2={ladder.rail2.x2}
          y2={ladder.rail2.y2}
          stroke="url(#ladderGrad)"
          stroke-width="8"
          stroke-linecap="round"
        />
        {#each ladder.rungs as rung}
          <line
            x1={rung.x1}
            y1={rung.y1}
            x2={rung.x2}
            y2={rung.y2}
            stroke="#fef3c7"
            stroke-width="4.5"
            stroke-linecap="round"
          />
        {/each}
      </g>
    {/each}

    <!-- Ular (Snakes) Layer -->
    {#each snakePaths as snake}
      <g opacity="0.95">
        <path
          d={snake.d}
          fill="none"
          stroke="#000000"
          stroke-width="18"
          stroke-linecap="round"
          opacity="0.3"
          transform="translate(4, 6)"
        />
        <path
          d={snake.d}
          fill="none"
          stroke="url(#snakeGrad)"
          stroke-width="16"
          stroke-linecap="round"
        />
        <path
          d={snake.d}
          fill="none"
          stroke="#a7f3d0"
          stroke-width="10"
          stroke-dasharray="14 14"
          stroke-linecap="round"
          opacity="0.8"
        />
        <circle
          cx={snake.headPos.x}
          cy={snake.headPos.y}
          r="16"
          fill="#047857"
          stroke="#fbcfe8"
          stroke-width="2"
        />
        <circle cx={snake.headPos.x - 5} cy={snake.headPos.y - 4} r="3" fill="#ffffff" />
        <circle cx={snake.headPos.x + 5} cy={snake.headPos.y - 4} r="3" fill="#ffffff" />
        <circle cx={snake.headPos.x - 5} cy={snake.headPos.y - 4} r="1.5" fill="#000000" />
        <circle cx={snake.headPos.x + 5} cy={snake.headPos.y - 4} r="1.5" fill="#000000" />
      </g>
    {/each}

    <!-- Pion Pemain (Pawn Layer) -->
    {#each players as player}
      {@const sq = pawnPositions[player.id] !== undefined ? pawnPositions[player.id] : (player.currentSquare || 1)}
      {@const center = getSquareCenter(sq)}
      {@const offset = getPawnOffset(player, sq)}
      {@const cx = center.x + offset.dx}
      {@const cy = center.y + offset.dy}
      {@const isMe = player.id === myId}
      {@const initial = (player.name || 'P').charAt(0).toUpperCase()}

      <!-- Animasi posisi per block dengan CSS transform -->
      <g
        class="transition-all duration-200 ease-out"
        style="transform: translate({cx}px, {cy}px);"
        filter="url(#pawnGlow)"
      >
        <!-- Highlight Lingkaran Berputar untuk Pemain Saya -->
        {#if isMe}
          <circle
            cx="0"
            cy="0"
            r="28"
            fill="none"
            stroke="#38bdf8"
            stroke-width="3"
            stroke-dasharray="8 6"
            class="animate-spin"
            style="animation-duration: 5s;"
          />
        {/if}

        <!-- Tubuh Pion -->
        <circle
          cx="0"
          cy="0"
          r="22"
          fill={player.color}
          stroke={isMe ? '#ffffff' : '#0f172a'}
          stroke-width={isMe ? '3' : '2'}
        />

        <!-- Foto Avatar Kustom ATAU Inisial Huruf -->
        {#if player.avatar}
          <image
            href={player.avatar}
            x="-22"
            y="-22"
            width="44"
            height="44"
            clip-path="url(#avatar-clip-{player.id})"
            preserveAspectRatio="xMidYMid slice"
          />
        {:else}
          <text
            x="0"
            y="7"
            fill="#ffffff"
            font-size="18"
            font-weight="800"
            text-anchor="middle"
            font-family="system-ui, sans-serif"
          >
            {initial}
          </text>
        {/if}

        <!-- Label Nama Pemain -->
        <g transform="translate(0, 32)">
          <rect
            x="-35"
            y="-8"
            width="70"
            height="18"
            rx="5"
            fill="#0f172a"
            opacity="0.88"
            stroke="#334155"
            stroke-width="1"
          />
          <text
            x="0"
            y="5"
            fill="#f8fafc"
            font-size="10"
            font-weight="700"
            text-anchor="middle"
          >
            {player.name.slice(0, 8)}
          </text>
        </g>
      </g>
    {/each}
  </svg>
</div>
