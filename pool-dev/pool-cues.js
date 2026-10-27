    // ═══════════════════════════════════════════════════════════════════
    // 8-BALL POOL — CUES
    // ═══════════════════════════════════════════════════════════════════
    // The cue collection (POOL_V2_PLAN.md, Cues): the design's materials and cues as data,
    // their stats and mastery levels, and pqDraw, the one renderer for the table and the picker.

    // Materials: [base, shadow edge, highlight line], then the average colour and the rod width
    // (px) under which the texture is drawn as that average, then the texture (sizes in mm).
    // Mirror metal and neon carry their own shading across the rod (PQ_OWN).
    const PQ_MATS = {
        tipBlue: ['#3E73B8', '#22447A', '#7FA5DA'], tipBrown: ['#7A5233', '#42291A', '#A67E5A'], ferrule: ['#F1ECE0', '#BDB4A1', '#FFFFFF'],
        brassFerr: ['#C9A55A', '#7D6128', '#F3DE9E'], lacquer: ['#1A1B1D', '#060607', '#5A5D62'], rubber: ['#1C1D1F', '#0B0B0C', '#3A3C40'],
        brass: ['#C8A050', '#7A5C22', '#F5E2A6'], silver: ['#C9CDD2', '#7C838C', '#FFFFFF'], turquoise: ['#3FB5A9', '#1E6E66', '#8BE0D5'],
        maple: ['#E8D3A6', '#B08C5C', '#FAF0D8', '#E2CB9C', 28, { t: 'grain', c: '#CDAE78', w: 0.25, s: 1.6, wave: 0.6 }],
        birdseye: ['#E4C998', '#A9824F', '#F7E8C8', '#DCC08D', 36, { t: 'grain', c: '#C9A56E', w: 0.25, s: 1.8, wave: 0.5, eye: '#8E6A3A', eyeR: 0.55 }],
        ebony: ['#1E1A18', '#0A0908', '#4A423D', '#201C1A', 44, { t: 'grain', c: '#332C27', w: 0.3, s: 2.2, wave: 0.3 }],
        rosewood: ['#5E2A1C', '#30120A', '#8E4C36', '#52241A', 22, { t: 'stripe', c: '#2A0F08', w: 0.8, s: 3.0, wave: 1.8 }],
        tulipwood: ['#D98A6A', '#9A5034', '#F2B79C', '#D07F60', 22, { t: 'stripe', c: '#B9654A', w: 0.7, s: 2.8, wave: 1.2 }],
        ash: ['#E7D7B4', '#AE9568', '#F8EFD9', '#DFCDA6', 30, { t: 'ash', c: '#C3A675', w: 0.35, s: 3.0, ang: 26 }],
        walnut: ['#3B2318', '#1C0F09', '#6A4634', '#36201A', 36, { t: 'grain', c: '#2A170E', w: 0.4, s: 2.0, wave: 0.6 }],
        linenBlack: ['#1F2023', '#0B0B0C', '#44464B', '#26282B', 40, { t: 'linen', c: '#3A3C41', p: 0.9 }],
        linenNavy: ['#2F4060', '#152035', '#6A7FA3', '#56647E', 40, { t: 'linen', c: '#C8CED8', p: 0.9 }],
        pebble: ['#6B4529', '#33200F', '#9C7150', '#603D24', 40, { t: 'pebble', c: '#4E301A', size: 0.9 }],
        lizardBlk: ['#2A2C2F', '#0D0E0F', '#5C6066', '#232528', 40, { t: 'lizard', c: '#121315', size: 1.8 }],
        stitchBlk: ['#1D1C1B', '#0A0A09', '#4A4744', '#2A2826', 28, { t: 'stitched', c: '#E9DFC8', s: 3.2 }],
        carbon: ['#1E2023', '#08090A', '#6E757D', '#24272B', 14, { t: 'carbon', c: '#30343A', c2: '#121315', cell: 1.6 }],
        pearl: ['#EDE7DE', '#B7AFA4', '#FFFFFF', '#ECE9E2', 0, { t: 'pearl', c: '#E4EEF0', c2: '#F2E4EC', c3: '#E7ECD6' }],
        abalone: ['#4F8A86', '#234240', '#BFE3D6', '#5A8580', 0, { t: 'pearl', c: '#3E8E8A', c2: '#7A5BA8', c3: '#6FA65A' }],
        malachite: ['#1F7A52', '#0C3E28', '#6CCB9C', '#1D7049', 14, { t: 'bands', c: '#0B4A30', s: 2.4 }],
        // Polished metal: a dark horizon c, a white-hot line c2, a mid tone c3.
        chrome: ['#B4BDC7', '#2E343B', '#FFFFFF', '#A9B2BC', 4, { t: 'mirror', c: '#2A3038', c2: '#FFFFFF', c3: '#9AA4AF' }],
        goldPol: ['#E0B547', '#5E420A', '#FFF7D6', '#D8AC40', 4, { t: 'mirror', c: '#5A3D08', c2: '#FFF8DE', c3: '#C99528' }],
        copper: ['#C9794A', '#4E220C', '#FFE2CC', '#BF6F42', 4, { t: 'mirror', c: '#4A200C', c2: '#FFE8D6', c3: '#A9592E' }],
        anodViolet: ['#6E4FD0', '#2A1A62', '#CDBBFF', '#6A4CC6', 18, { t: 'brushed', c: '#A58EF5', p: 0.3, s: 40 }],
        filigree: ['#121214', '#040405', '#6A6456', '#3A3122', 16, { t: 'filigree', c: '#E6BD52', size: 9, w: 0.5 }],
        dragon: ['#15120E', '#050403', '#6E6248', '#56451F', 16, { t: 'scales', c: '#EDC458', c2: '#8A6A22', size: 8 }],
        // Neon: edge, colour and a white-hot core across the rod, lit on every side; never a glow outside it.
        neonCyan: ['#1AD4F2', '#0B6A80', '#E8FDFF', '#46DEF5', 0, { t: 'neon', core: '#F2FEFF', c: '#1AD4F2', edge: '#0A5266' }],
        neonMagenta: ['#FF3DC8', '#7A145E', '#FFE6F7', '#FF5CD0', 0, { t: 'neon', core: '#FFF2FB', c: '#FF3DC8', edge: '#5E0C46' }],
        circuit: ['#2F353B', '#0E1013', '#77818B', '#33404A', 16, { t: 'circuit', c: '#3CC6DC', pad: '#B4F4FF', seam: '#121518', cell: 5 }],
        holo: ['#CFC8EE', '#5E5294', '#FFFFFF', '#C2BCE6', 10, { t: 'holo', c: '#FF9ADF', c2: '#86ECFF', c3: '#FFF29A', c4: '#B896FF', s: 36 }],
        galaxy: ['#160F3A', '#060416', '#6A5CC0', '#2C1E62', 12, { t: 'galaxy', c: '#FF3DC8', c2: '#1AD4F2', star: '#FFFFFF', s: 16 }],
        magma: ['#2A0E07', '#0D0402', '#7A3418', '#8A2E10', 14, { t: 'magma', c: '#FF6A18', core: '#FFD86A', s: 10 }],
    };
    // Sections: [from %, to %, material, part], measured from the tip; a named part can catch the sheen.
    const pqStd = (sh, joint, fore, wrap, butt, ferr) => [[0, 0.9, 'tipBlue'], [0.9, 2.5, ferr || 'ferrule'], [2.5, 50, sh, 'shaft'],
        [50, 51.5, joint, 'joint'], [51.5, 72, fore, 'forearm'], [72, 90, wrap], [90, 99, butt, 'butt'], [99, 100, 'rubber']];
    // Points and splices point at the tip, edged by veneers (outside in, [colour or material, mm]).
    const pqPts = (n, apex, w, core, veneers, o) => Object.assign({ n, apex, base: 71.5, rot: 0, w, core, veneers }, o);
    // Inlays set around the rod at a % of its length: diamond, window or dot, size in mm.
    const pqIn = (at, n, shape, size, mat, rot) => ({ at, n, shape, size, mat, rot: rot || 0 });
    // bars: [power, aim, spin, time] at level 1 and at level 5. Rarity sets how strong a mastered
    // cue is, scaled as 8 Ball Pool's are (the user, 2026-10-13): see PQ_RARITY. A cue keeps its
    // character in its best bar, and the rarer it is, the more its levels add.
    // need: [game, tier, wins for levels 2, 3, 4 and 5]: the better the cue, the harder its wins
    // and the longer its climb (the user, 2026-10-05). See pqCounts.
    // The look by rarity (the design's rarity ladder, 2026-10-15): Common is plain wood, Rare one
    // exotic accent, Epic exotic surfaces and a slow 9 s sheen, Legendary nothing that reads as
    // wood and its own sheen. sheen: c [core, fringe, second fringe], s seconds a cycle, band % of
    // the cue, and the parts it crosses (joint, shaft, forearm, butt, rings, points, windows, inlays).
    const PQ_SET = [
        { id: 'standard', name: 'Standard', cond: 'Always yours · the house cue', blurb: 'Maple shaft · black linen wrap', rarity: 'common', bars: [[4, 4, 4, 4], [5, 5, 5, 5]], need: ['pool', 'easy', [5, 7, 10, 15]],
            sections: pqStd('maple', 'brass', 'lacquer', 'linenBlack', 'walnut') },
        { id: 'tulipwood', name: 'Tulipwood', cond: 'Team Player · join the leaderboard', ach: 'teamPlayer', blurb: 'Tulipwood forearm · navy linen', rarity: 'common', bars: [[5, 5, 4, 4], [6, 6, 6, 6]], need: ['pool', 'easy', [5, 7, 11, 16]],
            sections: pqStd('maple', 'silver', 'tulipwood', 'linenNavy', 'tulipwood'), rings: [[72, 0.8, 'silver'], [90, 0.8, 'silver']] },
        { id: 'birdseye', name: 'Birdseye', cond: 'Office Gamer · earn XP in 50 game sessions', ach: 'gamer', blurb: 'Birdseye maple · pearl windows', rarity: 'rare', bars: [[5, 6, 5, 5], [7, 8, 7, 7]], need: ['pool', 'normal', [5, 8, 11, 16]],
            sections: pqStd('maple', 'ebony', 'birdseye', 'pebble', 'birdseye'), rings: [[51.5, 0.8, 'brass'], [72, 0.8, 'brass'], [90, 0.8, 'brass'], [98.5, 0.8, 'brass']],
            inlays: [pqIn(61.5, 4, 'window', 14, 'pearl'), pqIn(94.5, 4, 'window', 10, 'pearl', 45)] },
        { id: 'ember', name: 'Ember', cond: 'On Fire · keep a 7-day work streak', ach: 'streak7', blurb: 'Magma forearm · copper rings', rarity: 'rare', bars: [[7, 5, 3, 5], [10, 7, 6, 6]], need: ['pool', 'normal', [5, 8, 12, 17]],
            sections: pqStd('maple', 'copper', 'magma', 'lizardBlk', 'magma'), rings: [[51.5, 1, 'copper'], [72, 1.4, 'copper'], [90, 1.4, 'copper'], [98.5, 1, 'copper']],
            points: [pqPts(4, 55, 0.72, 'ebony', [['copper', 0.7]])] },
        { id: 'rosewood6', name: 'Rosewood Six', cond: 'Level 25 · reach level 25', ach: 'level25', blurb: '6 rosewood points · pearl windows', rarity: 'rare', bars: [[4, 7, 5, 6], [6, 10, 6, 8]], need: ['pool', 'hard', [5, 8, 12, 17]],
            sections: pqStd('maple', 'silver', 'maple', 'stitchBlk', 'rosewood'), rings: [[72, 0.8, 'silver'], [90, 0.8, 'silver']],
            points: [pqPts(6, 53, 0.82, 'rosewood', [['#121212', 0.5], ['#2C6E49', 0.5], ['#F2EEE4', 0.5]], { inlay: { shape: 'window', mat: 'pearl', size: 9, at: 0.4 } })],
            inlays: [pqIn(94.5, 6, 'dot', 5, 'pearl')] },
        { id: 'carbonfin', name: 'Carbon Fin', cond: 'Pool Shark · win 100 pool games against the CPU', ach: 'poolShark', blurb: 'Carbon · chrome fins · cyan neon', rarity: 'epic', bars: [[6, 5, 7, 5], [9, 7, 10, 7]], need: ['pool', 'hard', [5, 9, 13, 18]],
            sections: pqStd('carbon', 'chrome', 'carbon', 'circuit', 'carbon', 'chrome'), rings: [[72, 1.6, 'neonCyan'], [90, 1, 'chrome'], [98.5, 1, 'chrome']],
            points: [pqPts(4, 54, 0.62, 'chrome', [['#0A0B0C', 0.6]])], inlays: [pqIn(94.5, 4, 'diamond', 8, 'chrome', 45)],
            sheen: { c: ['#EFFCFF', '#7FE3F5'], s: 9, band: 4, on: 'joint rings points inlays' } },
        { id: 'malachite', name: 'Malachite', cond: 'Called It · beat the Pro pool CPU', ach: 'calledIt', blurb: 'Malachite · gold · turquoise', rarity: 'epic', bars: [[5, 7, 6, 5], [7, 9, 9, 8]], need: ['pool', 'hard', [5, 9, 13, 18]],
            sections: pqStd('maple', 'goldPol', 'malachite', 'lizardBlk', 'malachite'), rings: [[72, 1.2, 'goldPol'], [90, 1.2, 'goldPol'], [98.5, 1, 'goldPol']],
            points: [pqPts(4, 54, 0.55, 'ebony', [['goldPol', 0.6]], { rot: 45, inlay: { shape: 'window', mat: 'turquoise', size: 9, at: 0.42 } })],
            inlays: [pqIn(94.5, 4, 'window', 10, 'turquoise')], sheen: { c: ['#FFF9E2', '#8FE3B8'], s: 9, band: 4, on: 'joint rings windows inlays' } },
        { id: 'centuryash', name: 'Century Ash', cond: 'Century · make a century break against the snooker CPU', ach: 'snookerCentury', blurb: 'Ash · gold and abalone splices', rarity: 'epic', bars: [[5, 8, 5, 6], [8, 10, 8, 8]], need: ['snooker', 'hard', [5, 9, 14, 19]],
            sections: [[0, 0.9, 'tipBrown'], [0.9, 2.5, 'brassFerr'], [2.5, 70, 'ash'], [70, 99, 'ebony'], [99, 100, 'rubber']],
            rings: [[70, 2.4, 'abalone'], [76, 1, 'goldPol'], [98.5, 1, 'goldPol']],
            points: [pqPts(4, 40, 0.92, 'ebony', [['goldPol', 0.6], ['#121212', 0.4]], { base: 70 }), pqPts(4, 61, 0.6, 'abalone', [['goldPol', 0.5]], { base: 70, rot: 45 })],
            inlays: [pqIn(95, 4, 'window', 10, 'abalone')], sheen: { c: ['#FFFBEF', '#DCC48C'], s: 9, band: 4, on: 'rings points inlays' } },
        { id: 'crown', name: 'Black Crown', cond: 'Maximum · make a 147 against the snooker CPU', ach: 'snookerMaximum', blurb: 'Gold filigree · dragon-scale wrap', rarity: 'legendary', bars: [[7, 7, 6, 6], [10, 10, 9, 8]], need: ['snooker', 'pro', [5, 10, 14, 19]],
            sections: pqStd('lacquer', 'goldPol', 'filigree', 'dragon', 'filigree', 'brassFerr'), rings: [[51.5, 1.2, 'goldPol'], [72, 1.6, 'goldPol'], [90, 1.6, 'goldPol'], [98.5, 1.2, 'goldPol']],
            points: [pqPts(6, 56, 0.7, 'goldPol', [['goldPol', 0.4], ['#050506', 0.9]], { inlay: { shape: 'window', mat: 'pearl', size: 7, at: 0.3 } })],
            inlays: [pqIn(94.5, 6, 'diamond', 8, 'goldPol')], sheen: { c: ['#FFF6DE', '#E9C46A'], s: 7, band: 6, on: 'joint rings points windows inlays' } },
        { id: 'collector', name: 'Collector', cond: 'Master 5 cues', blurb: 'Galaxy · holo shaft · neon points', rarity: 'legendary', bars: [[8, 7, 7, 6], [10, 10, 10, 10]], need: ['snooker', 'pro', [5, 10, 15, 20]],
            sections: pqStd('holo', 'chrome', 'galaxy', 'anodViolet', 'galaxy', 'chrome'), rings: [[51.5, 1.4, 'neonMagenta'], [72, 1.6, 'neonCyan'], [90, 1.6, 'neonMagenta'], [98.5, 1, 'chrome']],
            points: [pqPts(2, 55, 0.5, 'neonMagenta', [['chrome', 0.6]], { rot: -45 }), pqPts(2, 55, 0.5, 'neonCyan', [['chrome', 0.6]], { rot: 45 })],
            inlays: [pqIn(94.5, 4, 'diamond', 8, 'neonCyan', 45)], sheen: { c: ['#FFFFFF', '#FF7AD9', '#6FE6FF'], s: 6, band: 8, on: 'joint shaft forearm butt rings points inlays' } },
    ];
    // Rarity, as 8 Ball Pool's collection shows it: [label, the fewest and most bar points a
    // mastered cue totals, the lowest bar it keeps]. Its Legendary cues max at 37–40 of 40 (Inferno
    // 10/10/9/8, Excalibur 10/10/10/10), Epic at about 34 (Gengis Khan 9/8/9/8), Rare at about 30.
    const PQ_RARITY = { common: ['Common', 20, 24, 5], rare: ['Rare', 28, 30, 6], epic: ['Epic', 32, 34, 7], legendary: ['Legendary', 36, 40, 8] };
    const pqById = id => PQ_SET.find(q => q.id === id) || PQ_SET[0];
    // [length, tip, butt] in ball diameters, and the ball in mm.
    const PQ_GAME = { pool: [25.7, 0.23, 0.52, 57], snooker: [27.6, 0.19, 0.55, 52.5] };
    // Diameter (D) at s = 0..1 from the tip: level through tip and ferrule, a 1.25-power taper,
    // and the bumper at 92 % of the butt.
    function pqDia(G, s) {
        if (s <= 0.025) return G[1];
        if (s >= 0.99) return G[2] * 0.92;
        return G[1] + (G[2] - G[1]) * Math.pow((s - 0.025) / 0.965, 1.25);
    }

    // ── Stats and mastery ─────────────────────────────────────────────
    // Wins against the CPU with a cue raise it a level, but only wins at its tier or above, and
    // for a snooker cue only snooker's (pool cues take snooker wins too: the harder game).
    const PQ_TIERS = ['easy', 'normal', 'hard', 'pro'];
    const pqSteps = q => q.need[2].reduce((out, n) => out.concat(out[out.length - 1] + n), [0]);
    const pqLevel = (wins, q) => pqSteps(q).filter(n => (wins || 0) >= n).length;
    const pqCounts = (q, game, tier) => PQ_TIERS.indexOf(tier) >= PQ_TIERS.indexOf(q.need[1]) && (q.need[0] === 'pool' || game === 'snooker');
    // "Hard+ wins", "Pro snooker wins", or "CPU wins" when any counts.
    function pqNeedText(q) {
        const t = q.need[1], T = t.charAt(0).toUpperCase() + t.slice(1) + (t === 'pro' ? '' : '+');
        return q.need[0] === 'snooker' ? T + ' snooker wins' : t === 'easy' ? 'CPU wins' : T + ' wins';
    }
    // Each bar above or below 4 moves its stat a step: Standard (4/4/4/4) is the game as it was.
    // Steps felt at every level (the user, 2026-10-27: 2.5 % power a bar went unnoticed): +5 % top
    // speed, +12.5 % guideline (half a ball, the cue ball's path too), +7 % spin reach, +10 % shot
    // clock. A 10 is +30 % power, +75 % aim, +42 % spin, +60 % time.
    const PQ_STEP = [0.05, 0.125, 0.07, 0.1];
    // What a level adds, from bars a to bars b: "+5% power · +0.5 ball guideline". The guideline is
    // 4 ball diameters at aim 4 (POOL_GUIDE_FULL).
    const PQ_GAIN = [n => '+' + Math.round(n * PQ_STEP[0] * 100) + '% power', n => '+' + n * PQ_STEP[1] * 4 + ' ball guideline',
        n => '+' + Math.round(n * PQ_STEP[2] * 100) + '% spin', n => '+' + Math.round(n * PQ_STEP[3] * 100) + '% shot clock'];
    const pqGains = (a, b) => [0, 1, 2, 3].filter(i => b[i] > a[i]).map(i => PQ_GAIN[i](b[i] - a[i])).join(' · ');
    // Every level-up adds at least one bar point. (Rounding the straight line from level 1 to 5
    // lost some: a bar gaining 1 moved only at level 3.) The cue's gains are dealt out one at a
    // time, round-robin, its biggest first; level n has round(total × (n − 1) / 4) of them.
    function pqStats(id, wins, level) {
        const q = pqById(id), lv = level || pqLevel(wins, q), bars = q.bars[0].slice();
        const left = q.bars[1].map((v, i) => Math.max(0, v - bars[i])), total = left.reduce((a, b) => a + b, 0);
        const order = [0, 1, 2, 3].sort((a, b) => left[b] - left[a] || a - b), steps = [];
        while (steps.length < total) order.forEach(i => { if (left[i] > 0) { left[i]--; steps.push(i); } });
        steps.slice(0, Math.round(total * (lv - 1) / 4)).forEach(i => { bars[i]++; });
        const m = bars.map((b, i) => 1 + PQ_STEP[i] * (b - 4));
        return { id: q.id, level: lv, bars, power: m[0], aim: m[1], spin: m[2], time: m[3] };
    }
    // The CPU's cue for its tier (the user, 2026-10-05): only power and spin change its play.
    const PQ_CPU = { easy: ['standard', 1], normal: ['tulipwood', 3], hard: ['malachite', 3], pro: ['crown', 5] };
    const pqCpuStats = (tier, game) => {
        const c = tier === 'hard' && game === 'snooker' ? ['centuryash', 3] : PQ_CPU[tier] || PQ_CPU.easy;
        return pqStats(c[0], 0, c[1]);
    };
    const pqMastered = rec => PQ_SET.filter(q => q.id !== 'collector' && pqLevel(rec && rec[q.id], q) >= 5).length;
    // Achievements unlock the designed cues; mastering five unlocks Collector.
    const pqUnlocked = (q, achievements, rec) => (q.ach ? (achievements || []).indexOf(q.ach) >= 0 : q.id !== 'collector' || pqMastered(rec) >= 5);

    // ── The renderer ──────────────────────────────────────────────────
    // A 10-sided rod lit from above: five facets face the viewer. Their edges across the rod's
    // width, and their normals from the viewer toward +w.
    const PQ_EDGES = [0, 0.095, 0.345, 0.655, 0.905, 1];
    const PQ_FACETS = [72, 36, 0, -36, -72].map(d => d * Math.PI / 180);
    const PQ_TILES = new Map();
    const pqMix = (a, b, t) => {
        const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
        return '#' + [16, 8, 0].map(s => { const x = (p >> s) & 255; return Math.round(x + (((q >> s) & 255) - x) * t).toString(16).padStart(2, '0'); }).join('');
    };

    // Mirror metal and neon: their own stops across the rod, edge to edge, instead of a texture
    // and the facet shading (the design's mirror and neon fills).
    const PQ_OWN = {
        mirror: T => [[0, T.c3], [0.09, T.c2], [0.17, T.c2], [0.26, T.c3], [0.42, T.c], [0.53, T.c], [0.64, T.c3], [0.76, pqMix(T.c3, T.c2, 0.65)], [0.85, T.c3], [1, T.c]],
        neon: T => [[0, T.edge], [0.2, T.c], [0.37, pqMix(T.c, T.core, 0.6)], [0.45, T.core], [0.55, T.core], [0.63, pqMix(T.c, T.core, 0.6)], [0.8, T.c], [1, T.edge]],
    };

    // A texture's repeating tile, once per material and scale: x along the rod, y across it.
    function pqTile(key, m, q, mk) {
        const id = key + '@' + q;
        if (PQ_TILES.has(id)) return PQ_TILES.get(id);
        const T = m[5], rows = Math.max(1, Math.ceil(6 / (T.s || 6)));
        const size = {
            grain: [24, T.s * rows], ash: [T.s, 8], linen: [T.p, T.p], pebble: [T.size, T.size], lizard: [T.size * 1.2, T.size], stitched: [T.s, 11],
            carbon: [T.cell * 2.83, T.cell * 2.83], bands: [T.s * 8, T.s * 4], pearl: [12, 1], brushed: [T.s, T.p], filigree: [T.size, T.size],
            scales: [T.size * 0.62, T.size], circuit: [T.cell * 12, 24], holo: [T.s, T.s], galaxy: [T.s * 2, 24], magma: [T.s * 2, T.s * 1.5],
        }[T.t === 'stripe' ? 'grain' : T.t];
        const W = Math.max(2, Math.round(size[0] * q)), H = Math.max(2, Math.round(size[1] * q));
        const cv = mk(W, H), c = cv.getContext('2d'), tw = size[0], th = size[1];
        c.scale(W / tw, H / th);
        c.fillStyle = m[0]; c.fillRect(0, 0, tw, th);
        const rgba = (a, hex) => pgRgba(hex || T.c, a);
        const dot = (x, y, r, style) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = style; c.fill(); };
        // A soft round light fading out from its centre, repeated either side so the tile wraps.
        const glow = (x, y, r, stops) => [-tw, 0, tw].forEach(o => {
            const g = c.createRadialGradient(x + o, y, 0, x + o, y, r);
            stops.forEach(s => g.addColorStop(s[0], s[1]));
            dot(x + o, y, r, g);
        });
        const line = (pts, lw, style) => {
            c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0] * tw, p[1] * th) : c.moveTo(p[0] * tw, p[1] * th)));
            c.lineWidth = lw; c.strokeStyle = style; c.stroke();
        };
        // Bands where (x ∓ y) mod L lies in [L/2, L), for twills and weaves.
        const diag = (L, flip, style) => {
            c.fillStyle = style; c.beginPath();
            for (let k = -2; k <= 2; k++) {
                const d1 = k * L + L / 2, d2 = d1 + L / 2, Y = y => (flip ? th - y : y);
                c.moveTo(d1 - L * 3, Y(-L * 3)); c.lineTo(d1 + L * 3, Y(L * 3)); c.lineTo(d2 + L * 3, Y(L * 3)); c.lineTo(d2 - L * 3, Y(-L * 3)); c.closePath();
            }
            c.fill();
        };
        const wave = (y, amp, ph, lw, style) => {
            c.beginPath();
            for (let x = 0; x <= tw + 0.01; x += tw / 24) { const yy = y + amp * Math.sin(2 * Math.PI * x / tw + ph); x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
            c.lineWidth = lw; c.strokeStyle = style; c.stroke();
        };
        const t = T.t;
        if (t === 'grain' || t === 'stripe') {
            const a = t === 'stripe' ? 0.8 : 0.5;
            for (let i = 0; i < rows; i++) {
                [-th, 0, th].forEach(o => {
                    wave(o + (i + 0.3) * T.s, T.wave * 0.35, i * 1.7, T.w, rgba(a));
                    wave(o + (i + 0.8) * T.s, T.wave * 0.25, i * 2.3 + 1, T.w * 0.7, rgba(a * 0.6));
                });
            }
            if (T.eye) for (let i = 0; i < 4; i++) dot((i * 0.27 + (i % 2) * 0.5) % 1 * tw, (i + 0.5) / 4 * th, T.eyeR, rgba(0.85, T.eye));
        } else if (t === 'ash') {
            const d = th / 2 * Math.tan(T.ang * Math.PI / 180);
            [-tw, 0, tw].forEach(o => { c.beginPath(); c.moveTo(o, 0); c.lineTo(o + d, th / 2); c.lineTo(o, th); c.lineWidth = T.w; c.strokeStyle = rgba(0.55); c.stroke(); });
        } else if (t === 'linen') {
            diag(tw, false, rgba(0.5)); diag(tw, true, rgba(0.35));
        } else if (t === 'pebble') {
            dot(tw / 2, th / 2, tw * 0.3, rgba(0.65)); dot(tw * 0.35, th * 0.35, tw * 0.18, 'rgba(255, 255, 255, 0.16)');
        } else if (t === 'lizard') {
            [[tw / 2, 0], [0, th / 2], [tw, th / 2], [tw / 2, th]].forEach(([x, y]) => {
                c.beginPath(); c.ellipse(x, y, tw * 0.42, th * 0.4, 0, 0, Math.PI); c.lineWidth = th * 0.12; c.strokeStyle = rgba(0.75); c.stroke();
            });
        } else if (t === 'stitched') {
            c.fillStyle = rgba(0.9); c.fillRect(tw * 0.45, 3, tw * 0.55, 0.5); c.fillRect(tw * 0.45, 8, tw * 0.55, 0.5);
        } else if (t === 'carbon') {
            c.fillStyle = T.c; c.fillRect(0, 0, tw, th); diag(tw, false, T.c2); diag(tw, true, 'rgba(0, 0, 0, 0.28)');
        } else if (t === 'bands') {
            for (let i = 0; i < 4; i++) [-th, 0, th].forEach(o => wave(o + (i + 0.5) * T.s, T.s * 0.4, i, T.s * 0.5, rgba(0.7)));
        } else if (t === 'pearl' || t === 'holo') {
            const g = c.createLinearGradient(0, 0, tw, 0), cs = t === 'holo' ? [T.c, T.c3, T.c2, T.c4, T.c] : [T.c, T.c2, T.c3, T.c];
            cs.forEach((col, i) => g.addColorStop(t === 'holo' ? i / 4 : [0, 0.35, 0.65, 1][i], col));
            c.fillStyle = g; c.fillRect(0, 0, tw, th);
            // Holo's diffraction lines, a third of the tile apart so they wrap.
            if (t === 'holo') for (let x = -tw; x <= tw; x += tw / 3) line([[x / tw, 0], [x / tw + 1, 1]], tw * 0.04, 'rgba(255, 255, 255, 0.3)');
        } else if (t === 'brushed') {
            // Fine lines along the rod, and a broad soft highlight.
            c.fillStyle = rgba(0.24); c.fillRect(0, 0, tw, th / 2);
            const g = c.createLinearGradient(0, 0, tw, 0);
            [[0, 0], [0.5, 0.16], [1, 0]].forEach(s => g.addColorStop(s[0], 'rgba(255, 255, 255, ' + s[1] + ')'));
            c.fillStyle = g; c.fillRect(0, 0, tw, th);
        } else if (t === 'filigree') {
            // Interlocking rings with a small ring and a dot at each rosette.
            c.lineWidth = T.w; c.strokeStyle = rgba(0.95);
            [[0.5, 0.5, 0.2], [0.5, 0.5, 0.5], [0, 0, 0.5], [1, 0, 0.5], [0, 1, 0.5], [1, 1, 0.5]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * tw, y * th, r * tw - T.w / 2, 0, Math.PI * 2); c.stroke(); });
            [0, tw].forEach(x => dot(x, th / 2, tw * 0.07, rgba(0.95)));
        } else if (t === 'scales') {
            // Overlapping scales, convex toward the butt: gold rim, a warm sheen inside, rows half offset.
            [[tw / 2, 0], [tw / 2, th], [0, th / 2], [tw, th / 2]].forEach(([x, y]) => {
                const g = c.createRadialGradient(x, y, 0, x, y, th / 2);
                [[0.44, rgba(0, T.c2)], [0.76, rgba(0.45, T.c2)], [0.9, rgba(0.95)], [1, rgba(0.95)]].forEach(s => g.addColorStop(s[0], s[1]));
                dot(x, y, th / 2, g);
            });
        } else if (t === 'circuit') {
            // Trace rows at 28 % and 72 %, a link between them every 6 cells, pads every 3, a seam per tile.
            const C = T.cell, w = 0.32, y1 = th * 0.28, y2 = th * 0.72;
            c.fillStyle = rgba(0.8);
            for (let x = -6 * C; x < tw; x += 6 * C) { c.fillRect(x - 0.5 * C, y1 - w / 2, 4.5 * C, w); c.fillRect(x + 2.5 * C, y2 - w / 2, 4.5 * C, w); c.fillRect(x + 1.5 * C - w / 2, y1, w, y2 - y1); }
            for (let x = 1.5 * C; x < tw; x += 3 * C) { dot(x, y1, 0.55, T.pad); dot(x, y2, 0.55, T.pad); }
            c.fillStyle = T.seam; c.fillRect(0, 0, 0.3, th);
        } else if (t === 'galaxy') {
            // Two nebulae and stars of three sizes.
            [[0.25, 0.4, T.c, 0.62], [0.75, 0.62, T.c2, 0.5]].forEach(([x, y, col, a]) => glow(x * tw, y * th, th * 0.45, [[0, pgRgba(col, a)], [1, pgRgba(col, 0)]]));
            for (let i = 0; i < 24; i++) dot((i * 0.618) % 1 * tw, (i * 0.382 + 0.1) % 1 * th, 0.12 + (i % 3) * 0.08, rgba(0.6 + (i % 3) * 0.2, T.star));
        } else if (t === 'magma') {
            // Dark crust, molten pools, and glowing cracks that meet across the tile's edges.
            glow(0.3 * tw, 0.35 * th, T.s * 0.62, [[0, rgba(0.95, T.core)], [0.35, rgba(0.8)], [1, rgba(0)]]);
            glow(0.78 * tw, 0.78 * th, T.s * 0.5, [[0, rgba(0.6)], [1, rgba(0)]]);
            [[[0, 0.3], [0.2, 0.45], [0.45, 0.2], [0.7, 0.5], [1, 0.3]], [[0.6, 0], [0.55, 0.3], [0.8, 0.6], [0.6, 1]]].forEach(p => { line(p, 0.9, rgba(0.9)); line(p, 0.3, T.core); });
        }
        const tile = { cv, sx: tw / W, sy: th / H };
        PQ_TILES.set(id, tile);
        return tile;
    }

    // Draws a cue. V maps it to the screen:
    //   pt(s, w)    the rod's point at s (0 tip … 1 butt), w ball diameters to the side
    //   scr(p)      that point on screen as [x, y], or null; poly(pts) a polygon to screen points
    //   light       [toward the viewer, toward +w]: where the light sits in the cross-section
    //   t           ms, for the sheen (null: none); mk(w, h) a canvas, for textures (else flat)
    function pqDraw(ctx, cue, game, V) {
        const G = PQ_GAME[game] || PQ_GAME.pool, Lmm = G[0] * G[3];
        const r = s => pqDia(G, s) / 2;
        const lam = Math.atan2(V.light[1], V.light[0]);
        const M = k => PQ_MATS[k] || [k, k, k];
        const trace = pts => {
            const p = V.poly(pts);
            if (p.length < 3) return false;
            ctx.beginPath(); pgTrace(ctx, p);
            return true;
        };
        // The rod's frame at s on screen: the side (+w) edge, the far edge, and px per mm.
        const frame = s => {
            const a = V.scr(V.pt(s, r(s))), b = V.scr(V.pt(s, -r(s)));
            return a && b ? { a, b, px: Math.hypot(b[0] - a[0], b[1] - a[1]) } : null;
        };
        const pattern = (key, m, f, s) => {
            if (!f || !m[5] || PQ_OWN[m[5].t] || f.px < m[4] || !V.mk || !ctx.createPattern) return null;
            const k = f.px / (2 * r(s) * G[3]), q = Math.min(16, Math.max(2, Math.pow(2, Math.ceil(Math.log2(k)))));
            const tile = pqTile(key, m, q, V.mk), pat = ctx.createPattern(tile.cv, 'repeat');
            const o = V.scr(V.pt(s, 0)), o2 = V.scr(V.pt(Math.min(1, s + 0.01), 0));
            if (!pat || !o || !o2 || typeof DOMMatrix !== 'function') return pat;
            const ax = o2[0] - o[0], ay = o2[1] - o[1], al = Math.hypot(ax, ay) || 1;
            const ex = [ax / al, ay / al], ey = [(f.b[0] - f.a[0]) / f.px, (f.b[1] - f.a[1]) / f.px];
            pat.setTransform(new DOMMatrix([ex[0] * k * tile.sx, ex[1] * k * tile.sx, ey[0] * k * tile.sy, ey[1] * k * tile.sy, f.a[0], f.a[1]]));
            return pat;
        };
        // Material at s, turned c (cos) toward the viewer: its texture, else its flat colour.
        const paint = (key, f, s, c) => {
            const m = M(key);
            return pattern(key, m, f, s) || pqMix(m[3] || m[0], m[1], Math.max(0, 1 - c) * 0.55);
        };
        const shade = (m, f, textured) => {
            const g = ctx.createLinearGradient(f.a[0], f.a[1], f.b[0], f.b[1]);
            PQ_FACETS.forEach((n, i) => {
                const c = Math.cos(n - lam), hi = c >= 0.6, a = Math.min(1, hi ? (c - 0.6) / 0.4 : (0.6 - c) / 1.1) * (textured ? 0.6 : 1);
                const col = pgRgba(hi ? m[2] : m[1], Math.round(a * 1000) / 1000);
                g.addColorStop(PQ_EDGES[i] + (i ? 0.01 : 0), col);
                g.addColorStop(PQ_EDGES[i + 1] - (i < 4 ? 0.01 : 0), col);
            });
            return g;
        };
        // The cue's sheen: one band along the parts it names, moving for 72 % of each cycle;
        // Epic's at three quarters of Legendary's strength.
        const SH = cue.sheen, glint = p => !!SH && SH.on.split(' ').indexOf(p) >= 0;
        let band = null;
        if (SH && V.t != null) {
            const T = SH.s * 1000, p = (V.t % T) / T, w = SH.band / 100;
            if (p < 0.72) { const e = p / 0.72, x = -w + (1 + w) * e * e * (3 - 2 * e); band = [x, x + w]; }
        }
        const sheen = (a, b, on) => {
            if (!on || !band || b < band[0] || a > band[1]) return;
            const p = V.scr(V.pt(band[0], 0)), q = V.scr(V.pt(band[1], 0));
            if (!p || !q) return;
            const g = ctx.createLinearGradient(p[0], p[1], q[0], q[1]), k = cue.rarity === 'legendary' ? 1 : 0.75, f2 = SH.c[2] || SH.c[1];
            [[0, SH.c[1], 0], [0.3, SH.c[1], 0.4], [0.5, SH.c[0], 0.92], [0.7, f2, 0.4], [1, f2, 0]].forEach(st => g.addColorStop(st[0], pgRgba(st[1], st[2] * k)));
            ctx.fillStyle = g; ctx.fill();
        };
        // A stretch of rod, a dome on the tip and a bumper on the butt, its taper in short steps.
        const part = (a, b, key, glint) => {
            a = Math.max(0, a); b = Math.min(1, b);
            if (b <= a) return;
            const top = [], bot = [], n = Math.ceil((b - a) / 0.15);
            for (let i = 0; i <= n; i++) { const s = a + (b - a) * i / n; top.push(V.pt(s, r(s))); bot.unshift(V.pt(s, -r(s))); }
            const cap = (s, len, dir) => { const out = []; for (let i = 1; i < 6; i++) { const th = Math.PI * i / 6; out.push(V.pt(s + dir * len * Math.sin(th), r(s) * Math.cos(th))); } return out; };
            const pts = top.concat(b >= 1 ? cap(1, 0.45 * r(1) / G[0], 1) : [], bot, a <= 0 ? cap(0, 0.03 / G[0], -1).reverse() : []);
            if (!trace(pts)) return;
            const m = M(key), s = (a + b) / 2, f = frame(s), own = f && m[5] && f.px >= m[4] && PQ_OWN[m[5].t];
            if (own) {
                const g = ctx.createLinearGradient(f.a[0], f.a[1], f.b[0], f.b[1]);
                own(m[5]).forEach(st => g.addColorStop(st[0], st[1]));
                ctx.fillStyle = g; ctx.fill();
            } else {
                const pat = pattern(key, m, f, s);
                ctx.fillStyle = pat || m[3] || m[0]; ctx.fill();
                if (f) { ctx.fillStyle = shade(m, f, !!pat); ctx.fill(); }
            }
            sheen(a, b, glint);
        };
        // A small shape on the rod's surface: centre (s, w), half sizes along (mm) and across (D).
        const inlay = (shape, s, w, hl, hw, key, c, on) => {
            const d = hl / Lmm, k = shape === 'diamond' ? [[-1, 0], [0, 1], [1, 0], [0, -1]]
                : shape === 'dot' ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]) : [[-1, -1], [-1, 1], [1, 1], [1, -1]];
            if (!trace(k.map(p => V.pt(s + p[0] * d, w + p[1] * hw)))) return;
            ctx.fillStyle = paint(key, frame(s), s, c); ctx.fill();
            sheen(s - d, s + d, on);
        };
        (cue.sections || []).forEach(x => part(x[0] / 100, x[1] / 100, x[2], glint(x[3])));
        (cue.rings || []).forEach(x => { const h = x[1] / 2 / Lmm; part(x[0] / 100 - h, x[0] / 100 + h, x[2], glint('rings')); });
        (cue.points || []).forEach(P => {
            const aS = P.apex / 100, bS = P.base / 100, rB = r(bS);
            let e = P.veneers.reduce((t, v) => t + v[1], 0);
            const layers = P.veneers.map(v => { const l = { col: v[0], e }; e -= v[1]; return l; }).concat([{ col: P.core, e: 0 }]);
            for (let i = 0; i < P.n; i++) {
                const th = (P.rot + i * 360 / P.n) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
                if (c < 0.08) continue;
                layers.forEach(ly => {
                    const hw = ((Math.PI * rB * G[3] / P.n) * P.w + ly.e) / G[3] * c, ap = aS - ly.e * 4 / Lmm, wc = sn * rB;
                    if (!trace([V.pt(ap, sn * r(ap)), V.pt(bS, Math.min(rB, wc + hw)), V.pt(bS, Math.max(-rB, wc - hw))])) return;
                    ctx.fillStyle = ly.col.charAt(0) === '#' ? ly.col : paint(ly.col, frame((ap + bS) / 2), (ap + bS) / 2, c); ctx.fill();
                    sheen(ap, bS, glint('points'));
                });
                if (P.inlay) {
                    const N = P.inlay, s = bS - (bS - aS) * N.at;
                    inlay(N.shape, s, sn * r(s), N.size / 2, N.size * (N.shape === 'window' ? 0.2 : 0.3) * c / G[3], N.mat, c, glint('windows'));
                }
            }
        });
        (cue.inlays || []).forEach(N => {
            const s = N.at / 100;
            for (let i = 0; i < N.n; i++) {
                const th = (N.rot + i * 360 / N.n) * Math.PI / 180, c = Math.cos(th);
                if (c >= 0.1) inlay(N.shape, s, Math.sin(th) * r(s), N.size / 2, N.size * (N.shape === 'diamond' ? 0.35 : N.shape === 'window' ? 0.2 : 0.5) * c / G[3], N.mat, c, glint('inlays'));
            }
        });
    }

    // A cue drawn flat and side on, as the picker shows it: x0..x0 + len px across, centred on cy,
    // or only the stretch from..to (0..1) blown up to fill len.
    function pqDrawFlat(ctx, cue, game, x0, cy, len, from, to, t, mk) {
        const G = PQ_GAME[game] || PQ_GAME.pool, f = from || 0, span = (to == null ? 1 : to) - f, k = len / span, D = k / G[0];
        ctx.save();
        ctx.beginPath(); ctx.rect(x0 - 2, cy - D, len + 4, 2 * D); ctx.clip();
        pqDraw(ctx, cue, game, {
            pt: (s, w) => [x0 + (s - f) * k, cy - w * D], scr: p => p, poly: p => p, light: [0.62, 0.78], t, mk,
        });
        ctx.restore();
    }
