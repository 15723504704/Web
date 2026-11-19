/**
 * BossManager - Boss 战系统
 * Boss有限状态机 + 弹幕对象池 + 多阶段攻击
 * 所有网格/材质预创建，运行时不分配GPU资源
 */
(function(global) {
  'use strict';

  const BOSS_STATE = {
    IDLE: 'idle',           // 待机（未激活）
    ENTERING: 'entering',   // 进入场景
    FIGHTING: 'fighting',   // 战斗中
    PHASE_TRANSITION: 'phase', // 阶段切换
    DEFEATED: 'defeated',   // 被击败（爆炸动画）
    EXITING: 'exiting'      // （如果有）退场
  };

  const BOSS_ATTACK = {
    BULLET_SPREAD: 'spread',   // 弹幕散射
    CHARGE: 'charge',          // 冲撞/俯冲
    LASER_BEAM: 'laser'        // 激光束
  };

  const BULLET_POOL_SIZE = 80;
  const BOSS_BULLET_SPEED = 25;

  class BossManager {
    constructor(scene) {
      this.scene = scene;
      this.state = BOSS_STATE.IDLE;
      this.boss = null;
      this.bulletPool = [];
      this.activeBullets = [];

      // Boss属性
      this.maxHp = 200;
      this.hp = 200;
      this.phase = 1; // 当前阶段 1-3
      this.maxPhase = 3;
      this.attackTimer = 0;
      this.currentAttack = null;
      this.attackDuration = 0;

      // Boss位置
      this.targetX = 0;
      this.targetY = 0;
      this.baseZ = -40; // Boss在玩家前方40单位处

      // 运动参数
      this.bobTime = 0;
      this.shakeAmount = 0;
      this.hitFlashTimer = 0;

      // 冲撞参数
      this.chargeStartPos = new THREE.Vector3();
      this.chargeEndPos = new THREE.Vector3();
      this.chargeProgress = 0;
      this.chargeSpeed = 0;

      // 激光束参数
      this.laserActive = false;
      this.laserWidth = 0;
      this.laserTargetY = 0;
      this.laserWarningTime = 0;

      // 回调
      this.onBossAppear = null;
      this.onBossDefeated = null;
      this.onHpChange = null;
      this.onPhaseChange = null;
      this.onHit = null; // 命中反馈回调（传{damage, position, isCrit}）
      this.onChargeWarn = null; // 冲撞预警回调

      // 命中火花粒子池
      this.hitSparkPool = [];
      this.activeHitSparks = [];
      this.HIT_SPARK_POOL_SIZE = 30;

      this.init();
    }

    init() {
      // 预创建Boss本体
      this.boss = this._createBoss();
      this.boss.mesh.visible = false;
      this.scene.add(this.boss.mesh);

      // 预创建弹幕池
      this._initBulletPool();

      // 预创建命中火花池
      this._initHitSparkPool();

      // 预创建激光束（一条，显示/隐藏切换）
      this._initLaserBeam();
    }

    _createBoss() {
      const group = new THREE.Group();

      // ========== 材质 ==========
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x3a2f4d,
        metalness: 0.9,
        roughness: 0.36,
        emissive: 0x1e0f2e,
        emissiveIntensity: 0.45,
        flatShading: true
      });
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x5a4b73,
        metalness: 0.82,
        roughness: 0.3,
        emissive: 0x241435,
        emissiveIntensity: 0.42,
        flatShading: true
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x0e0b15,
        metalness: 0.95,
        roughness: 0.28
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x9a7742,
        metalness: 1.0,
        roughness: 0.26,
        emissive: 0x3a2508,
        emissiveIntensity: 0.6
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff2266,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff6f96,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const accentMat = new THREE.MeshBasicMaterial({
        color: 0xff0044,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const glowParts = [];
      const accentParts = [];

      // ========== 构造辅助 ==========
      const addBox = (w, h, d, mat, x, y, z, ry, rz) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        if (rz) mesh.rotation.z = rz;
        group.add(mesh);
        return mesh;
      };
      const addGlowBox = (w, h, d, x, y, z, ry) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glowMat.clone());
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        group.add(mesh);
        glowParts.push(mesh);
        return mesh;
      };
      const addCyl = (rt, rb, h, seg, mat, x, y, z, axis) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
        if (axis === 'z') mesh.rotation.x = Math.PI / 2;
        if (axis === 'x') mesh.rotation.z = Math.PI / 2;
        mesh.position.set(x, y, z);
        group.add(mesh);
        return mesh;
      };

      // 截面放样（8 点装甲截面），得到真正的舰体轮廓
      const PROFILE = [
        [0.00, 1.00],
        [0.72, 0.96],
        [1.00, 0.30],
        [0.72, -0.92],
        [0.00, -1.00],
        [-0.72, -0.92],
        [-1.00, 0.30],
        [-0.72, 0.96]
      ];
      const buildHull = (sections) => {
        const ring = PROFILE.length;
        const positions = [];
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          for (let j = 0; j < ring; j++) {
            const p = PROFILE[j];
            positions.push(p[0] * s.w, s.y + p[1] * s.h, s.z);
          }
        }
        const idx = (i, j) => i * ring + j;
        const groups = [[], [], []];
        for (let i = 0; i < sections.length - 1; i++) {
          for (let j = 0; j < ring; j++) {
            const j2 = (j + 1) % ring;
            const a = idx(i, j);
            const b = idx(i, j2);
            const c = idx(i + 1, j2);
            const d = idx(i + 1, j);
            let g = 2;
            if (j === 0 || j === 7) g = 0;
            else if (j === 1 || j === 2 || j === 5 || j === 6) g = 1;
            groups[g].push(a, b, c, a, c, d);
          }
        }
        // 首尾封盖，避免露出空心截面
        const firstCenter = positions.length / 3;
        positions.push(0, sections[0].y, sections[0].z);
        for (let j = 0; j < ring; j++) {
          groups[2].push(firstCenter, idx(0, (j + 1) % ring), idx(0, j));
        }
        const last = sections.length - 1;
        const center = positions.length / 3;
        positions.push(0, sections[last].y, sections[last].z);
        for (let j = 0; j < ring; j++) {
          groups[2].push(center, idx(last, j), idx(last, (j + 1) % ring));
        }
        const indices = [];
        const geometry = new THREE.BufferGeometry();
        let start = 0;
        for (let g = 0; g < 3; g++) {
          for (let k = 0; k < groups[g].length; k++) indices.push(groups[g][k]);
          geometry.addGroup(start, groups[g].length, g);
          start += groups[g].length;
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
      };

      // ========== 主舰体 ==========
      const mainHull = new THREE.Mesh(buildHull([
        { z: 13.0, w: 0.9, h: 0.6, y: 0.4 },
        { z: 10.5, w: 3.6, h: 1.7, y: 0.4 },
        { z: 6.5, w: 6.6, h: 2.5, y: 0.4 },
        { z: 1.5, w: 8.0, h: 3.1, y: 0.3 },
        { z: -4.0, w: 8.4, h: 3.3, y: 0.2 },
        { z: -9.0, w: 7.0, h: 3.1, y: 0.1 },
        { z: -13.0, w: 4.2, h: 2.6, y: 0.0 }
      ]), [armorMat, hullMat, darkMat]);
      group.add(mainHull);

      // 上层建筑
      const superHull = new THREE.Mesh(buildHull([
        { z: 7.5, w: 2.4, h: 0.9, y: 2.9 },
        { z: 4.0, w: 4.2, h: 1.4, y: 3.0 },
        { z: -2.0, w: 3.8, h: 1.4, y: 2.9 },
        { z: -8.0, w: 2.0, h: 1.0, y: 2.7 }
      ]), [armorMat, hullMat, darkMat]);
      group.add(superHull);

      // 舰桥
      addBox(2.4, 1.0, 2.2, armorMat, 0, 4.3, 1.2);
      addBox(2.0, 0.3, 2.0, trimMat, 0, 4.95, 1.2);
      addGlowBox(2.1, 0.14, 0.08, 0, 4.45, 2.32);
      addGlowBox(2.1, 0.14, 0.08, 0, 4.15, 2.32);

      // ========== 装甲甲板（贴合舰体的分层披甲，避免漂浮方板） ==========
      const deck = new THREE.Mesh(buildHull([
        { z: 8.2, w: 2.2, h: 0.42, y: 2.8 },
        { z: 5.0, w: 3.6, h: 0.55, y: 2.9 },
        { z: 0.5, w: 4.0, h: 0.6, y: 2.95 },
        { z: -4.5, w: 3.4, h: 0.55, y: 2.9 },
        { z: -8.0, w: 2.2, h: 0.42, y: 2.8 }
      ]), [armorMat, hullMat, darkMat]);
      group.add(deck);

      // 甲板两侧的金色压条
      for (let side = -1; side <= 1; side += 2) {
        const rail = addBox(0.4, 0.18, 9.4, trimMat, side * 3.35, 2.56, 0.2);
        rail.rotation.z = side * 0.3;
      }
      addBox(0.5, 0.16, 3.0, trimMat, 0, 3.42, 4.4);
      addBox(0.5, 0.16, 2.0, trimMat, 0, 3.5, 1.6);

      // 舰体侧舷发光窗带
      for (let side = -1; side <= 1; side += 2) {
        for (let k = 0; k < 7; k++) {
          addGlowBox(0.08, 0.16, 0.5, side * 7.55, 0.4, 5.4 - k * 1.5);
        }
        addBox(0.22, 0.35, 12.0, trimMat, side * 7.9, 1.35, -1.6);
        // 沿舰体侧舷断续的能量舷灯（远距离也能读出轮廓）
        const flankLights = [
          { z: 3.0, x: 7.35, len: 3.4 },
          { z: -0.4, x: 8.15, len: 3.6 },
          { z: -4.4, x: 8.0, len: 3.6 },
          { z: -8.0, x: 6.9, len: 3.4 }
        ];
        for (let k = 0; k < flankLights.length; k++) {
          const f = flankLights[k];
          addGlowBox(0.08, 0.1, f.len, side * f.x, 0.95, f.z);
        }
      }

      // ========== 舰首撞角 ==========
      const ram = addCyl(0.15, 1.05, 5.2, 8, trimMat, 0, 0.45, 15.2, 'z');
      ram.rotation.x = Math.PI / 2;
      for (let side = -1; side <= 1; side += 2) {
        addBox(0.55, 0.55, 5.4, darkMat, side * 2.3, 0.35, 12.4, side * 0.09);
        addGlowBox(0.1, 0.16, 1.4, side * 2.55, 0.35, 14.2);
        addBox(0.75, 0.14, 1.2, trimMat, side * 2.3, 0.7, 11.4);
      }

      // ========== 发光核心（舰体心脏） ==========
      const coreX = 0;
      const coreY = 4.1;
      const coreZ = 2.6;

      // 核心能量井：内凹暗色结构 + 金属护环 + 放射状装甲撑条
      addCyl(3.0, 2.6, 1.0, 16, darkMat, 0, coreY, coreZ - 0.1, 'z');
      const frameRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.05, 0.16, 8, 36),
        trimMat
      );
      frameRing.position.set(0, coreY, coreZ + 1.55);
      group.add(frameRing);
      for (let k = 0; k < 4; k++) {
        const ang = Math.PI / 4 + k * Math.PI / 2;
        const strut = addBox(
          2.4, 0.24, 0.32, armorMat,
          Math.cos(ang) * 2.85, coreY + Math.sin(ang) * 2.85, coreZ + 1.5
        );
        strut.rotation.z = ang;
      }
      for (let side = -1; side <= 1; side += 2) {
        const tower = addBox(2.0, 4.2, 4.6, armorMat, side * 4.3, 3.5, coreZ);
        tower.rotation.z = side * -0.08;
        addBox(0.22, 3.6, 4.2, trimMat, side * 3.35, 3.4, coreZ);
      }
      // 核心上方的斜置装甲眉板（形成内收的护罩，而不是平铺方板）
      for (let side = -1; side <= 1; side += 2) {
        const brow = addBox(3.4, 0.45, 4.2, armorMat, side * 2.5, 5.05, coreZ - 0.2);
        brow.rotation.z = side * -0.3;
        const browTrim = addBox(0.5, 0.16, 3.8, trimMat, side * 1.15, 5.55, coreZ - 0.2);
        browTrim.rotation.z = side * -0.3;
      }
      // 核心后方的机械拱架
      const coreArch = new THREE.Mesh(
        new THREE.TorusGeometry(3.45, 0.13, 6, 28, Math.PI),
        trimMat
      );
      coreArch.position.set(0, coreY, coreZ - 1.4);
      group.add(coreArch);

      const core = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 16), coreMat);
      core.position.set(coreX, coreY, coreZ + 0.35);
      group.add(core);
      glowParts.push(core);

      // 白热内核（不参与阶段变色，保持炽白焦点）
      const coreHot = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 14, 12),
        new THREE.MeshBasicMaterial({
          color: 0xfff0f8,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      coreHot.position.copy(core.position).setZ(core.position.z + 0.5);
      group.add(coreHot);

      const coreShell = new THREE.Mesh(
        new THREE.SphereGeometry(2.35, 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0xff2266,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      coreShell.position.copy(core.position);
      group.add(coreShell);
      glowParts.push(coreShell);

      const coreRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.0, 0.16, 8, 40, Math.PI * 1.6),
        accentMat
      );
      coreRing.position.set(coreX, coreY, coreZ + 1.25);
      coreRing.rotation.y = 0.12;
      coreRing.name = 'coreRing';
      group.add(coreRing);

      const coreRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(3.9, 0.09, 6, 48),
        glowMat.clone()
      );
      coreRing2.position.set(coreX, coreY, coreZ + 0.1);
      coreRing2.rotation.x = Math.PI / 2;
      group.add(coreRing2);
      glowParts.push(coreRing2);

      // 机械虹膜：环形装甲 + 放射肋条，把“白球”压成反应堆光圈
      const irisZ = coreZ + 2.25;
      const iris = new THREE.Mesh(new THREE.RingGeometry(1.62, 2.7, 24, 1), darkMat);
      iris.position.set(coreX, coreY, irisZ);
      group.add(iris);
      const irisRim = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.11, 6, 26), trimMat);
      irisRim.position.set(coreX, coreY, irisZ + 0.04);
      group.add(irisRim);
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        const rib = addBox(
          1.02, 0.1, 0.1, armorMat,
          coreX + Math.cos(a) * 2.16, coreY + Math.sin(a) * 2.16, irisZ + 0.05
        );
        rib.rotation.z = a;
      }

      // ========== 侧翼与炮座 ==========
      let leftMuzzleRef = null;
      let rightMuzzleRef = null;

      // 翼型截面（z 前后 / y 上下），前缘圆钝、后缘收薄
      const WSEC = [
        [0.98, 0.0],
        [0.50, 0.70],
        [-0.35, 1.0],
        [-0.98, 0.0],
        [-0.35, -0.80],
        [0.50, -0.55]
      ];
      const WING_STATIONS = [
        { x: 3.2, zc: 1.00, chord: 9.6, th: 1.30, y: 0.30 },
        { x: 6.2, zc: 0.00, chord: 8.6, th: 1.05, y: 0.42 },
        { x: 9.2, zc: -1.20, chord: 7.2, th: 0.85, y: 0.55 },
        { x: 12.6, zc: -2.40, chord: 5.6, th: 0.65, y: 0.68 }
      ];
      const wingMats = [armorMat.clone(), hullMat.clone(), darkMat.clone()];
      wingMats.forEach(m => { m.side = THREE.DoubleSide; });

      // 沿翼展放样出真正有厚度、有后掠的翼面
      const buildWingMesh = (side, stations, sec, mats) => {
        const n = sec.length;
        const pos = [];
        for (let i = 0; i < stations.length; i++) {
          const s = stations[i];
          for (let j = 0; j < n; j++) {
            pos.push(
              side * s.x,
              s.y + sec[j][1] * s.th * 0.5,
              s.zc + sec[j][0] * s.chord * 0.5
            );
          }
        }
        const idx = (i, j) => i * n + j;
        const groups = [[], [], []];
        for (let i = 0; i < stations.length - 1; i++) {
          for (let j = 0; j < n; j++) {
            const j2 = (j + 1) % n;
            const a = idx(i, j), b = idx(i, j2), c = idx(i + 1, j2), d = idx(i + 1, j);
            const g = (j === 0) ? 0 : (j === 3 ? 2 : 1);
            groups[g].push(a, b, c, a, c, d);
          }
        }
        // 翼尖封盖
        const lastI = stations.length - 1;
        const tipCenter = pos.length / 3;
        pos.push(side * stations[lastI].x, stations[lastI].y, stations[lastI].zc);
        for (let j = 0; j < n; j++) {
          groups[1].push(tipCenter, idx(lastI, j), idx(lastI, (j + 1) % n));
        }
        const indices = [];
        const geometry = new THREE.BufferGeometry();
        let start = 0;
        for (let g = 0; g < 3; g++) {
          for (let k = 0; k < groups[g].length; k++) indices.push(groups[g][k]);
          geometry.addGroup(start, groups[g].length, g);
          start += groups[g].length;
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return new THREE.Mesh(geometry, mats);
      };

      const buildEdgeTube = (side, stations, secIndex, radius, mat) => {
        const pts = stations.map(s => new THREE.Vector3(
          side * s.x,
          s.y + (secIndex === 0 ? 0.05 : 0),
          s.zc + WSEC[secIndex][0] * s.chord * 0.5
        ));
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, radius, 6, false),
          mat
        );
        group.add(tube);
        return tube;
      };

      for (let side = -1; side <= 1; side += 2) {
        // 主翼面
        group.add(buildWingMesh(side, WING_STATIONS, WSEC, wingMats));

        // 上层附加装甲板（分层感）
        const plateStations = [
          { x: 4.4, zc: 0.85, chord: 4.8, th: 0.30, y: 0.90 },
          { x: 7.6, zc: 0.05, chord: 3.8, th: 0.24, y: 0.98 },
          { x: 10.2, zc: -0.95, chord: 2.6, th: 0.18, y: 1.02 }
        ];
        group.add(buildWingMesh(side, plateStations, WSEC, wingMats));

        // 前缘能量光带
        const leadGlow = buildEdgeTube(side, WING_STATIONS, 0, 0.12, glowMat.clone());
        glowParts.push(leadGlow);
        // 后缘结构管
        buildEdgeTube(side, WING_STATIONS, 3, 0.11, trimMat);

        // 翼面面板线
        for (let k = 1; k < WING_STATIONS.length; k++) {
          const s = WING_STATIONS[k];
          const line = addBox(
            0.09, 0.06, s.chord * 0.82, darkMat,
            side * s.x, s.y + s.th * 0.42, s.zc - s.chord * 0.05
          );
          line.rotation.y = side * 0.1;
        }

        // 翼下挂载舱
        addBox(1.7, 0.85, 3.4, darkMat, side * 6.1, -0.35, 0.8);
        addBox(1.3, 0.3, 2.8, trimMat, side * 6.1, 0.08, 0.8);

        // 翼面识别灯带
        addGlowBox(4.6, 0.07, 0.16, side * 8.4, 1.12, 1.9);
        addGlowBox(3.2, 0.07, 0.16, side * 10.2, 1.2, -1.2);

        // ---------- 翼尖主炮舱 ----------
        const nx = side * 12.1;
        const ny = 0.85;
        const nz = -0.4;
        addCyl(0.95, 1.15, 5.4, 8, darkMat, nx, ny, nz, 'z');
        addBox(1.9, 0.5, 4.4, armorMat, nx, ny + 0.85, nz);
        addBox(1.5, 0.26, 3.4, trimMat, nx, ny + 1.16, nz + 0.2);
        // 前部炮罩
        addCyl(0.36, 1.0, 1.9, 8, armorMat, nx, ny, nz + 3.5, 'z');
        addCyl(0.16, 0.36, 0.5, 8, darkMat, nx, ny, nz + 4.6, 'z');
        // 炮舱环箍
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(1.03, 0.1, 6, 20),
          trimMat
        );
        band.position.set(nx, ny, nz + 0.9);
        group.add(band);
        // 双联主炮
        addCyl(0.17, 0.19, 3.2, 8, darkMat, nx - 0.45, ny, nz + 3.6, 'z');
        addCyl(0.17, 0.19, 3.2, 8, darkMat, nx + 0.45, ny, nz + 3.6, 'z');
        addCyl(0.26, 0.26, 0.5, 8, trimMat, nx - 0.45, ny, nz + 5.0, 'z');
        addCyl(0.26, 0.26, 0.5, 8, trimMat, nx + 0.45, ny, nz + 5.0, 'z');
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), glowMat.clone());
        muzzle.position.set(nx, ny, nz + 5.3);
        group.add(muzzle);
        glowParts.push(muzzle);
        if (side < 0) {
          leftMuzzleRef = muzzle;
        } else {
          rightMuzzleRef = muzzle;
        }
        // 炮舱外侧识别灯
        addGlowBox(0.1, 0.1, 3.2, side * 13.1, ny + 0.5, nz);

        // ---------- 翼面副炮塔 ----------
        const turretDefs = [
          { x: 5.4, z: -1.8 },
          { x: 7.4, z: -3.6 }
        ];
        for (let k = 0; k < turretDefs.length; k++) {
          const td = turretDefs[k];
          const tx = side * td.x;
          addCyl(0.6, 0.72, 0.34, 10, armorMat, tx, 1.08, td.z);
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.52, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            darkMat
          );
          dome.position.set(tx, 1.24, td.z);
          group.add(dome);
          addCyl(0.07, 0.07, 1.4, 6, trimMat, tx, 1.45, td.z + 0.6, 'z');
          addCyl(0.13, 0.13, 0.3, 8, trimMat, tx, 1.45, td.z + 1.3, 'z');
        }

        // 翼尖垂直安定面（增强正面剪影）
        const fin = addBox(0.16, 2.6, 2.5, armorMat, side * 12.2, 2.35, -1.9);
        fin.rotation.x = -0.22;
        const finEdge = addBox(0.2, 0.16, 2.3, trimMat, side * 12.2, 3.62, -2.06);
        finEdge.rotation.x = -0.22;
        const finGlow = addBox(0.06, 0.07, 1.9, glowMat.clone(), side * 12.12, 3.56, -2.12);
        finGlow.rotation.x = -0.22;
        glowParts.push(finGlow);

        // 翼尖航行灯
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), accentMat.clone());
        navLight.position.set(side * 12.3, 1.1, -5.0);
        group.add(navLight);
        glowParts.push(navLight);
      }

      // ========== 肩部背鳍 ==========
      for (let side = -1; side <= 1; side += 2) {
        const dfin = addBox(0.24, 3.2, 3.2, armorMat, side * 5.0, 4.15, -6.2);
        dfin.rotation.x = -0.28;
        dfin.rotation.z = side * -0.1;
        const dfinTrim = addBox(0.3, 0.16, 2.8, trimMat, side * 5.0, 5.62, -6.68);
        dfinTrim.rotation.x = -0.28;
        dfinTrim.rotation.z = side * -0.1;
        const dfinGlow = addBox(0.07, 0.07, 2.2, glowMat.clone(), side * 5.0, 5.55, -6.75);
        dfinGlow.rotation.x = -0.28;
        dfinGlow.rotation.z = side * -0.1;
        glowParts.push(dfinGlow);
      }

      // ========== 舰尾引擎组 ==========
      const engineDefs = [
        { x: 0, y: 0.6, r: 1.35 },
        { x: -4.2, y: 1.7, r: 0.8 },
        { x: 4.2, y: 1.7, r: 0.8 },
        { x: -4.2, y: -0.8, r: 0.8 },
        { x: 4.2, y: -0.8, r: 0.8 }
      ];
      engineDefs.forEach(def => {
        addCyl(def.r * 1.15, def.r * 1.3, 2.2, 12, darkMat, def.x, def.y, -13.1, 'z');
        addCyl(def.r * 0.85, def.r * 0.55, 0.8, 10, trimMat, def.x, def.y, -14.2, 'z');
        const eg = new THREE.Mesh(
          new THREE.SphereGeometry(def.r * 0.72, 10, 10),
          glowMat.clone()
        );
        eg.position.set(def.x, def.y, -14.3);
        eg.scale.z = 0.5;
        group.add(eg);
        accentParts.push(eg);

        const flameMat = accentMat.clone();
        flameMat.opacity = 0.26;
        const flame = new THREE.Mesh(
          new THREE.CylinderGeometry(def.r * 0.8, def.r * 0.1, 5, 10, 1, true).rotateX(Math.PI / 2),
          flameMat
        );
        flame.position.set(def.x, def.y, -17.0);
        group.add(flame);
        accentParts.push(flame);
      });

      // ========== 舰尾垂翼 ==========
      addBox(0.35, 4.6, 3.4, armorMat, 0, 4.9, -8.6);
      addBox(0.14, 4.2, 0.3, trimMat, 0, 4.9, -7.0);
      for (let side = -1; side <= 1; side += 2) {
        addBox(0.3, 3.6, 2.8, hullMat, side * 3.1, 3.9, -8.8, 0, side * -0.22);
        addBox(0.12, 3.2, 0.24, trimMat, side * 2.45, 3.9, -7.6, 0, side * -0.22);
      }

      // ========== 天线与杂项细节 ==========
      for (let side = -1; side <= 1; side += 2) {
        addCyl(0.05, 0.08, 3.2, 5, darkMat, side * 3.9, 5.4, -5.6);
        const tipLight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), glowMat.clone());
        tipLight.position.set(side * 3.9, 7.0, -5.6);
        group.add(tipLight);
        glowParts.push(tipLight);

        // 侧散热片
        for (let k = 0; k < 4; k++) {
          addBox(0.1, 0.55, 1.5, darkMat, side * 8.3, 0.25, -3.0 - k * 1.0);
        }
      }

      // 舰体面板线
      for (let k = 0; k < 5; k++) {
        addBox(12.5, 0.05, 0.14, darkMat, 0, 2.75, 4.6 - k * 2.2);
      }

      // 舰体发光识别条
      addGlowBox(0.18, 0.06, 10.5, 0, 3.9, -3.6);
      addGlowBox(0.18, 0.06, 10.5, -5.6, 1.9, -2.0);
      addGlowBox(0.18, 0.06, 10.5, 5.6, 1.9, -2.0);

      return {
        mesh: group,
        core: core,
        coreRing: coreRing,
        leftCannon: leftMuzzleRef,
        rightCannon: rightMuzzleRef,
        bodyMat: hullMat,
        coreMat: coreMat,
        glowMat: glowMat,
        glowParts: glowParts,
        accentParts: accentParts,
        hp: this.maxHp
      };
    }

    _initBulletPool() {
      const bulletGeom = new THREE.SphereGeometry(0.4, 8, 8);
      const bulletMat = new THREE.MeshBasicMaterial({
        color: 0xff2266,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      // 外层光晕
      const haloGeom = new THREE.SphereGeometry(0.7, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xff0044,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      for (let i = 0; i < BULLET_POOL_SIZE; i++) {
        const group = new THREE.Group();

        const core = new THREE.Mesh(bulletGeom, bulletMat.clone());
        group.add(core);

        const halo = new THREE.Mesh(haloGeom, haloMat.clone());
        group.add(halo);

        group.visible = false;
        this.scene.add(group);

        this.bulletPool.push({
          mesh: group,
          core: core,
          halo: halo,
          active: false,
          velocity: new THREE.Vector3(),
          radius: 0.45
        });
      }
    }

    _initLaserBeam() {
      // 激光束是一个细长的光柱，横跨整个玩家活动区域
      const laserGeom = new THREE.BoxGeometry(14, 0.3, 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0xff2266,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.laserBeam = new THREE.Mesh(laserGeom, laserMat);
      this.laserBeam.visible = false;
      this.laserBeam.position.set(0, 0, -25);
      this.scene.add(this.laserBeam);

      // 激光警告线（更细的预示线）
      const warnGeom = new THREE.BoxGeometry(14, 0.05, 1);
      const warnMat = new THREE.MeshBasicMaterial({
        color: 0xff4466,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.laserWarning = new THREE.Mesh(warnGeom, warnMat);
      this.laserWarning.visible = false;
      this.laserWarning.position.set(0, 0, -28);
      this.scene.add(this.laserWarning);
    }

    _initHitSparkPool() {
      const sparkGeom = new THREE.SphereGeometry(0.15, 6, 6);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffff88,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      for (let i = 0; i < this.HIT_SPARK_POOL_SIZE; i++) {
        const spark = new THREE.Mesh(sparkGeom, sparkMat.clone());
        spark.visible = false;
        this.scene.add(spark);
        this.hitSparkPool.push({
          mesh: spark,
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 0.5,
          active: false
        });
      }
    }

    _spawnHitSpark(position, color) {
      for (let i = 0; i < 6; i++) {
        const spark = this.hitSparkPool.find(s => !s.active);
        if (!spark) break;

        spark.mesh.position.copy(position);
        spark.mesh.material.color.setHex(color || 0xffff44);
        spark.velocity.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6
        );
        spark.life = 0.4 + Math.random() * 0.2;
        spark.maxLife = spark.life;
        spark.mesh.scale.setScalar(0.5 + Math.random() * 1.5);
        spark.mesh.visible = true;
        spark.active = true;
        this.activeHitSparks.push(spark);
      }
    }

    _updateHitSparks(dt) {
      for (let i = this.activeHitSparks.length - 1; i >= 0; i--) {
        const spark = this.activeHitSparks[i];
        spark.life -= dt;
        if (spark.life <= 0) {
          spark.active = false;
          spark.mesh.visible = false;
          this.activeHitSparks.splice(i, 1);
          continue;
        }
        const t = spark.life / spark.maxLife;
        spark.mesh.material.opacity = t;
        spark.mesh.position.addScaledVector(spark.velocity, dt);
        spark.velocity.multiplyScalar(1 - dt * 2);
      }
    }

    _clearHitSparks() {
      for (let i = this.activeHitSparks.length - 1; i >= 0; i--) {
        const s = this.activeHitSparks[i];
        s.active = false;
        s.mesh.visible = false;
      }
      this.activeHitSparks.length = 0;
    }

    /**
     * 触发Boss战
     */
    startBoss() {
      if (this.state !== BOSS_STATE.IDLE) return;

      this.state = BOSS_STATE.ENTERING;
      this.hp = this.maxHp;
      this.phase = 1;
      this.attackTimer = 2; // 入场后2秒开始第一次攻击
      this.currentAttack = null;
      this.targetX = 0;
      this.targetY = 0;
      this.shakeAmount = 0;
      this.bobTime = 0;

      // 重置Boss位置（从上方下来）
      this.boss.mesh.position.set(0, 10, this.baseZ);
      this.boss.mesh.visible = true;
      this.boss.mesh.scale.setScalar(1);

      // 重置核心颜色到阶段1
      this._setPhaseColor(1);

      // 清空子弹
      this._clearBullets();

      // 关闭激光
      this.laserActive = false;
      this.laserBeam.visible = false;
      this.laserWarning.visible = false;

      this.onBossAppear?.();
      this.onHpChange?.(this.hp, this.maxHp);
    }

    _setPhaseColor(phase) {
      if (!this.boss) return;
      let color, glowColor, accentColor;
      switch (phase) {
        case 1:
          color = 0xff2266; glowColor = 0xff0044; accentColor = 0xff0066; break;
        case 2:
          color = 0xffaa00; glowColor = 0xff7700; accentColor = 0xffcc33; break;
        case 3:
          color = 0xff2200; glowColor = 0xcc0000; accentColor = 0xff4422; break;
        default:
          color = 0xff2266; glowColor = 0xff0044; accentColor = 0xff0066;
      }

      // 改变核心颜色
      this.boss.core.material.color.setHex(color);
      this.boss.coreRing.material.color.setHex(accentColor);
      this.boss.leftCannon.material.color.setHex(color);
      this.boss.rightCannon.material.color.setHex(color);

      // 改变所有主发光部件
      if (this.boss.glowParts) {
        for (let i = 0; i < this.boss.glowParts.length; i++) {
          this.boss.glowParts[i].material.color.setHex(color);
        }
      }

      // 改变所有辅助发光部件
      if (this.boss.accentParts) {
        for (let i = 0; i < this.boss.accentParts.length; i++) {
          this.boss.accentParts[i].material.color.setHex(accentColor);
        }
      }

      // 改变子弹颜色（池里所有子弹）
      for (let i = 0; i < this.bulletPool.length; i++) {
        this.bulletPool[i].core.material.color.setHex(color);
        this.bulletPool[i].halo.material.color.setHex(glowColor);
      }

      // 改变激光颜色
      this.laserBeam.material.color.setHex(color);
      this.laserWarning.material.color.setHex(glowColor);
    }

    _clearBullets() {
      for (let i = this.activeBullets.length - 1; i >= 0; i--) {
        const b = this.activeBullets[i];
        b.active = false;
        b.mesh.visible = false;
      }
      this.activeBullets.length = 0;
    }

    /**
     * 对Boss造成伤害
     * @returns {boolean} 是否击败
     */
    takeDamage(amount, hitPosition) {
      if (this.state !== BOSS_STATE.FIGHTING) return false;

      this.hp -= amount;
      this.hitFlashTimer = 0.15; // 增强受击闪烁
      this.shakeAmount = Math.max(this.shakeAmount, 0.35);

      // 命中火花 + 命中回调
      if (hitPosition) {
        this._spawnHitSpark(hitPosition, this.phase === 3 ? 0xff6644 : 0xffee44);
      }
      this.onHit?.({ damage: amount, position: hitPosition });

      if (this.hp <= 0) {
        this.hp = 0;
        this.onHpChange?.(0, this.maxHp);
        this._defeat();
        return true;
      }

      // 阶段切换检测
      const hpRatio = this.hp / this.maxHp;
      let targetPhase = 1;
      if (hpRatio < 0.33) targetPhase = 3;
      else if (hpRatio < 0.66) targetPhase = 2;

      if (targetPhase > this.phase && this.state === BOSS_STATE.FIGHTING) {
        this._startPhaseTransition(targetPhase);
      }

      this.onHpChange?.(this.hp, this.maxHp);
      return false;
    }

    _startPhaseTransition(newPhase) {
      this.phase = newPhase;
      this.state = BOSS_STATE.PHASE_TRANSITION;
      this.attackTimer = 2; // 2秒切换时间

      // 改变颜色
      this._setPhaseColor(newPhase);

      this.onPhaseChange?.(newPhase);
    }

    _defeat() {
      this.state = BOSS_STATE.DEFEATED;
      this.laserActive = false;
      this.laserBeam.visible = false;
      this.laserWarning.visible = false;
      this._clearBullets();
      this.shakeAmount = 2;
      this.onBossDefeated?.();
    }

    _spawnBullet(x, y, z, vx, vy, vz) {
      const bullet = this.bulletPool.find(b => !b.active);
      if (!bullet) return null;

      bullet.mesh.position.set(x, y, z);
      bullet.velocity.set(vx, vy, vz);
      bullet.mesh.visible = true;
      bullet.active = true;
      this.activeBullets.push(bullet);
      return bullet;
    }

    _doBulletSpread() {
      // 散射弹幕：从两门炮口发射扇形弹幕
      const spreadAngle = Math.PI / 3; // 60度扇形
      const bulletCount = 5 + this.phase * 2; // 阶段越高子弹越多
      const speed = BOSS_BULLET_SPEED * (1 + (this.phase - 1) * 0.2);

      for (let cannon = -1; cannon <= 1; cannon += 2) {
        const startX = this.boss.mesh.position.x + cannon * 12;
        const startY = this.boss.mesh.position.y;
        const startZ = this.boss.mesh.position.z + 2;

        for (let i = 0; i < bulletCount; i++) {
          const t = bulletCount === 1 ? 0.5 : i / (bulletCount - 1);
          const angle = -Math.PI / 2 + (t - 0.5) * spreadAngle;
          // 子弹向玩家方向（+Z方向）飞
          const vx = Math.cos(angle) * speed * 0.3 * cannon;
          const vy = Math.sin(angle) * speed * 0.3;
          const vz = speed; // 飞向玩家（+Z方向 = 靠近玩家）
          this._spawnBullet(startX, startY, startZ, vx, vy, vz);
        }
      }
    }

    _startCharge() {
      // 冲撞第一阶段：预警/聚能（约1秒，阶段越高越短）
      // Boss 停止当前动作并聚能高亮，随后才真正俯冲
      this.chargeState = 'warn'; // warn → attack → done
      this.chargeWarnTime = Math.max(0.7, 1.2 - (this.phase - 1) * 0.2);
      this.chargeProgress = 0;
      this.chargeSpeed = 2.5 + this.phase * 0.5; // 实际冲撞秒数
      
      // 记录起始位置（预警阶段 Boss 微微上浮蓄势）
      this.chargeStartPos.copy(this.boss.mesh.position);
      // 目标位置：朝玩家方向冲过来，停在玩家前方10单位
      this.chargeEndPos.set(
        this.boss.mesh.position.x + (Math.random() - 0.5) * 3,
        this.boss.mesh.position.y + (Math.random() - 0.5) * 1.5,
        this.baseZ + 30 // 冲到离玩家很近的位置
      );

      // 预警回调（用于屏幕预警指示）
      this.onChargeWarn?.({
        x: this.chargeEndPos.x,
        y: this.chargeEndPos.y,
        z: this.chargeEndPos.z
      });
    }

    _startLaserBeam() {
      // 激光束：先有警告线，然后发射激光
      this.laserWarningTime = 1.2; // 1.2秒警告
      this.laserTargetY = (Math.random() - 0.5) * 5; // 目标高度
      this.laserWidth = 0;
      this.laserActive = false;
      this.laserWarning.visible = true;
      this.laserWarning.position.y = this.laserTargetY;
      this.laserWarning.material.opacity = 0.6;
    }

    _fireLaserBeam() {
      this.laserActive = true;
      this.laserBeam.visible = true;
      this.laserBeam.position.y = this.laserTargetY;
      this.laserWidth = 1.5;
      this.laserBeam.material.opacity = 0.8;
      this.attackDuration = 1.5; // 激光持续1.5秒
    }

    /**
     * 检查激光束与玩家的碰撞
     */
    checkLaserCollision(playerPos, playerRadius) {
      if (!this.laserActive) return false;
      if (this.state !== BOSS_STATE.FIGHTING) return false;

      // 激光是横向的条带，检测玩家y位置是否在激光范围内
      const laserY = this.laserBeam.position.y;
      const halfHeight = this.laserWidth / 2 + playerRadius * 0.5;

      if (Math.abs(playerPos.y - laserY) < halfHeight) {
        return true;
      }
      return false;
    }

    update(dt, playerPos) {
      if (this.state === BOSS_STATE.IDLE) return;

      this.bobTime += dt;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 3);

      // 受击闪烁
      if (this.hitFlashTimer > 0) {
        this.hitFlashTimer -= dt;
        const flashIntensity = this.hitFlashTimer > 0 ? 0.8 : 0;
        this.boss.core.material.opacity = 0.6 + flashIntensity * 0.4;
      }

      // 核心光环旋转
      if (this.boss.coreRing) {
        this.boss.coreRing.rotation.z += dt * (1 + this.phase * 0.5);
      }

      switch (this.state) {
        case BOSS_STATE.ENTERING:
          this._updateEntering(dt);
          break;
        case BOSS_STATE.FIGHTING:
          this._updateFighting(dt, playerPos);
          break;
        case BOSS_STATE.PHASE_TRANSITION:
          this._updatePhaseTransition(dt);
          break;
        case BOSS_STATE.DEFEATED:
          this._updateDefeated(dt);
          break;
      }

      // 更新子弹
      this._updateBullets(dt);

      // 更新激光
      this._updateLaser(dt);

      // 更新命中火花
      this._updateHitSparks(dt);

      // 震屏效果（Boss自身抖动）
      if (this.shakeAmount > 0.01) {
        const shakeX = (Math.random() - 0.5) * this.shakeAmount;
        const shakeY = (Math.random() - 0.5) * this.shakeAmount;
        this.boss.mesh.position.x += shakeX * 0.3;
        this.boss.mesh.position.y += shakeY * 0.3;
      }
    }

    _updateEntering(dt) {
      // Boss从上方入场
      const targetY = 0;
      const currentY = this.boss.mesh.position.y;
      this.boss.mesh.position.y += (targetY - currentY) * 2 * dt;

      if (Math.abs(currentY - targetY) < 0.2) {
        this.state = BOSS_STATE.FIGHTING;
        this.boss.mesh.position.y = targetY;
        this.attackTimer = 1.5;
      }
    }

    _updateFighting(dt, playerPos) {
      // Boss漂浮移动 + 轻微追踪玩家
      const bobY = Math.sin(this.bobTime * 0.8) * 0.8;
      const bobX = Math.sin(this.bobTime * 0.5) * 2;

      // 缓慢追踪玩家x位置
      this.targetX += (playerPos.x * 0.5 - this.targetX) * 0.3 * dt;

      this.boss.mesh.position.x = this.targetX + bobX;
      this.boss.mesh.position.y = bobY;
      this.boss.mesh.position.z = this.baseZ + Math.sin(this.bobTime * 0.7) * 1.5;

      // 攻击计时
      this.attackTimer -= dt;

      if (this.currentAttack === BOSS_ATTACK.CHARGE) {
        // 冲撞攻击
        if (this.chargeState === 'warn') {
          // 预警阶段：Boss 原地聚能，红光高亮
          this.chargeWarnTime -= dt;
          
          // 聚能浮动：Boss 轻微上下抖动蓄势
          const bobWarn = Math.sin(this.bobTime * 6) * 0.3;
          this.boss.mesh.position.y = this.chargeStartPos.y + bobWarn;
          
          // 核心发光增强（脉冲）
          const pulseIntensity = 0.6 + Math.sin(this.bobTime * 8) * 0.4;
          if (this.boss.core) {
            this.boss.core.material.opacity = 0.6 + pulseIntensity * 0.4;
            this.boss.core.material.color.setHex(0xff3344);
          }
          if (this.boss.coreRing) {
            this.boss.coreRing.material.opacity = 0.5 + pulseIntensity * 0.3;
            this.boss.coreRing.material.color.setHex(0xff2244);
          }

          if (this.chargeWarnTime <= 0) {
            this.chargeState = 'attack';
            this.chargeProgress = 0;
          }
          return;
        }

        if (this.chargeState === 'attack') {
          // 实际冲撞
          this.chargeProgress += dt / this.chargeSpeed;

          if (this.chargeProgress < 0.5) {
            // 前半段：冲过去（加速）
            const t = this.chargeProgress * 2;
            const ease = t * t;
            this.boss.mesh.position.lerpVectors(
              this.chargeStartPos, this.chargeEndPos, ease
            );
          } else if (this.chargeProgress < 1) {
            // 后半段：回来（减速）
            const t = (this.chargeProgress - 0.5) * 2;
            const ease = 1 - (1 - t) * (1 - t);
            this.boss.mesh.position.lerpVectors(
              this.chargeEndPos, this.chargeStartPos, ease
            );
          } else {
            // 冲撞结束，进入冷却停顿
            this.chargeState = 'cooldown';
            this.attackTimer = Math.max(1.2, 2.5 - this.phase * 0.3);
            this.currentAttack = null;
            // 恢复核心颜色
            this._setPhaseColor(this.phase);
          }
          return;
        }
      }

      if (this.attackTimer <= 0 && !this.currentAttack) {
        this._chooseAttack(playerPos);
      }

      if (this.currentAttack === BOSS_ATTACK.LASER_BEAM) {
        if (this.laserWarningTime > 0) {
          this.laserWarningTime -= dt;
          // 警告线闪烁
          this.laserWarning.material.opacity = 0.3 + Math.sin(dt * 60) * 0.3;
          if (this.laserWarningTime <= 0) {
            this._fireLaserBeam();
          }
        }
      }
    }

    _chooseAttack(playerPos) {
      // 随机选择攻击模式，阶段越高攻击越频繁
      const attacks = [BOSS_ATTACK.BULLET_SPREAD];
      if (this.phase >= 1) attacks.push(BOSS_ATTACK.CHARGE);
      if (this.phase >= 2) attacks.push(BOSS_ATTACK.LASER_BEAM);

      const choice = attacks[Math.floor(Math.random() * attacks.length)];
      this.currentAttack = choice;

      switch (choice) {
        case BOSS_ATTACK.BULLET_SPREAD:
          this._doBulletSpread();
          this.currentAttack = null; // 瞬发，不算持续攻击
          this.attackTimer = Math.max(0.6, 1.5 - this.phase * 0.3);
          break;
        case BOSS_ATTACK.CHARGE:
          this._startCharge();
          break;
        case BOSS_ATTACK.LASER_BEAM:
          this._startLaserBeam();
          break;
      }
    }

    _updatePhaseTransition(dt) {
      this.attackTimer -= dt;
      // 阶段切换时Boss剧烈抖动+核心快速旋转
      this.boss.coreRing.rotation.z += dt * 8;

      if (this.attackTimer <= 0) {
        this.state = BOSS_STATE.FIGHTING;
        this.attackTimer = 1;
      }
    }

    _updateDefeated(dt) {
      // Boss爆炸收缩
      this.boss.mesh.scale.multiplyScalar(1 - dt * 0.5);
      this.boss.core.material.opacity = Math.max(0, this.boss.core.material.opacity - dt);
      this.shakeAmount = Math.max(this.shakeAmount, 1.5 * (1 - this.boss.mesh.scale.x));

      if (this.boss.mesh.scale.x < 0.1) {
        this.boss.mesh.visible = false;
        this.state = BOSS_STATE.IDLE;
      }
    }

    _updateBullets(dt) {
      for (let i = this.activeBullets.length - 1; i >= 0; i--) {
        const b = this.activeBullets[i];
        b.mesh.position.x += b.velocity.x * dt;
        b.mesh.position.y += b.velocity.y * dt;
        b.mesh.position.z += b.velocity.z * dt;

        // 超出范围回收
        if (b.mesh.position.z > 10 ||
            Math.abs(b.mesh.position.x) > 15 ||
            Math.abs(b.mesh.position.y) > 10) {
          b.active = false;
          b.mesh.visible = false;
          this.activeBullets.splice(i, 1);
        }
      }
    }

    _updateLaser(dt) {
      if (this.laserActive) {
        this.attackDuration -= dt;
        if (this.attackDuration <= 0) {
          this.laserActive = false;
          this.laserBeam.visible = false;
          this.laserWarning.visible = false;
          this.currentAttack = null;
          this.attackTimer = Math.max(1, 2.5 - this.phase * 0.4);
        }
      }
    }

    /**
     * 检测子弹与玩家碰撞
     */
    checkPlayerCollision(playerPos, playerRadius) {
      if (this.state !== BOSS_STATE.FIGHTING && this.state !== BOSS_STATE.PHASE_TRANSITION) {
        return false;
      }

      for (let i = 0; i < this.activeBullets.length; i++) {
        const b = this.activeBullets[i];
        const dx = b.mesh.position.x - playerPos.x;
        const dy = b.mesh.position.y - playerPos.y;
        const dz = b.mesh.position.z - playerPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < playerRadius + b.radius) {
          return true;
        }
      }

      return false;
    }

    /**
     * 检测激光与玩家碰撞
     */
    checkLaserPlayerCollision(playerPos, playerRadius) {
      return this.checkLaserCollision(playerPos, playerRadius);
    }

    /**
     * 检测Boss冲撞与玩家的碰撞
     * 仅在冲撞攻击阶段生效，使用收紧的碰撞盒（Boss机体核心区域）
     */
    checkChargeCollision(playerPos, playerRadius) {
      if (this.state !== BOSS_STATE.FIGHTING) return false;
      if (this.currentAttack !== BOSS_ATTACK.CHARGE) return false;
      if (this.chargeState !== 'attack') return false;

      const bossPos = this.boss.mesh.position;
      // 收紧的冲撞碰撞盒：X方向5、Y方向2、Z方向6
      // 比激光命中判定盒小一圈，避免"擦肩而过判死"
      const dx = (bossPos.x - playerPos.x) / 5;
      const dy = (bossPos.y - playerPos.y) / 2;
      const dz = (bossPos.z - playerPos.z) / 6;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // 再加上玩家半径的修正
      return dist < 1 - playerRadius * 0.3;
    }

    /**
     * 检测激光弹与Boss的碰撞
     * @param {THREE.Vector3} laserPos
     * @returns {boolean} 是否命中
     */
    checkLaserHit(laserPos) {
      if (this.state !== BOSS_STATE.FIGHTING) return null;

      const bossPos = this.boss.mesh.position;
      // Boss碰撞箱（大致估算为椭球）— 匹配战舰体型
      const dx = (laserPos.x - bossPos.x) / 11; // X方向宽大
      const dy = (laserPos.y - bossPos.y) / 3.5;
      const dz = (laserPos.z - bossPos.z) / 9; // Z方向更长
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1) {
        // 返回命中点（激光位置），用于火花生成
        return laserPos.clone();
      }
      return null;
    }

    reset() {
      this.state = BOSS_STATE.IDLE;
      this.boss.mesh.visible = false;
      this._clearBullets();
      this._clearHitSparks();
      this.laserActive = false;
      this.laserBeam.visible = false;
      this.laserWarning.visible = false;
      this.hp = this.maxHp;
      this.phase = 1;
      this.attackTimer = 0;
      this.currentAttack = null;
    }

    dispose() {
      // 清理Boss
      if (this.boss) {
        this.scene.remove(this.boss.mesh);
        this.boss.mesh.traverse(child => {
          if (child.geometry) { try { child.geometry.dispose(); } catch (e) {} }
          if (child.material) { try { child.material.dispose(); } catch (e) {} }
        });
        this.boss = null;
      }

      // 清理子弹池
      this.bulletPool.forEach(b => {
        this.scene.remove(b.mesh);
      });
      this.bulletPool = [];
      this.activeBullets = [];

      // 清理激光
      if (this.laserBeam) {
        this.scene.remove(this.laserBeam);
        try { this.laserBeam.geometry.dispose(); } catch (e) {}
        try { this.laserBeam.material.dispose(); } catch (e) {}
      }
      if (this.laserWarning) {
        this.scene.remove(this.laserWarning);
        try { this.laserWarning.geometry.dispose(); } catch (e) {}
        try { this.laserWarning.material.dispose(); } catch (e) {}
      }
    }
  }

  global.BossManager = BossManager;
  global.BOSS_STATE = BOSS_STATE;
  global.BOSS_ATTACK = BOSS_ATTACK;

})(window);
