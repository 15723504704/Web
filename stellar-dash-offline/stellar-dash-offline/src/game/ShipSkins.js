/*
 * ShipSkins - 飞船皮肤系统（高细节硬表面战机 / 12 款独立造型）
 *
 * 设计思路：
 * - 舰体使用「截面放样」生成真正的流线型硬表面，而不是平面挤压片；
 * - 机翼使用翼型放样（前缘圆滑、后缘收薄、翼尖渐缩），并带前缘光条；
 * - 统一细节层：装甲分色、面板线、进气口、机械碎件、导弹挂架、翼尖航行灯；
 * - 引擎尾焰改为带渐隐贴图的软焰，避免“实心霓虹光柱”；
 * - 所有材质预创建，运行时只切换 group.visible，不重建 GPU 资源。
 *
 * 造型约束：
 * - 左右部件独立构建（几何镜像 + 索引翻转），严禁 scale.x = -1；
 * - 每款造型整体 scale 0.72，保持碰撞半径一致。
 */
(function(global) {
  'use strict';

  const SHIP_SCALE = 0.72; // 飞船整体缩小到约 72%

  // ============== 皮肤定义 ==============
  const SKIN_DEFS = [
    {
      id: 'azure',
      name: '苍穹之刃',
      desc: '标准配置，白蓝涂装的迅捷战机',
      unlocked: true,
      shape: 'azure',
      colors: {
        primary: 0xe8f4ff,
        secondary: 0x3a7bd5,
        dark: 0x1a3a6b,
        glow: 0x00d4ff,
        accent: 0xff6a2a,
        cockpit: 0x66ddff,
        trail: 0x00e5ff,
        trailCore: 0xffffff,
        engine: 0xff8833,
        engineGlow: 0x00d4ff
      }
    },
    {
      id: 'crimson',
      name: '赤焰战鹰',
      desc: '赤红涂装的重型突击机型，累计得分达 5000 解锁',
      unlockType: 'score',
      unlockValue: 5000,
      shape: 'crimson',
      colors: {
        primary: 0x3d0f0f,
        secondary: 0xcc2200,
        dark: 0x1a0505,
        glow: 0xff4400,
        accent: 0xffcc00,
        cockpit: 0xff7744,
        trail: 0xff5500,
        trailCore: 0xffee88,
        engine: 0xff2200,
        engineGlow: 0xffaa00
      }
    },
    {
      id: 'violet',
      name: '紫电魅影',
      desc: '紫色电光涂装的隐秘侦察机，击败首个 Boss 解锁',
      unlockType: 'bossKills',
      unlockValue: 1,
      shape: 'violet',
      colors: {
        primary: 0x2a1a4a,
        secondary: 0x7733cc,
        dark: 0x150828,
        glow: 0xbb33ff,
        accent: 0x00ffee,
        cockpit: 0xcc88ff,
        trail: 0x9933ff,
        trailCore: 0xeeccff,
        engine: 0x6600cc,
        engineGlow: 0xaa00ff
      }
    },
    {
      id: 'golden',
      name: '黄金圣骑',
      desc: '传说级金色涂装，累计击败 5 个 Boss 解锁',
      unlockType: 'bossKills',
      unlockValue: 5,
      shape: 'golden',
      colors: {
        primary: 0x5c4810,
        secondary: 0xffcc33,
        dark: 0x3a2a05,
        glow: 0xffdd00,
        accent: 0xffffff,
        cockpit: 0xffeeaa,
        trail: 0xffcc00,
        trailCore: 0xffffcc,
        engine: 0xffaa00,
        engineGlow: 0xffdd44
      }
    },
    {
      id: 'frost',
      name: '寒霜之翼',
      desc: '冰蓝涂装的细长飞镖型战机，累计飞行 5 分钟解锁',
      unlockType: 'flightDistance',
      unlockValue: 300,
      shape: 'frost',
      colors: {
        primary: 0xe0f0ff,
        secondary: 0x66bbee,
        dark: 0x205088,
        glow: 0x88eeff,
        accent: 0xaaeeff,
        cockpit: 0xbbeeff,
        trail: 0x99ddff,
        trailCore: 0xeeffff,
        engine: 0x55aadd,
        engineGlow: 0xaaffff
      }
    },
    {
      id: 'shadow',
      name: '幽影之刺',
      desc: '墨黑涂装的隐身无人机，累计击毁 200 个障碍物解锁',
      unlockType: 'totalDestroyed',
      unlockValue: 200,
      shape: 'shadow',
      colors: {
        primary: 0x1a1a1a,
        secondary: 0x333333,
        dark: 0x0a0a0a,
        glow: 0x00ff66,
        accent: 0x33ff99,
        cockpit: 0x66ffaa,
        trail: 0x22ff77,
        trailCore: 0xccffdd,
        engine: 0x114422,
        engineGlow: 0x00ff66
      }
    },
    {
      id: 'orion',
      name: '猎户座巡航者',
      desc: '银黑双尾撑经典战机，累计击败 3 个 Boss 解锁',
      unlockType: 'bossKills',
      unlockValue: 3,
      shape: 'orion',
      colors: {
        primary: 0xaabbcc,
        secondary: 0x446688,
        dark: 0x223344,
        glow: 0x33ccdd,
        accent: 0xffaa33,
        cockpit: 0x88ddee,
        trail: 0x44ddff,
        trailCore: 0xddeeff,
        engine: 0x225566,
        engineGlow: 0x33ccdd
      }
    },
    {
      id: 'fireball',
      name: '火流星',
      desc: '橙黄暖色的复古碟形战机，累计得分达 20000 解锁',
      unlockType: 'score',
      unlockValue: 20000,
      shape: 'fireball',
      colors: {
        primary: 0xff9933,
        secondary: 0xff6600,
        dark: 0xaa3300,
        glow: 0xffdd00,
        accent: 0xffff88,
        cockpit: 0xffee88,
        trail: 0xffaa00,
        trailCore: 0xffffcc,
        engine: 0xff4400,
        engineGlow: 0xffdd00
      }
    },
    {
      id: 'ringblade',
      name: '环刃武士',
      desc: '环形机翼环绕机身的环形翼战机，累计收集 60 个道具解锁',
      unlockType: 'totalPowerUps',
      unlockValue: 60,
      shape: 'ringblade',
      colors: {
        primary: 0xe0f8ff,
        secondary: 0x33aacc,
        dark: 0x1a5577,
        glow: 0x00ddff,
        accent: 0xaaffff,
        cockpit: 0x88eefc,
        trail: 0x44ddff,
        trailCore: 0xccffff,
        engine: 0x2288aa,
        engineGlow: 0x00ddff
      }
    },
    {
      id: 'armor',
      name: '装甲巨像',
      desc: '厚重六边形装甲舰体的重装方舟，累计护盾抵挡 30 次解锁',
      unlockType: 'totalShieldBlocks',
      unlockValue: 30,
      shape: 'armor',
      colors: {
        primary: 0xa0a8b0,
        secondary: 0x445566,
        dark: 0x1a2233,
        glow: 0x3366cc,
        accent: 0x6688aa,
        cockpit: 0x88aacc,
        trail: 0x5577cc,
        trailCore: 0xaabbdd,
        engine: 0x223344,
        engineGlow: 0x3366cc
      }
    },
    {
      id: 'hummingbird',
      name: '蜂鸟斥候',
      desc: '小巧流线双尾撑轻型侦察机，累计 30 次完美闪避解锁',
      unlockType: 'totalPerfectDodges',
      unlockValue: 30,
      shape: 'hummingbird',
      colors: {
        primary: 0xccff66,
        secondary: 0x66cc22,
        dark: 0x225511,
        glow: 0x88ff00,
        accent: 0xaaff66,
        cockpit: 0x88ff44,
        trail: 0x77ee33,
        trailCore: 0xddffbb,
        engine: 0x339922,
        engineGlow: 0x66ff00
      }
    },
    {
      id: 'reaper',
      name: '死神镰刃',
      desc: '大后掠镰刀形主翼 + 前掠鸭翼，累计击败 6 个 Boss 解锁',
      unlockType: 'bossKills',
      unlockValue: 6,
      shape: 'reaper',
      colors: {
        primary: 0x1a0a0a,
        secondary: 0xaa1122,
        dark: 0x0a0202,
        glow: 0xcc2233,
        accent: 0xffcc00,
        cockpit: 0xdd4455,
        trail: 0xcc2244,
        trailCore: 0xff88aa,
        engine: 0x661122,
        engineGlow: 0xff2244
      }
    }
  ];

  // ============== 基础工具 ==============
  const TAU = Math.PI * 2;

  function makeRandom(seed) {
    let s = (seed >>> 0) || 1;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ============== 材质 ==============
  function makeMaterials(colors) {
    const std = (cfg) => new THREE.MeshStandardMaterial(cfg);
    return {
      _colors: colors,
      // 主装甲：浅色涂装，带清漆感的金属
      primary: std({
        color: colors.primary, metalness: 0.55, roughness: 0.38,
        envMapIntensity: 1.0, flatShading: true
      }),
      // 副装甲 / 结构件：饱和色，突出分色
      secondary: std({
        color: colors.secondary, metalness: 0.7, roughness: 0.3,
        envMapIntensity: 1.1, flatShading: true
      }),
      // 深色骨架 / 机械件
      dark: std({
        color: colors.dark, metalness: 0.85, roughness: 0.42,
        envMapIntensity: 0.9, flatShading: true
      }),
      // 面板线 / 缝隙（近黑，哑光）
      panel: std({
        color: 0x070a10, metalness: 0.3, roughness: 0.9
      }),
      // 强发光
      glow: new THREE.MeshBasicMaterial({
        color: colors.glow, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }),
      // 次发光
      accent: new THREE.MeshBasicMaterial({
        color: colors.accent, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      }),
      // 引擎炽热金属
      engine: std({
        color: colors.engine, metalness: 1.0, roughness: 0.18,
        emissive: colors.engineGlow, emissiveIntensity: 0.9,
        flatShading: true
      }),
      // 座舱玻璃
      cockpit: new THREE.MeshPhysicalMaterial({
        color: colors.cockpit, metalness: 0.25, roughness: 0.06,
        clearcoat: 1.0, clearcoatRoughness: 0.08,
        transparent: true, opacity: 0.78,
        emissive: colors.glow, emissiveIntensity: 0.22,
        side: THREE.DoubleSide, envMapIntensity: 1.4
      }),
      // 尾焰外层
      trailOuter: new THREE.MeshBasicMaterial({
        color: colors.trail, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false
      }),
      // 尾焰核心
      trailCore: new THREE.MeshBasicMaterial({
        color: colors.trailCore, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    };
  }

  // ============== 尾焰渐隐贴图 ==============
  let _plumeTexture = null;
  function getPlumeTexture() {
    if (_plumeTexture) return _plumeTexture;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.86)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
    _plumeTexture = new THREE.CanvasTexture(c);
    _plumeTexture.needsUpdate = true;
    return _plumeTexture;
  }

  function makePlumeMaterial(m, colorKey, opacity) {
    const colors = m._colors;
    return new THREE.MeshBasicMaterial({
      color: colors[colorKey] || 0xffffff,
      alphaMap: getPlumeTexture(),
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  // ============== 舰体放样 ==============
  // 归一化截面：上窄下宽的切角八边形（顺时针，+Z 朝机首）
  const HULL_PROFILE = [
    [0.00, 1.00],
    [0.58, 0.98],
    [1.00, 0.45],
    [1.00, -0.30],
    [0.55, -1.00],
    [0.00, -1.00],
    [-0.55, -1.00],
    [-1.00, -0.30],
    [-1.00, 0.45],
    [-0.58, 0.98]
  ];

  function buildHullGeometry(sections) {
    const ring = HULL_PROFILE.length;
    const positions = [];
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      for (let j = 0; j < ring; j++) {
        const p = HULL_PROFILE[j];
        positions.push(p[0] * s.w, s.y + p[1] * s.h, s.z);
      }
    }

    const idx = (i, j) => i * ring + j;
    const groupIndices = [[], [], []]; // 0 顶面 1 侧面 2 底面

    for (let i = 0; i < sections.length - 1; i++) {
      for (let j = 0; j < ring; j++) {
        const j2 = (j + 1) % ring;
        const a = idx(i, j);
        const b = idx(i, j2);
        const c = idx(i + 1, j2);
        const d = idx(i + 1, j);
        let g = 2;
        if (j === 0 || j === 9) g = 0;
        else if (j === 1 || j === 8) g = 1;
        groupIndices[g].push(a, b, c, a, c, d);
      }
    }

    // 尾盖（朝 -Z）
    const last = sections.length - 1;
    const centerIndex = positions.length / 3;
    positions.push(0, sections[last].y, sections[last].z);
    for (let j = 0; j < ring; j++) {
      const j2 = (j + 1) % ring;
      groupIndices[2].push(centerIndex, idx(last, j), idx(last, j2));
    }

    // 首盖（面积极小时也补上，避免破面）
    if (sections[0].w > 0.06) {
      const noseCenter = positions.length / 3;
      positions.push(0, sections[0].y, sections[0].z);
      for (let j = 0; j < ring; j++) {
        const j2 = (j + 1) % ring;
        groupIndices[0].push(noseCenter, idx(0, j2), idx(0, j));
      }
    }

    const indices = [];
    const geometry = new THREE.BufferGeometry();
    let start = 0;
    for (let g = 0; g < 3; g++) {
      const arr = groupIndices[g];
      for (let k = 0; k < arr.length; k++) indices.push(arr[k]);
      geometry.addGroup(start, arr.length, g);
      start += arr.length;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function sampleHull(sections, z) {
    if (z >= sections[0].z) return sections[0];
    const last = sections[sections.length - 1];
    if (z <= last.z) return last;
    for (let i = 0; i < sections.length - 1; i++) {
      const a = sections[i];
      const b = sections[i + 1];
      if (z <= a.z && z >= b.z) {
        const t = (a.z - z) / ((a.z - b.z) || 1);
        return {
          z: z,
          w: a.w + (b.w - a.w) * t,
          h: a.h + (b.h - a.h) * t,
          y: a.y + (b.y - a.y) * t
        };
      }
    }
    return sections[0];
  }

  function hullTopY(sections, z) {
    const s = sampleHull(sections, z);
    return s.y + s.h;
  }

  // ============== 机翼放样 ==============
  // stations: [{ t, le, chord, y, th }]，x 由 side*span*t 决定
  function buildWingGeometry(cfg) {
    const st = cfg.stations;
    const positions = [];
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      const x = cfg.side * cfg.span * s.t;
      positions.push(
        x, s.y, s.le,
        x, s.y + s.th * 0.5, s.le + s.chord * 0.55,
        x, s.y, s.le + s.chord,
        x, s.y - s.th * 0.5, s.le + s.chord * 0.55
      );
    }

    const I = (i, j) => i * 4 + j;
    const top = [];
    const bottom = [];
    const tip = [];

    for (let i = 0; i < st.length - 1; i++) {
      for (let j = 0; j < 4; j++) {
        const j2 = (j + 1) % 4;
        const a = I(i, j);
        const b = I(i, j2);
        const c = I(i + 1, j2);
        const d = I(i + 1, j);
        const isTop = (j === 0 || j === 1);
        let order;
        if (cfg.side > 0) {
          order = isTop ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
        } else {
          order = isTop ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
        }
        (isTop ? top : bottom).push(order[0], order[1], order[2], order[3], order[4], order[5]);
      }
    }

    const L = st.length - 1;
    const a = I(L, 0), b = I(L, 1), c = I(L, 2), d = I(L, 3);
    if (cfg.side > 0) tip.push(a, b, c, a, c, d);
    else tip.push(a, c, b, a, d, c);

    const indices = [];
    const geometry = new THREE.BufferGeometry();
    let start = 0;
    [top, bottom, tip].forEach((arr, g) => {
      for (let k = 0; k < arr.length; k++) indices.push(arr[k]);
      geometry.addGroup(start, arr.length, g);
      start += arr.length;
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function addWing(parent, m, cfg) {
    const wing = new THREE.Mesh(buildWingGeometry(cfg), [m.primary, m.dark, m.secondary]);
    parent.add(wing);

    const st = cfg.stations;
    const last = st[st.length - 1];

    // 前缘光条
    const edgePts = st.map(s => new THREE.Vector3(
      cfg.side * cfg.span * s.t,
      s.y + 0.012,
      s.le + 0.025
    ));
    const curve = new THREE.CatmullRomCurve3(edgePts);
    const edge = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 14, 0.032, 6, false),
      m.accent.clone()
    );
    parent.add(edge);

    // 后缘结构条（让翼面有厚度）
    const tePts = st.map(s => new THREE.Vector3(
      cfg.side * cfg.span * s.t,
      s.y,
      s.le + s.chord
    ));
    const teCurve = new THREE.CatmullRomCurve3(tePts);
    const te = new THREE.Mesh(
      new THREE.TubeGeometry(teCurve, 14, 0.028, 5, false),
      m.dark
    );
    parent.add(te);

    // 翼面纵向面板线（顺翼展方向）
    [0.32, 0.62].forEach(f => {
      const a = st[0];
      const b = last;
      const ax = 0;
      const az = a.le + a.chord * f;
      const bx = cfg.side * cfg.span;
      const bz = b.le + b.chord * f;
      const len = Math.hypot(bx - ax, bz - az);
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.012, 0.026),
        m.panel
      );
      line.position.set((ax + bx) / 2, (a.y + b.y) / 2 + a.th * 0.5 + 0.006, (az + bz) / 2);
      line.rotation.y = -Math.atan2(bz - az, bx - ax);
      parent.add(line);
    });

    // 翼面横向面板线
    [0.42, 0.74].forEach(t => {
      const s = st[Math.min(st.length - 1, Math.round(t * (st.length - 1)))];
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.012, s.chord * 0.68),
        m.panel
      );
      line.position.set(
        cfg.side * cfg.span * s.t,
        s.y + s.th * 0.5 + 0.006,
        s.le + s.chord * 0.48
      );
      parent.add(line);
    });

    // 外侧识别涂装板（打破大面积单色）
    const panel = new THREE.Mesh(
      buildWingPanelGeometry(cfg, 0.45, 1.0, 0.12, 0.92),
      m.secondary
    );
    parent.add(panel);

    // 翼尖航行灯
    const tipLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.078, 8, 8),
      m.glow.clone()
    );
    tipLight.position.set(
      cfg.side * cfg.span,
      last.y + last.th * 0.5 + 0.02,
      last.le + last.chord * 0.2
    );
    parent.add(tipLight);

    // 翼根装甲整流罩
    const fairing = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.16, Math.max(1.0, st[0].chord * 0.55)),
      m.dark
    );
    fairing.position.set(
      cfg.side * 0.72,
      st[0].y + 0.04,
      st[0].le + st[0].chord * 0.44
    );
    parent.add(fairing);

    // 翼尖小翼（用锥形尾翼几何，而不是方板）
    if (cfg.winglet) {
      addFin(parent, m, {
        x: cfg.side * (cfg.span - 0.02),
        y: last.y + 0.02,
        z: last.le + last.chord * 0.52,
        rootLen: 0.62,
        height: cfg.winglet,
        sweep: 0.28,
        tilt: -cfg.side * 0.62
      });
    }
  }

  // 在翼面上铺一层贴体涂装板
  function buildWingPanelGeometry(cfg, t0, t1, f0, f1) {
    const st = cfg.stations;
    const pick = (t) => {
      for (let i = 0; i < st.length - 1; i++) {
        if (t <= st[i].t || i === st.length - 2) {
          const a = st[i];
          const b = st[i + 1];
          const k = (t - a.t) / ((b.t - a.t) || 1);
          return {
            x: cfg.side * cfg.span * t,
            le: a.le + (b.le - a.le) * k,
            chord: a.chord + (b.chord - a.chord) * k,
            y: a.y + (b.y - a.y) * k + (a.th + (b.th - a.th) * k) * 0.5
          };
        }
      }
      return st[0];
    };
    const a = pick(t0);
    const b = pick(t1);
    const y0 = a.y + 0.009;
    const y1 = b.y + 0.009;
    const positions = [
      a.x, y0, a.le + a.chord * f0,
      a.x, y0, a.le + a.chord * f1,
      b.x, y1, b.le + b.chord * f1,
      b.x, y1, b.le + b.chord * f0
    ];
    const indices = cfg.side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  // ============== 垂直尾翼 ==============
  function addFin(parent, m, cfg) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-cfg.rootLen, 0);
    shape.lineTo(-cfg.rootLen + cfg.sweep, cfg.height * 0.55);
    shape.lineTo(-cfg.rootLen * 0.38, cfg.height);
    shape.lineTo(0, cfg.height * 0.3);
    shape.lineTo(0, 0);

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.085,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 2
    });
    geom.translate(0, 0, -0.0425);

    const fin = new THREE.Mesh(geom, m.secondary);
    fin.rotation.y = Math.PI / 2;
    fin.rotation.z = 0;

    const holder = new THREE.Group();
    holder.position.set(cfg.x, cfg.y, cfg.z);
    holder.rotation.z = cfg.tilt || 0;
    holder.add(fin);
    parent.add(holder);

    // 垂尾尖端灯
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 8),
      m.accent.clone()
    );
    tip.position.set(-cfg.rootLen * 0.38, cfg.height, 0.05);
    fin.add(tip);

    // 垂尾前缘光条
    const lePts = [
      new THREE.Vector3(0.02, cfg.height * 0.22, 0.055),
      new THREE.Vector3(-cfg.rootLen * 0.36, cfg.height * 0.96, 0.055)
    ];
    const leCurve = new THREE.CatmullRomCurve3(lePts);
    const le = new THREE.Mesh(
      new THREE.TubeGeometry(leCurve, 6, 0.024, 5, false),
      m.glow.clone()
    );
    fin.add(le);

    // 垂尾安定面细节
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.rootLen * 0.52, 0.05, 0.03),
      m.dark
    );
    rib.position.set(-cfg.rootLen * 0.62, cfg.height * 0.3, 0.055);
    rib.rotation.z = 0.12;
    fin.add(rib);

    const tipPlate = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.rootLen * 0.34, 0.03, 0.13),
      m.secondary
    );
    tipPlate.position.set(-cfg.rootLen * 0.42, cfg.height * 0.98, 0.02);
    fin.add(tipPlate);
  }

  // ============== 涡轮风扇贴图 ==============
  let _turbineTexture = null;
  function getTurbineTexture() {
    if (_turbineTexture) return _turbineTexture;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const cx = 64, cy = 64;
    ctx.fillStyle = '#0a0d12';
    ctx.beginPath();
    ctx.arc(cx, cy, 63, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(10, 0, 58, 0);
      g.addColorStop(0, '#3d4a5c');
      g.addColorStop(1, '#141a22');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(14, -3);
      ctx.lineTo(60, -7);
      ctx.lineTo(60, 3);
      ctx.lineTo(14, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#55667a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#0e141c';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, TAU);
    ctx.fill();
    _turbineTexture = new THREE.CanvasTexture(c);
    _turbineTexture.needsUpdate = true;
    return _turbineTexture;
  }

  // ============== 座舱 ==============
  function addCanopy(parent, m, cfg) {
    const domeGeom = new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI * 0.52);
    const glass = new THREE.Mesh(domeGeom, m.cockpit);
    glass.scale.set(cfg.w, cfg.h, cfg.len);
    glass.position.set(0, cfg.y, cfg.z);
    parent.add(glass);

    // 座舱框（椭圆环）
    const ringGeom = new THREE.TorusGeometry(1, 0.045, 6, 24);
    ringGeom.rotateX(Math.PI / 2);
    ringGeom.scale(cfg.w * 1.02, 1, cfg.len * 1.02);
    const ring = new THREE.Mesh(ringGeom, m.dark);
    ring.position.set(0, cfg.y + 0.005, cfg.z);
    parent.add(ring);

    // 纵向骨架
    const spineGeom = new THREE.TorusGeometry(1, 0.032, 5, 16, Math.PI);
    spineGeom.rotateY(Math.PI / 2);
    spineGeom.scale(1, cfg.h * 1.02, cfg.len * 1.02);
    const spine = new THREE.Mesh(spineGeom, m.dark);
    spine.position.set(0, cfg.y, cfg.z);
    parent.add(spine);

    // 舱内仪表微光
    const hud = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.w * 0.9, cfg.len * 0.8),
      new THREE.MeshBasicMaterial({
        color: m._colors.glow, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    hud.rotation.x = -Math.PI / 2;
    hud.position.set(0, cfg.y + cfg.h * 0.35, cfg.z);
    parent.add(hud);
  }

  // ============== 引擎 ==============
  function addEngine(parent, m, cfg, beams, cores) {
    const x = cfg.x || 0;
    const y = cfg.y || 0;
    const z = cfg.z;
    const r = cfg.r || 0.34;

    // 外壳
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.12, r * 1.3, r * 2.0, 12, 1, true).rotateX(Math.PI / 2),
      m.dark
    );
    housing.position.set(x, y, z + r * 0.3);
    parent.add(housing);

    // 外壳散热环
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r * (1.06 + i * 0.04), 0.022, 5, 14),
        m.secondary
      );
      ring.position.set(x, y, z + r * (0.3 + i * 0.42));
      parent.add(ring);
    }

    // 喷口炽热内衬
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.9, r * 0.6, r * 0.8, 10).rotateX(Math.PI / 2),
      m.engine
    );
    inner.position.set(x, y, z - r * 0.85);
    parent.add(inner);

    // 涡轮风扇面（从后方可见的机械细节）
    const fan = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.86, 20),
      new THREE.MeshBasicMaterial({ map: getTurbineTexture(), color: 0x9fb2c6 })
    );
    fan.position.set(x, y, z - r * 0.72);
    fan.rotation.y = Math.PI;
    parent.add(fan);

    // 喷口外圈
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(r * 1.16, 0.042, 6, 16),
      m.accent.clone()
    );
    rim.position.set(x, y, z - r * 0.7);
    parent.add(rim);

    // 喷口光晕（缩小，避免糊成白盘）
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.58, 10, 10),
      m.glow.clone()
    );
    halo.position.set(x, y, z - r * 0.86);
    halo.scale.z = 0.5;
    halo.name = 'HaloGlow';
    parent.add(halo);
    beams.push(halo);

    const nozzleZ = z - r * 1.05;
    const len = cfg.plumeLen || 2.8;

    // 外层扩散焰（更宽更淡）
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.0, r * 0.22, len, 12, 1, true).rotateX(Math.PI / 2),
      makePlumeMaterial(m, 'trail', 0.2)
    );
    outer.position.set(x, y, nozzleZ - len / 2);
    outer.name = 'OuterBeam';
    parent.add(outer);
    beams.push(outer);

    // 中层焰
    const mid = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.62, r * 0.12, len * 0.82, 10, 1, true).rotateX(Math.PI / 2),
      makePlumeMaterial(m, 'trail', 0.32)
    );
    mid.position.set(x, y, nozzleZ - len * 0.41);
    mid.name = 'OuterBeam';
    parent.add(mid);
    beams.push(mid);

    // 核心光焰
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.34, r * 0.04, len * 0.58, 8, 1, true).rotateX(Math.PI / 2),
      makePlumeMaterial(m, 'trailCore', 0.55)
    );
    core.position.set(x, y, nozzleZ - len * 0.29);
    core.name = 'CoreBeam';
    parent.add(core);
    beams.push(core);
    cores.push(core);
  }

  // ============== 进气口 ==============
  function addIntakes(parent, m, sections, rnd) {
    for (let side = -1; side <= 1; side += 2) {
      const s = sampleHull(sections, 1.4);
      const intake = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, s.h * 0.62, 1.55),
        m.dark
      );
      intake.position.set(side * s.w * 0.94, s.y - 0.02, 1.4);
      intake.rotation.y = side * 0.07;
      parent.add(intake);

      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, s.h * 0.16, 1.12),
        m.accent.clone()
      );
      slit.position.set(side * s.w * 1.03, s.y + s.h * 0.12, 1.45);
      parent.add(slit);

      // 进气口分隔筋
      for (let k = -1; k <= 1; k++) {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.035, 0.06),
          m.secondary
        );
        rib.position.set(side * s.w * 0.95, s.y - 0.02 + k * s.h * 0.18, 0.85);
        parent.add(rib);
      }
    }
  }

  // ============== 面板线 ==============
  function addPanelLines(parent, m, sections, count, rnd) {
    const rear = sections[sections.length - 1];
    const front = sections[0];
    for (let i = 0; i < count; i++) {
      const z = front.z - 1.4 - rnd() * (front.z - rear.z - 2.2);
      const s = sampleHull(sections, z);
      const len = 0.35 + rnd() * 1.15;
      const w = Math.max(0.22, s.w * 0.5 * randSign(rnd));
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.012, 0.03),
        m.panel
      );
      strip.position.set((rnd() - 0.5) * s.w * 0.8, s.y + s.h + 0.006, z);
      parent.add(strip);

      if (i % 3 === 0) {
        const cross = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.012, len),
          m.panel
        );
        cross.position.set((rnd() - 0.5) * s.w * 1.1, s.y + s.h + 0.004, z - 0.25);
        parent.add(cross);
      }
    }
  }

  function randSign(rnd) {
    return 0.55 + rnd() * 0.85;
  }

  // ============== 机械碎件 ==============
  function addGreebles(parent, m, sections, count, rnd) {
    const rear = sections[sections.length - 1];
    for (let i = 0; i < count; i++) {
      const z = -0.8 - rnd() * (Math.abs(rear.z) - 1.2);
      const s = sampleHull(sections, z);
      const kind = rnd();
      const side = rnd() > 0.5 ? 1 : -1;
      if (kind < 0.55) {
        // 侧甲板上的低矮设备盒
        const bw = 0.1 + rnd() * 0.16;
        const bh = 0.03 + rnd() * 0.05;
        const bd = 0.12 + rnd() * 0.3;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, bd),
          rnd() > 0.5 ? m.dark : m.secondary
        );
        box.position.set(side * s.w * (0.34 + rnd() * 0.28), s.y + s.h * 0.82, z);
        parent.add(box);
      } else if (kind < 0.85) {
        // 侧面管线
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02 + rnd() * 0.02, 0.02 + rnd() * 0.02, 0.25 + rnd() * 0.35, 5),
          m.dark
        );
        pipe.position.set(side * s.w * 0.9, s.y - s.h * 0.1, z);
        pipe.rotation.x = Math.PI / 2;
        parent.add(pipe);
      } else {
        // 检修口盖
        const hatch = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.018, 0.4),
          m.panel
        );
        hatch.position.set(side * s.w * 0.34, s.y + s.h * 0.94, z);
        parent.add(hatch);
      }
    }

    // 尾部散热格栅
    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 3; k++) {
        const vent = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.035, 0.46),
          m.accent.clone()
        );
        vent.position.set(side * 0.42, sampleHull(sections, -2.4).y + 0.16 + k * 0.075, -3.6);
        vent.material.opacity = 0.45;
        parent.add(vent);
      }
    }
  }

  // ============== 机背脊线 ==============
  function addDorsalSpine(parent, m, cfg) {
    const sections = cfg.hull;
    const ranges = cfg.spineRanges || [[5.4, 2.9], [-0.5, -4.3]];
    ranges.forEach(([z1, z2]) => {
      const pts = [];
      const step = 0.42;
      const dir = z1 > z2 ? -1 : 1;
      for (let z = z1; dir < 0 ? z >= z2 : z <= z2; z += dir * step) {
        pts.push(new THREE.Vector3(0, hullTopY(sections, z) + 0.012, z));
      }
      if (pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts);

      const spine = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.max(6, pts.length * 3), 0.035, 5, false),
        m.dark
      );
      parent.add(spine);

      const lightPts = pts.map(p => new THREE.Vector3(0, p.y + 0.028, p.z));
      const lightCurve = new THREE.CatmullRomCurve3(lightPts);
      const light = new THREE.Mesh(
        new THREE.TubeGeometry(lightCurve, Math.max(6, pts.length * 3), 0.012, 4, false),
        m.accent.clone()
      );
      light.material.opacity = 0.55;
      parent.add(light);
    });
  }

  // ============== 导弹挂架 ==============
  function addMissiles(parent, m, cfg) {
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (cfg.x || 3.0);
      const y = cfg.y || -0.26;

      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.2, 0.62),
        m.dark
      );
      pylon.position.set(x, y + 0.12, cfg.z || -0.4);
      parent.add(pylon);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 1.25, 8).rotateX(Math.PI / 2),
        m.secondary
      );
      body.position.set(x, y, cfg.z || -0.4);
      parent.add(body);

      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.26, 8).rotateX(Math.PI / 2),
        m.dark
      );
      nose.position.set(x, y, (cfg.z || -0.4) + 0.75);
      parent.add(nose);

      const seeker = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 6, 6),
        m.glow.clone()
      );
      seeker.position.set(x, y, (cfg.z || -0.4) + 0.87);
      parent.add(seeker);

      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.24, 0.2),
        m.dark
      );
      fin.position.set(x, y, (cfg.z || -0.4) - 0.5);
      parent.add(fin);
    }
  }

  // ============== 机首机炮 ==============
  function addNoseGun(parent, m, cfg) {
    const y = cfg.y;
    const z = cfg.z;
    for (let side = -1; side <= 1; side += 2) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.065, 1.05, 7).rotateX(Math.PI / 2),
        m.dark
      );
      barrel.position.set(side * 0.24, y, z - 0.35);
      parent.add(barrel);
    }

    const muzzleGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      m.glow.clone()
    );
    muzzleGlow.position.set(0, y, z + 0.2);
    muzzleGlow.material.opacity = 0;
    parent.add(muzzleGlow);
    return muzzleGlow;
  }

  // ============== 涂装条纹 ==============
  function addLivery(parent, m, cfg) {
    const sections = cfg.hull;
    const bands = cfg.liveryBands || [[4.6, 2.4], [0.6, -1.4], [-2.1, -4.2]];
    bands.forEach(([z1, z2]) => {
      const zc = (z1 + z2) / 2;
      const len = Math.abs(z1 - z2);
      const s = sampleHull(sections, zc);
      for (let side = -1; side <= 1; side += 2) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.012, len),
          m.accent.clone()
        );
        strip.position.set(side * 0.17, s.y + s.h + 0.008, zc);
        strip.material.opacity = 0.75;
        parent.add(strip);
      }
    });

    // 机首 V 形识别纹
    for (let side = -1; side <= 1; side += 2) {
      const z = 3.4;
      const s = sampleHull(sections, z);
      const chevron = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.012, 1.05),
        m.secondary
      );
      chevron.position.set(side * s.w * 0.34, s.y + s.h + 0.006, z - 0.1);
      chevron.rotation.y = side * 0.42;
      parent.add(chevron);
    }

    // 机身侧腰线
    for (let side = -1; side <= 1; side += 2) {
      const s = sampleHull(sections, 0);
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.045, 3.4),
        m.accent.clone()
      );
      line.position.set(side * s.w * 1.0, s.y + 0.02, -0.6);
      line.material.opacity = 0.5;
      parent.add(line);
    }
  }

  // ============== 尾部断面 ==============
  function addRearBulkhead(parent, m, sections) {
    const last = sections[sections.length - 1];
    const bulk = new THREE.Mesh(
      new THREE.BoxGeometry(last.w * 1.45, last.h * 1.55, 0.1),
      m.dark
    );
    bulk.position.set(0, last.y, last.z - 0.02);
    parent.add(bulk);

    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 3; k++) {
        const vent = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.035, 0.05),
          m.accent.clone()
        );
        vent.position.set(side * last.w * 0.4, last.y - last.h * 0.35 + k * 0.12, last.z - 0.09);
        vent.material.opacity = 0.5;
        parent.add(vent);
      }
    }
  }

  // ============== 天线 ==============
  function addAntenna(parent, m, cfg) {
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.02, cfg.height || 1.0, 5),
      m.dark
    );
    rod.position.set(cfg.x || 0, (cfg.y || 0) + (cfg.height || 1.0) / 2, cfg.z);
    parent.add(rod);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 6, 6),
      m.accent.clone()
    );
    tip.position.set(cfg.x || 0, (cfg.y || 0) + (cfg.height || 1.0), cfg.z);
    parent.add(tip);
  }

  // ============== 环形机翼 ==============
  function addRingWing(parent, m, cfg) {
    const ringGeom = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 52);
    ringGeom.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeom, m.secondary);
    ring.position.set(0, 0, cfg.z);
    parent.add(ring);

    const glowGeom = new THREE.TorusGeometry(cfg.radius, cfg.tube * 0.26, 6, 52);
    glowGeom.rotateX(Math.PI / 2);
    const glowRing = new THREE.Mesh(glowGeom, m.glow.clone());
    glowRing.position.set(0, 0, cfg.z);
    parent.add(glowRing);

    for (let i = 0; i < 4; i++) {
      const ang = i * Math.PI / 2 + Math.PI / 4;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.radius * 0.92, 0.1, 0.16),
        m.dark
      );
      spoke.position.set(Math.cos(ang) * cfg.radius * 0.5, 0, cfg.z + Math.sin(ang) * cfg.radius * 0.5);
      spoke.rotation.y = -ang;
      parent.add(spoke);
    }

    // 环上航标灯
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4;
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        m.accent.clone()
      );
      light.position.set(Math.cos(ang) * cfg.radius, 0.05, cfg.z + Math.sin(ang) * cfg.radius);
      parent.add(light);
    }
  }

  // ============== 碟形舰体 ==============
  function addSaucer(parent, m, cfg) {
    const profile = [
      new THREE.Vector2(0.0, 0.55),
      new THREE.Vector2(cfg.radius * 0.3, 0.58),
      new THREE.Vector2(cfg.radius * 0.68, 0.46),
      new THREE.Vector2(cfg.radius * 0.95, 0.2),
      new THREE.Vector2(cfg.radius, 0.0),
      new THREE.Vector2(cfg.radius * 0.92, -0.2),
      new THREE.Vector2(cfg.radius * 0.55, -0.42),
      new THREE.Vector2(0.0, -0.5)
    ];
    const lathe = new THREE.LatheGeometry(profile, 44);
    const disc = new THREE.Mesh(lathe, m.primary);
    disc.position.set(0, 0, cfg.z || 0);
    parent.add(disc);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius * 0.99, 0.06, 6, 60).rotateX(Math.PI / 2),
      m.glow.clone()
    );
    rim.position.set(0, 0, cfg.z || 0);
    parent.add(rim);

    for (let i = 0; i < 10; i++) {
      const ang = i * TAU / 10;
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 6, 6),
        m.accent.clone()
      );
      light.position.set(Math.cos(ang) * cfg.radius * 0.96, 0.02, (cfg.z || 0) + Math.sin(ang) * cfg.radius * 0.96);
      parent.add(light);
    }

    // 上层舱盖
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI * 0.5),
      m.cockpit
    );
    dome.scale.set(cfg.radius * 0.3, 0.42, cfg.radius * 0.3);
    dome.position.set(0, 0.5, cfg.z || 0);
    parent.add(dome);

    const domeRing = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius * 0.3, 0.04, 6, 24).rotateX(Math.PI / 2),
      m.dark
    );
    domeRing.position.set(0, 0.52, cfg.z || 0);
    parent.add(domeRing);

    // 碟面放射纹
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.radius * 0.72, 0.02, 0.035),
        m.panel
      );
      strip.position.set(Math.cos(ang) * cfg.radius * 0.44, 0.47, (cfg.z || 0) + Math.sin(ang) * cfg.radius * 0.44);
      strip.rotation.y = -ang;
      parent.add(strip);
    }
  }

  // ============== 双尾撑 ==============
  function addBoom(parent, m, cfg) {
    const boom = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.r, cfg.r, cfg.length, 10).rotateX(Math.PI / 2),
      m.secondary
    );
    boom.position.set(cfg.x, cfg.y, cfg.z);
    parent.add(boom);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(cfg.r, cfg.r * 2.4, 10).rotateX(Math.PI / 2),
      m.primary
    );
    nose.position.set(cfg.x, cfg.y, cfg.z + cfg.length / 2 + cfg.r * 1.2);
    parent.add(nose);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.r * 1.02, 0.035, 5, 14),
      m.accent.clone()
    );
    band.position.set(cfg.x, cfg.y, cfg.z + cfg.length * 0.18);
    parent.add(band);

    const tailFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, cfg.r * 2.0, cfg.r * 1.6),
      m.dark
    );
    tailFin.position.set(cfg.x, cfg.y + cfg.r * 0.8, cfg.z - cfg.length * 0.42);
    parent.add(tailFin);
  }

  // ============== 侧装甲舱 ==============
  function addArmorPods(parent, m, cfg) {
    for (let side = -1; side <= 1; side += 2) {
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.w, cfg.h, cfg.length),
        m.secondary
      );
      pod.position.set(side * cfg.x, cfg.y, cfg.z);
      parent.add(pod);

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.w * 1.06, cfg.h * 0.5, cfg.length * 0.86),
        m.dark
      );
      plate.position.set(side * cfg.x, cfg.y + cfg.h * 0.42, cfg.z);
      parent.add(plate);

      for (let k = 0; k < 3; k++) {
        const slot = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, cfg.h * 0.14, cfg.length * 0.55),
          m.accent.clone()
        );
        slot.position.set(side * (cfg.x + cfg.w * 0.52), cfg.y - cfg.h * 0.22 + k * cfg.h * 0.24, cfg.z);
        slot.material.opacity = 0.6;
        parent.add(slot);
      }
    }
  }

  // ============== 组装 ==============
  function buildShip(colors, cfg) {
    const m = makeMaterials(colors);
    const group = new THREE.Group();
    const beams = [];
    const cores = [];
    const rnd = makeRandom(cfg.seed || hashString(cfg.shape || 'ship'));

    // 舰体
    const hull = new THREE.Mesh(buildHullGeometry(cfg.hull), [m.primary, m.secondary, m.dark]);
    group.add(hull);

    if (cfg.saucer) addSaucer(group, m, cfg.saucer);
    if (cfg.ring) addRingWing(group, m, cfg.ring);
    if (cfg.booms) cfg.booms.forEach(b => addBoom(group, m, b));
    if (cfg.armorPods) addArmorPods(group, m, cfg.armorPods);

    (cfg.wings || []).forEach(w => addWing(group, m, w));
    (cfg.canards || []).forEach(w => addWing(group, m, w));
    (cfg.fins || []).forEach(f => addFin(group, m, f));

    if (cfg.canopy) addCanopy(group, m, cfg.canopy);
    (cfg.engines || []).forEach(e => addEngine(group, m, e, beams, cores));

    if (cfg.intakes) addIntakes(group, m, cfg.hull, rnd);
    if (cfg.panelLines) addPanelLines(group, m, cfg.hull, cfg.panelLines, rnd);
    if (cfg.greebles) addGreebles(group, m, cfg.hull, cfg.greebles, rnd);
    if (cfg.spine !== false) addDorsalSpine(group, m, cfg);
    if (cfg.missiles) addMissiles(group, m, cfg.missiles);
    if (cfg.antenna) addAntenna(group, m, cfg.antenna);

    addRearBulkhead(group, m, cfg.hull);
    addLivery(group, m, cfg);

    const muzzleGlow = addNoseGun(group, m, cfg.noseGun || { y: 0.12, z: 5.0 });

    // 机首朝 -Z 飞行
    group.rotation.y = Math.PI;
    group.scale.setScalar(SHIP_SCALE);

    return {
      group: group,
      muzzleGlow: muzzleGlow,
      engineBeams: beams,
      engineCores: cores,
      colors: colors
    };
  }

  // ============== 12 款造型 ==============

  // 1. 苍穹之刃：标准后掠翼 + 鸭翼 + 双垂尾
  function createAzureShip(colors) {
    return buildShip(colors, {
      shape: 'azure', seed: 11,
      hull: [
        { z: 6.2, w: 0.10, h: 0.10, y: 0.04 },
        { z: 4.3, w: 0.44, h: 0.28, y: 0.08 },
        { z: 1.7, w: 0.80, h: 0.46, y: 0.10 },
        { z: -1.2, w: 0.92, h: 0.50, y: 0.10 },
        { z: -3.6, w: 0.76, h: 0.44, y: 0.06 },
        { z: -4.9, w: 0.52, h: 0.36, y: 0.02 }
      ],
      wings: [
        { side: 1, span: 4.0, winglet: 0.62, stations: [
          { t: 0, le: 1.8, chord: 3.5, y: 0.0, th: 0.18 },
          { t: 0.45, le: 0.35, chord: 2.5, y: -0.01, th: 0.12 },
          { t: 0.76, le: -1.0, chord: 1.55, y: -0.02, th: 0.08 },
          { t: 1, le: -2.2, chord: 0.8, y: -0.03, th: 0.045 }
        ] },
        { side: -1, span: 4.0, winglet: 0.62, stations: [
          { t: 0, le: 1.8, chord: 3.5, y: 0.0, th: 0.18 },
          { t: 0.45, le: 0.35, chord: 2.5, y: -0.01, th: 0.12 },
          { t: 0.76, le: -1.0, chord: 1.55, y: -0.02, th: 0.08 },
          { t: 1, le: -2.2, chord: 0.8, y: -0.03, th: 0.045 }
        ] }
      ],
      canards: [
        { side: 1, span: 1.7, stations: [
          { t: 0, le: 2.9, chord: 1.25, y: 0.06, th: 0.08 },
          { t: 1, le: 2.2, chord: 0.55, y: 0.02, th: 0.035 }
        ] },
        { side: -1, span: 1.7, stations: [
          { t: 0, le: 2.9, chord: 1.25, y: 0.06, th: 0.08 },
          { t: 1, le: 2.2, chord: 0.55, y: 0.02, th: 0.035 }
        ] }
      ],
      fins: [
        { x: 0.78, y: 0.14, z: -3.7, rootLen: 1.25, height: 2.0, sweep: 0.55, tilt: 0.42 },
        { x: -0.78, y: 0.14, z: -3.7, rootLen: 1.25, height: 2.0, sweep: 0.55, tilt: -0.42 }
      ],
      engines: [
        { x: 0.55, y: 0.0, z: -5.0, r: 0.36, plumeLen: 3.2 },
        { x: -0.55, y: 0.0, z: -5.0, r: 0.36, plumeLen: 3.2 }
      ],
      canopy: { z: 0.9, y: 0.52, w: 0.42, h: 0.32, len: 1.25 },
      intakes: true, panelLines: 8, greebles: 12,
      missiles: { x: 3.0, y: -0.22, z: -0.4 },
      antenna: { x: 0.3, y: 0.5, z: -3.2, height: 0.9 },
      noseGun: { y: 0.16, z: 5.0 }
    });
  }

  // 2. 赤焰战鹰：前掠翼重型攻击机 + 四联导弹
  function createCrimsonShip(colors) {
    return buildShip(colors, {
      shape: 'crimson', seed: 23,
      hull: [
        { z: 5.8, w: 0.12, h: 0.12, y: 0.02 },
        { z: 4.0, w: 0.58, h: 0.34, y: 0.06 },
        { z: 1.4, w: 1.05, h: 0.52, y: 0.08 },
        { z: -1.4, w: 1.12, h: 0.56, y: 0.06 },
        { z: -3.8, w: 0.92, h: 0.48, y: 0.02 },
        { z: -5.0, w: 0.64, h: 0.4, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 4.9, stations: [
          { t: 0, le: 0.7, chord: 3.7, y: -0.04, th: 0.22 },
          { t: 0.5, le: 1.15, chord: 2.4, y: -0.09, th: 0.14 },
          { t: 1, le: 1.9, chord: 0.9, y: -0.14, th: 0.06 }
        ] },
        { side: -1, span: 4.9, stations: [
          { t: 0, le: 0.7, chord: 3.7, y: -0.04, th: 0.22 },
          { t: 0.5, le: 1.15, chord: 2.4, y: -0.09, th: 0.14 },
          { t: 1, le: 1.9, chord: 0.9, y: -0.14, th: 0.06 }
        ] }
      ],
      fins: [
        { x: 0.92, y: 0.18, z: -3.6, rootLen: 2.0, height: 1.55, sweep: 0.35, tilt: 0.34 },
        { x: -0.92, y: 0.18, z: -3.6, rootLen: 2.0, height: 1.55, sweep: 0.35, tilt: -0.34 }
      ],
      engines: [
        { x: 0.7, y: 0.0, z: -5.2, r: 0.44, plumeLen: 3.4 },
        { x: -0.7, y: 0.0, z: -5.2, r: 0.44, plumeLen: 3.4 }
      ],
      canopy: { z: 0.7, y: 0.6, w: 0.46, h: 0.34, len: 1.15 },
      intakes: true, panelLines: 9, greebles: 14,
      missiles: { x: 3.4, y: -0.3, z: -0.1 },
      antenna: { x: 0.4, y: 0.55, z: -3.0, height: 1.0 },
      noseGun: { y: 0.14, z: 4.7 },
      liveryBands: [[4.2, 2.2], [0.4, -1.6], [-2.4, -4.4]]
    });
  }

  // 3. 紫电魅影：兰姆达翼隐秘侦察机
  function createVioletShip(colors) {
    return buildShip(colors, {
      shape: 'violet', seed: 37,
      hull: [
        { z: 6.8, w: 0.08, h: 0.09, y: 0.02 },
        { z: 4.6, w: 0.34, h: 0.24, y: 0.06 },
        { z: 1.8, w: 0.62, h: 0.42, y: 0.08 },
        { z: -1.4, w: 0.72, h: 0.46, y: 0.08 },
        { z: -3.8, w: 0.58, h: 0.4, y: 0.04 },
        { z: -5.1, w: 0.4, h: 0.32, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 4.2, stations: [
          { t: 0, le: 0.2, chord: 4.3, y: -0.03, th: 0.12 },
          { t: 0.6, le: -1.4, chord: 2.2, y: -0.07, th: 0.08 },
          { t: 1, le: -3.3, chord: 0.6, y: -0.12, th: 0.04 }
        ] },
        { side: -1, span: 4.2, stations: [
          { t: 0, le: 0.2, chord: 4.3, y: -0.03, th: 0.12 },
          { t: 0.6, le: -1.4, chord: 2.2, y: -0.07, th: 0.08 },
          { t: 1, le: -3.3, chord: 0.6, y: -0.12, th: 0.04 }
        ] }
      ],
      fins: [
        { x: 0, y: 0.3, z: -3.2, rootLen: 2.1, height: 2.15, sweep: 0.55, tilt: 0 }
      ],
      engines: [
        { x: 0.42, y: 0.0, z: -5.2, r: 0.32, plumeLen: 3.0 },
        { x: -0.42, y: 0.0, z: -5.2, r: 0.32, plumeLen: 3.0 }
      ],
      canopy: { z: 1.3, y: 0.48, w: 0.33, h: 0.26, len: 1.4 },
      intakes: true, panelLines: 7, greebles: 10,
      missiles: { x: 2.3, y: -0.2, z: -0.2 },
      noseGun: { y: 0.12, z: 5.4 },
      liveryBands: [[5.2, 2.8], [0.6, -2.0], [-2.6, -4.6]]
    });
  }

  // 4. 黄金圣骑：宽三角翼 + 三引擎
  function createGoldenShip(colors) {
    return buildShip(colors, {
      shape: 'golden', seed: 43,
      hull: [
        { z: 6.4, w: 0.12, h: 0.12, y: 0.04 },
        { z: 4.0, w: 0.6, h: 0.32, y: 0.08 },
        { z: 1.2, w: 1.0, h: 0.5, y: 0.1 },
        { z: -1.6, w: 1.1, h: 0.54, y: 0.08 },
        { z: -3.8, w: 0.9, h: 0.46, y: 0.04 },
        { z: -5.0, w: 0.6, h: 0.38, y: 0.02 }
      ],
      wings: [
        { side: 1, span: 5.2, stations: [
          { t: 0, le: 2.2, chord: 4.9, y: -0.02, th: 0.2 },
          { t: 0.5, le: 0.0, chord: 2.6, y: -0.06, th: 0.12 },
          { t: 1, le: -2.5, chord: 0.85, y: -0.1, th: 0.05 }
        ] },
        { side: -1, span: 5.2, stations: [
          { t: 0, le: 2.2, chord: 4.9, y: -0.02, th: 0.2 },
          { t: 0.5, le: 0.0, chord: 2.6, y: -0.06, th: 0.12 },
          { t: 1, le: -2.5, chord: 0.85, y: -0.1, th: 0.05 }
        ] }
      ],
      fins: [
        { x: 0.8, y: 0.16, z: -3.8, rootLen: 1.7, height: 1.9, sweep: 0.5, tilt: 0.16 },
        { x: -0.8, y: 0.16, z: -3.8, rootLen: 1.7, height: 1.9, sweep: 0.5, tilt: -0.16 }
      ],
      engines: [
        { x: 0, y: 0.05, z: -5.1, r: 0.4, plumeLen: 3.3 },
        { x: 0.88, y: 0.0, z: -5.0, r: 0.3, plumeLen: 2.9 },
        { x: -0.88, y: 0.0, z: -5.0, r: 0.3, plumeLen: 2.9 }
      ],
      canopy: { z: 0.8, y: 0.54, w: 0.44, h: 0.32, len: 1.3 },
      intakes: true, panelLines: 10, greebles: 14,
      missiles: { x: 3.6, y: -0.22, z: -0.3 },
      antenna: { x: -0.2, y: 0.5, z: -3.4, height: 0.8 },
      noseGun: { y: 0.16, z: 5.1 },
      liveryBands: [[4.4, 2.4], [0.5, -1.8], [-2.4, -4.5]]
    });
  }

  // 5. 寒霜之翼：细长飞镖
  function createFrostShip(colors) {
    return buildShip(colors, {
      shape: 'frost', seed: 53,
      hull: [
        { z: 7.4, w: 0.06, h: 0.08, y: 0.02 },
        { z: 5.0, w: 0.26, h: 0.2, y: 0.05 },
        { z: 2.0, w: 0.5, h: 0.34, y: 0.07 },
        { z: -1.4, w: 0.58, h: 0.38, y: 0.06 },
        { z: -4.4, w: 0.46, h: 0.32, y: 0.02 },
        { z: -6.0, w: 0.3, h: 0.26, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 3.3, stations: [
          { t: 0, le: 1.0, chord: 4.4, y: -0.02, th: 0.1 },
          { t: 0.55, le: -1.2, chord: 2.0, y: -0.05, th: 0.07 },
          { t: 1, le: -3.6, chord: 0.45, y: -0.08, th: 0.03 }
        ] },
        { side: -1, span: 3.3, stations: [
          { t: 0, le: 1.0, chord: 4.4, y: -0.02, th: 0.1 },
          { t: 0.55, le: -1.2, chord: 2.0, y: -0.05, th: 0.07 },
          { t: 1, le: -3.6, chord: 0.45, y: -0.08, th: 0.03 }
        ] }
      ],
      canards: [
        { side: 1, span: 1.25, stations: [
          { t: 0, le: 4.1, chord: 0.95, y: 0.04, th: 0.05 },
          { t: 1, le: 3.5, chord: 0.4, y: 0.01, th: 0.025 }
        ] },
        { side: -1, span: 1.25, stations: [
          { t: 0, le: 4.1, chord: 0.95, y: 0.04, th: 0.05 },
          { t: 1, le: 3.5, chord: 0.4, y: 0.01, th: 0.025 }
        ] }
      ],
      fins: [
        { x: 0.4, y: 0.2, z: -4.6, rootLen: 1.5, height: 1.35, sweep: 0.4, tilt: 0.24 },
        { x: -0.4, y: 0.2, z: -4.6, rootLen: 1.5, height: 1.35, sweep: 0.4, tilt: -0.24 }
      ],
      engines: [
        { x: 0.3, y: 0.0, z: -6.1, r: 0.3, plumeLen: 3.3 },
        { x: -0.3, y: 0.0, z: -6.1, r: 0.3, plumeLen: 3.3 }
      ],
      canopy: { z: 1.8, y: 0.44, w: 0.3, h: 0.24, len: 1.5 },
      intakes: true, panelLines: 6, greebles: 8,
      missiles: { x: 2.1, y: -0.18, z: -0.2 },
      antenna: { x: 0, y: 0.4, z: -4.0, height: 1.0 },
      noseGun: { y: 0.1, z: 6.0 }
    });
  }

  // 6. 幽影之刺：飞翼隐身无人机
  function createShadowShip(colors) {
    return buildShip(colors, {
      shape: 'shadow', seed: 67,
      hull: [
        { z: 5.6, w: 0.1, h: 0.1, y: 0.0 },
        { z: 3.4, w: 0.7, h: 0.24, y: 0.02 },
        { z: 0.6, w: 1.3, h: 0.32, y: 0.04 },
        { z: -2.2, w: 1.5, h: 0.34, y: 0.02 },
        { z: -4.4, w: 1.1, h: 0.28, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 5.6, stations: [
          { t: 0, le: 2.4, chord: 5.4, y: -0.04, th: 0.08 },
          { t: 0.5, le: 0.4, chord: 3.0, y: -0.04, th: 0.05 },
          { t: 1, le: -2.4, chord: 0.9, y: -0.04, th: 0.03 }
        ] },
        { side: -1, span: 5.6, stations: [
          { t: 0, le: 2.4, chord: 5.4, y: -0.04, th: 0.08 },
          { t: 0.5, le: 0.4, chord: 3.0, y: -0.04, th: 0.05 },
          { t: 1, le: -2.4, chord: 0.9, y: -0.04, th: 0.03 }
        ] }
      ],
      fins: [
        { x: 1.1, y: 0.18, z: -3.6, rootLen: 1.4, height: 0.85, sweep: 0.3, tilt: 0.55 },
        { x: -1.1, y: 0.18, z: -3.6, rootLen: 1.4, height: 0.85, sweep: 0.3, tilt: -0.55 }
      ],
      engines: [
        { x: 0.85, y: 0.02, z: -4.7, r: 0.3, plumeLen: 3.0 },
        { x: -0.85, y: 0.02, z: -4.7, r: 0.3, plumeLen: 3.0 }
      ],
      canopy: { z: 1.2, y: 0.36, w: 0.34, h: 0.22, len: 1.3 },
      intakes: false, panelLines: 12, greebles: 8,
      missiles: { x: 2.6, y: -0.16, z: -0.2 },
      noseGun: { y: 0.08, z: 4.6 },
      liveryBands: [[4.0, 2.0], [-1.0, -3.6]]
    });
  }

  // 7. 猎户座巡航者：双尾撑经典布局
  function createOrionShip(colors) {
    return buildShip(colors, {
      shape: 'orion', seed: 71,
      hull: [
        { z: 6.0, w: 0.1, h: 0.1, y: 0.04 },
        { z: 4.2, w: 0.36, h: 0.26, y: 0.06 },
        { z: 1.6, w: 0.6, h: 0.4, y: 0.08 },
        { z: -1.6, w: 0.66, h: 0.42, y: 0.06 },
        { z: -4.0, w: 0.52, h: 0.34, y: 0.02 },
        { z: -5.2, w: 0.34, h: 0.28, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 2.4, stations: [
          { t: 0, le: 1.5, chord: 3.2, y: -0.02, th: 0.12 },
          { t: 1, le: 0.2, chord: 1.3, y: -0.05, th: 0.06 }
        ] },
        { side: -1, span: 2.4, stations: [
          { t: 0, le: 1.5, chord: 3.2, y: -0.02, th: 0.12 },
          { t: 1, le: 0.2, chord: 1.3, y: -0.05, th: 0.06 }
        ] }
      ],
      booms: [
        { x: 2.45, y: 0.0, z: -1.0, r: 0.22, length: 5.4 },
        { x: -2.45, y: 0.0, z: -1.0, r: 0.22, length: 5.4 }
      ],
      fins: [
        { x: 2.45, y: 0.2, z: -3.2, rootLen: 1.5, height: 1.5, sweep: 0.4, tilt: 0 },
        { x: -2.45, y: 0.2, z: -3.2, rootLen: 1.5, height: 1.5, sweep: 0.4, tilt: 0 }
      ],
      engines: [
        { x: 0.35, y: 0.0, z: -5.3, r: 0.3, plumeLen: 3.0 },
        { x: -0.35, y: 0.0, z: -5.3, r: 0.3, plumeLen: 3.0 }
      ],
      canopy: { z: 1.4, y: 0.46, w: 0.36, h: 0.28, len: 1.35 },
      intakes: true, panelLines: 8, greebles: 10,
      missiles: { x: 1.9, y: -0.18, z: -0.4 },
      antenna: { x: 0, y: 0.42, z: -3.8, height: 1.1 },
      noseGun: { y: 0.12, z: 5.0 },
      liveryBands: [[4.4, 2.4], [0.4, -1.8], [-2.6, -4.6]]
    });
  }

  // 8. 火流星：复古碟形战机
  function createFireballShip(colors) {
    return buildShip(colors, {
      shape: 'fireball', seed: 83,
      hull: [
        { z: 4.2, w: 0.1, h: 0.1, y: 0.05 },
        { z: 2.4, w: 0.5, h: 0.3, y: 0.08 },
        { z: 0.4, w: 0.7, h: 0.36, y: 0.08 },
        { z: -1.8, w: 0.6, h: 0.3, y: 0.04 }
      ],
      saucer: { radius: 3.5, z: 0.0 },
      engines: [
        { x: 0.9, y: -0.1, z: -2.6, r: 0.34, plumeLen: 2.8 },
        { x: -0.9, y: -0.1, z: -2.6, r: 0.34, plumeLen: 2.8 }
      ],
      canopy: { z: 1.9, y: 0.5, w: 0.3, h: 0.24, len: 0.9 },
      intakes: false, panelLines: 4, greebles: 6,
      noseGun: { y: 0.1, z: 4.0 },
      liveryBands: [[3.0, 1.8]]
    });
  }

  // 9. 环刃武士：环形机翼
  function createRingbladeShip(colors) {
    return buildShip(colors, {
      shape: 'ringblade', seed: 97,
      hull: [
        { z: 6.0, w: 0.1, h: 0.1, y: 0.04 },
        { z: 4.2, w: 0.38, h: 0.26, y: 0.07 },
        { z: 1.6, w: 0.66, h: 0.42, y: 0.08 },
        { z: -1.6, w: 0.72, h: 0.44, y: 0.06 },
        { z: -4.0, w: 0.56, h: 0.36, y: 0.02 },
        { z: -5.1, w: 0.34, h: 0.28, y: 0.0 }
      ],
      ring: { radius: 3.15, tube: 0.3, z: -0.3 },
      wings: [
        { side: 1, span: 1.5, stations: [
          { t: 0, le: 1.2, chord: 2.6, y: -0.02, th: 0.1 },
          { t: 1, le: 0.2, chord: 1.0, y: -0.04, th: 0.05 }
        ] },
        { side: -1, span: 1.5, stations: [
          { t: 0, le: 1.2, chord: 2.6, y: -0.02, th: 0.1 },
          { t: 1, le: 0.2, chord: 1.0, y: -0.04, th: 0.05 }
        ] }
      ],
      fins: [
        { x: 0.42, y: 0.24, z: -3.6, rootLen: 1.6, height: 1.5, sweep: 0.45, tilt: 0.22 },
        { x: -0.42, y: 0.24, z: -3.6, rootLen: 1.6, height: 1.5, sweep: 0.45, tilt: -0.22 }
      ],
      engines: [
        { x: 0.4, y: 0.0, z: -5.2, r: 0.32, plumeLen: 3.0 },
        { x: -0.4, y: 0.0, z: -5.2, r: 0.32, plumeLen: 3.0 }
      ],
      canopy: { z: 1.5, y: 0.48, w: 0.34, h: 0.28, len: 1.3 },
      intakes: true, panelLines: 7, greebles: 8,
      missiles: { x: 2.0, y: -0.18, z: -0.4 },
      noseGun: { y: 0.12, z: 5.0 }
    });
  }

  // 10. 装甲巨像：厚重装甲 + 侧舷装甲舱
  function createArmorShip(colors) {
    return buildShip(colors, {
      shape: 'armor', seed: 101,
      hull: [
        { z: 5.6, w: 0.16, h: 0.14, y: 0.02 },
        { z: 3.8, w: 0.72, h: 0.4, y: 0.06 },
        { z: 1.0, w: 1.34, h: 0.6, y: 0.08 },
        { z: -1.8, w: 1.42, h: 0.62, y: 0.06 },
        { z: -4.0, w: 1.16, h: 0.52, y: 0.02 },
        { z: -5.2, w: 0.8, h: 0.44, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 3.6, stations: [
          { t: 0, le: 1.4, chord: 3.6, y: -0.06, th: 0.26 },
          { t: 1, le: -1.6, chord: 1.4, y: -0.12, th: 0.1 }
        ] },
        { side: -1, span: 3.6, stations: [
          { t: 0, le: 1.4, chord: 3.6, y: -0.06, th: 0.26 },
          { t: 1, le: -1.6, chord: 1.4, y: -0.12, th: 0.1 }
        ] }
      ],
      armorPods: { x: 2.05, y: -0.02, z: -0.8, w: 0.62, h: 0.72, length: 4.4 },
      fins: [
        { x: 1.1, y: 0.2, z: -3.8, rootLen: 1.9, height: 1.8, sweep: 0.4, tilt: 0.24 },
        { x: -1.1, y: 0.2, z: -3.8, rootLen: 1.9, height: 1.8, sweep: 0.4, tilt: -0.24 }
      ],
      engines: [
        { x: 0, y: 0.06, z: -5.4, r: 0.42, plumeLen: 3.1 },
        { x: 0.95, y: 0.0, z: -5.3, r: 0.34, plumeLen: 2.9 },
        { x: -0.95, y: 0.0, z: -5.3, r: 0.34, plumeLen: 2.9 }
      ],
      canopy: { z: 1.5, y: 0.64, w: 0.5, h: 0.3, len: 1.2 },
      intakes: true, panelLines: 10, greebles: 14,
      missiles: { x: 3.0, y: -0.28, z: -0.4 },
      antenna: { x: -0.4, y: 0.6, z: -3.2, height: 0.85 },
      noseGun: { y: 0.18, z: 4.7 }
    });
  }

  // 11. 蜂鸟斥候：小型高机动侦察机
  function createHummingbirdShip(colors) {
    return buildShip(colors, {
      shape: 'hummingbird', seed: 113,
      hull: [
        { z: 5.2, w: 0.1, h: 0.1, y: 0.05 },
        { z: 3.6, w: 0.4, h: 0.26, y: 0.08 },
        { z: 1.2, w: 0.66, h: 0.42, y: 0.1 },
        { z: -1.4, w: 0.6, h: 0.4, y: 0.08 },
        { z: -3.0, w: 0.36, h: 0.3, y: 0.04 }
      ],
      wings: [
        { side: 1, span: 3.9, stations: [
          { t: 0, le: 2.2, chord: 2.2, y: 0.02, th: 0.12 },
          { t: 0.5, le: 1.2, chord: 1.6, y: -0.02, th: 0.08 },
          { t: 1, le: 0.4, chord: 0.7, y: -0.06, th: 0.04 }
        ] },
        { side: -1, span: 3.9, stations: [
          { t: 0, le: 2.2, chord: 2.2, y: 0.02, th: 0.12 },
          { t: 0.5, le: 1.2, chord: 1.6, y: -0.02, th: 0.08 },
          { t: 1, le: 0.4, chord: 0.7, y: -0.06, th: 0.04 }
        ] }
      ],
      canards: [
        { side: 1, span: 0.9, stations: [
          { t: 0, le: 3.9, chord: 0.8, y: 0.05, th: 0.05 },
          { t: 1, le: 3.5, chord: 0.35, y: 0.02, th: 0.025 }
        ] },
        { side: -1, span: 0.9, stations: [
          { t: 0, le: 3.9, chord: 0.8, y: 0.05, th: 0.05 },
          { t: 1, le: 3.5, chord: 0.35, y: 0.02, th: 0.025 }
        ] }
      ],
      fins: [
        { x: 0.32, y: 0.2, z: -2.8, rootLen: 1.3, height: 1.2, sweep: 0.35, tilt: 0.3 },
        { x: -0.32, y: 0.2, z: -2.8, rootLen: 1.3, height: 1.2, sweep: 0.35, tilt: -0.3 }
      ],
      engines: [
        { x: 0.26, y: 0.0, z: -3.1, r: 0.26, plumeLen: 2.6 },
        { x: -0.26, y: 0.0, z: -3.1, r: 0.26, plumeLen: 2.6 }
      ],
      canopy: { z: 1.5, y: 0.48, w: 0.36, h: 0.3, len: 1.0 },
      intakes: true, panelLines: 5, greebles: 6,
      noseGun: { y: 0.12, z: 4.6 }
    });
  }

  // 12. 死神镰刃：镰刀形大后掠翼 + 前掠鸭翼
  function createReaperShip(colors) {
    return buildShip(colors, {
      shape: 'reaper', seed: 127,
      hull: [
        { z: 6.6, w: 0.1, h: 0.1, y: 0.03 },
        { z: 4.4, w: 0.4, h: 0.28, y: 0.06 },
        { z: 1.6, w: 0.74, h: 0.46, y: 0.08 },
        { z: -1.6, w: 0.82, h: 0.5, y: 0.06 },
        { z: -4.0, w: 0.62, h: 0.4, y: 0.02 },
        { z: -5.2, w: 0.4, h: 0.32, y: 0.0 }
      ],
      wings: [
        { side: 1, span: 5.0, stations: [
          { t: 0, le: 1.9, chord: 4.0, y: -0.02, th: 0.14 },
          { t: 0.35, le: 0.4, chord: 3.0, y: -0.06, th: 0.1 },
          { t: 0.7, le: -1.8, chord: 1.8, y: -0.1, th: 0.06 },
          { t: 1, le: -3.8, chord: 0.5, y: -0.14, th: 0.03 }
        ] },
        { side: -1, span: 5.0, stations: [
          { t: 0, le: 1.9, chord: 4.0, y: -0.02, th: 0.14 },
          { t: 0.35, le: 0.4, chord: 3.0, y: -0.06, th: 0.1 },
          { t: 0.7, le: -1.8, chord: 1.8, y: -0.1, th: 0.06 },
          { t: 1, le: -3.8, chord: 0.5, y: -0.14, th: 0.03 }
        ] }
      ],
      canards: [
        { side: 1, span: 1.9, stations: [
          { t: 0, le: 2.5, chord: 1.5, y: 0.06, th: 0.07 },
          { t: 1, le: 3.2, chord: 0.6, y: 0.02, th: 0.035 }
        ] },
        { side: -1, span: 1.9, stations: [
          { t: 0, le: 2.5, chord: 1.5, y: 0.06, th: 0.07 },
          { t: 1, le: 3.2, chord: 0.6, y: 0.02, th: 0.035 }
        ] }
      ],
      fins: [
        { x: 0.6, y: 0.18, z: -3.9, rootLen: 1.9, height: 1.85, sweep: 0.6, tilt: 0.3 },
        { x: -0.6, y: 0.18, z: -3.9, rootLen: 1.9, height: 1.85, sweep: 0.6, tilt: -0.3 }
      ],
      engines: [
        { x: 0.5, y: 0.0, z: -5.3, r: 0.36, plumeLen: 3.3 },
        { x: -0.5, y: 0.0, z: -5.3, r: 0.36, plumeLen: 3.3 }
      ],
      canopy: { z: 0.9, y: 0.52, w: 0.38, h: 0.28, len: 1.3 },
      intakes: true, panelLines: 9, greebles: 12,
      missiles: { x: 3.2, y: -0.24, z: -0.5 },
      antenna: { x: 0.2, y: 0.5, z: -3.4, height: 1.0 },
      noseGun: { y: 0.14, z: 5.3 },
      liveryBands: [[4.6, 2.4], [0.4, -1.8], [-2.6, -4.6]]
    });
  }

  const SHAPE_FACTORIES = {
    azure: createAzureShip,
    crimson: createCrimsonShip,
    violet: createVioletShip,
    golden: createGoldenShip,
    frost: createFrostShip,
    shadow: createShadowShip,
    orion: createOrionShip,
    fireball: createFireballShip,
    ringblade: createRingbladeShip,
    armor: createArmorShip,
    hummingbird: createHummingbirdShip,
    reaper: createReaperShip
  };

  function createFighterShip(colors) {
    // 兼容旧调用：默认用 azure 造型
    return createAzureShip(colors);
  }

  function createShip(skinDef) {
    const factory = SHAPE_FACTORIES[skinDef.shape] || createAzureShip;
    return factory(skinDef.colors);
  }

  global.ShipSkins = {
    SKIN_DEFS: SKIN_DEFS,
    createFighterShip: createFighterShip,
    createShip: createShip,
    SHIP_SCALE: SHIP_SCALE
  };

})(window);
