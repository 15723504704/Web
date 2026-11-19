/**
 * PowerUpManager - 能量道具管理
 * 加分道具、护盾道具、加速道具、稀有道具
 */
(function(global) {
  'use strict';

  const POWERUP_TYPES = {
    SCORE: 'score',       // 加分道具
    SHIELD: 'shield',     // 护盾
    BOOST: 'boost',       // 加速
    RARE: 'rare'          // 稀有道具（大量加分）
  };

  class PowerUpManager {
    constructor(scene) {
      this.scene = scene;
      this.pool = [];
      this.activePowerUps = [];
      this.spawnTimer = 0;
      this.spawnInterval = 2.5;
      this.baseSpeed = 25;
      this.poolSize = 40; // 每种类型10个
      this.bossActive = false; // Boss战状态

      this.initPool();
    }

    initPool() {
      const types = Object.values(POWERUP_TYPES);
      const perType = Math.ceil(this.poolSize / types.length);
      for (let i = 0; i < perType; i++) {
        types.forEach(type => {
          const powerup = this.createPowerUp(type);
          powerup.mesh.visible = false;
          this.scene.add(powerup.mesh);
          this.pool.push(powerup);
        });
      }
    }

    createPowerUp(type) {
      const group = new THREE.Group();
      let radius = 0.8;

      switch (type) {
        case POWERUP_TYPES.SCORE: {
          // 加分道具 - 发光的八面体
          const geom = new THREE.OctahedronGeometry(0.7, 0);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.9
          });
          const mesh = new THREE.Mesh(geom, mat);
          group.add(mesh);

          // 外发光
          const glowGeom = new THREE.OctahedronGeometry(1.2, 0);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
          });
          const glow = new THREE.Mesh(glowGeom, glowMat);
          group.add(glow);

          // 加号标识（两个相交的环）
          const plusGeom = new THREE.TorusGeometry(0.25, 0.04, 8, 16);
          const plusMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
          const plusH = new THREE.Mesh(plusGeom, plusMat);
          group.add(plusH);
          const plusV = plusH.clone();
          plusV.rotation.x = Math.PI / 2;
          group.add(plusV);
          radius = 0.8;
          break;
        }

        case POWERUP_TYPES.SHIELD: {
          // 护盾道具 - 蓝色球体 + 线框外壳
          const geom = new THREE.SphereGeometry(0.6, 16, 16);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.8
          });
          const mesh = new THREE.Mesh(geom, mat);
          group.add(mesh);

          // 外壳六边形线框
          const hexGeom = new THREE.IcosahedronGeometry(1, 0);
          const hexMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.35,
            wireframe: true,
            blending: THREE.AdditiveBlending
          });
          const hexShell = new THREE.Mesh(hexGeom, hexMat);
          group.add(hexShell);
          group.userData.hexShell = hexShell;
          radius = 0.9;
          break;
        }

        case POWERUP_TYPES.BOOST: {
          // 加速道具 - 闪电形
          const shape = new THREE.Shape();
          shape.moveTo(0.2, 0.6);
          shape.lineTo(-0.2, 0);
          shape.lineTo(0.1, 0);
          shape.lineTo(-0.1, -0.6);
          shape.lineTo(0.3, -0.1);
          shape.lineTo(0, -0.1);
          shape.lineTo(0.2, 0.6);

          const boltGeom = new THREE.ExtrudeGeometry(shape, {
            depth: 0.15,
            bevelEnabled: true,
            bevelSize: 0.03,
            bevelThickness: 0.03
          });
          const boltMat = new THREE.MeshBasicMaterial({
            color: 0xff2fd0,
            transparent: true,
            opacity: 0.95
          });
          const bolt = new THREE.Mesh(boltGeom, boltMat);
          bolt.position.z = -0.075;
          group.add(bolt);

          // 光晕
          const glowGeom = new THREE.SphereGeometry(1, 12, 12);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff2fd0,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
          });
          const glow = new THREE.Mesh(glowGeom, glowMat);
          group.add(glow);
          radius = 0.9;
          break;
        }

        case POWERUP_TYPES.RARE: {
          // 稀有道具 - 五角星
          const starShape = new THREE.Shape();
          const outerR = 0.9;
          const innerR = 0.4;
          const points = 5;
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
          }
          starShape.closePath();

          const starGeom = new THREE.ExtrudeGeometry(starShape, {
            depth: 0.2,
            bevelEnabled: true,
            bevelSize: 0.05,
            bevelThickness: 0.05
          });
          const starMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
          });
          const star = new THREE.Mesh(starGeom, starMat);
          star.position.z = -0.1;
          group.add(star);

          // 彩色光环
          for (let i = 0; i < 3; i++) {
            const ringGeom = new THREE.TorusGeometry(1.2 + i * 0.2, 0.03, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color().setHSL(i / 3, 1, 0.6),
              transparent: true,
              opacity: 0.5,
              blending: THREE.AdditiveBlending
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            group.add(ring);
          }
          radius = 1;
          break;
        }
      }

      return {
        mesh: group,
        type: type,
        radius: radius,
        active: false,
        floatOffset: Math.random() * Math.PI * 2
      };
    }

    spawnPowerUp() {
      // 按概率选择类型
      const rand = Math.random();
      let type;
      if (rand < 0.5) type = POWERUP_TYPES.SCORE;
      else if (rand < 0.75) type = POWERUP_TYPES.SHIELD;
      else if (rand < 0.95) type = POWERUP_TYPES.BOOST;
      else type = POWERUP_TYPES.RARE;

      // 从对象池中找对应类型的空闲对象
      const powerup = this.pool.find(p => !p.active && p.type === type);
      if (!powerup) return; // 该类型池耗尽，跳过本次生成

      // 设置位置
      let laneX, laneY, startZ, velX = 0, velY = 0;

      if (this.bossActive) {
        // Boss战期间：从左右两侧斜前方生成，避免从Boss正后方盲区飞来
        // 50% 左侧，50% 右侧
        const fromLeft = Math.random() < 0.5;
        laneX = fromLeft ? -8 - Math.random() * 3 : 8 + Math.random() * 3;
        laneY = (Math.random() - 0.5) * 4;
        startZ = -60; // 离玩家更近，保证可见
        // 斜向速度：朝玩家方向偏移
        powerup.targetX = (Math.random() - 0.5) * 6;
        powerup.sideEntry = true;
      } else {
        laneX = (Math.random() - 0.5) * 10;
        laneY = (Math.random() - 0.5) * 5;
        startZ = -150;
        powerup.sideEntry = false;
      }

      powerup.mesh.position.set(laneX, laneY, startZ);
      powerup.mesh.visible = true;
      powerup.active = true;
      powerup.floatOffset = Math.random() * Math.PI * 2;

      this.activePowerUps.push(powerup);
    }

    update(deltaTime, speedMultiplier, playerPos) {
      const speed = this.baseSpeed * speedMultiplier;

      // 生成道具
      this.spawnTimer += deltaTime;
      const adjustedInterval = this.spawnInterval / Math.sqrt(speedMultiplier);
      if (this.spawnTimer >= adjustedInterval) {
        this.spawnTimer = 0;
        this.spawnPowerUp();
      }

      const MAGNET_DISTANCE = this.bossActive ? 7.0 : 5.0; // Boss战中磁吸范围扩大
      const MAGNET_STRENGTH = 10.0; // 磁吸强度

      // 更新道具
      for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
        const pu = this.activePowerUps[i];
        pu.mesh.position.z += speed * deltaTime;

        // 侧入道具：朝场景中心平滑漂移
        if (pu.sideEntry && pu.targetX !== undefined) {
          const dx = pu.targetX - pu.mesh.position.x;
          // 渐进式靠近：每帧移动剩余距离的 1.5%
          pu.mesh.position.x += dx * Math.min(1, deltaTime * 1.5);
        }

        // 磁吸效果：道具靠近玩家时被吸引
        if (playerPos && pu.mesh.position.z > playerPos.z - 15 && pu.mesh.position.z < playerPos.z + 5) {
          const dx = playerPos.x - pu.mesh.position.x;
          const dy = playerPos.y - pu.mesh.position.y;
          const distXY = Math.sqrt(dx * dx + dy * dy);
          if (distXY < MAGNET_DISTANCE && distXY > 0.01) {
            // 距离越近吸力越强
            const attractFactor = (1 - distXY / MAGNET_DISTANCE) * MAGNET_STRENGTH * deltaTime;
            pu.mesh.position.x += (dx / distXY) * attractFactor;
            pu.mesh.position.y += (dy / distXY) * attractFactor;
          }
        }

        // 浮动和旋转动画
        pu.floatOffset += deltaTime * 3;
        pu.mesh.position.y += Math.sin(pu.floatOffset) * 0.02;
        pu.mesh.rotation.y += deltaTime * 2;

        // 稀有道具额外旋转效果
        if (pu.type === POWERUP_TYPES.RARE) {
          pu.mesh.rotation.x += deltaTime * 1.5;
          // 颜色变换 - 遍历环装子元素
          const children = pu.mesh.children;
          for (let j = 1; j < children.length; j++) {
            if (children[j].geometry && children[j].geometry.type === 'TorusGeometry') {
              const hue = (pu.floatOffset * 0.2 + j * 0.3) % 1;
              children[j].material.color.setHSL(hue, 1, 0.6);
            }
          }
        }

        // 护盾道具的六边形旋转
        if (pu.mesh.userData && pu.mesh.userData.hexShell) {
          pu.mesh.userData.hexShell.rotation.x += deltaTime;
          pu.mesh.userData.hexShell.rotation.y += deltaTime * 0.7;
        }

        // 超出相机范围，回收
        if (pu.mesh.position.z > 20) {
          pu.active = false;
          pu.mesh.visible = false;
          this.activePowerUps.splice(i, 1);
        }
      }
    }

    checkCollision(playerPos, playerRadius) {
      const collected = [];
      // 拾取判定半径放大，确保视觉碰到就拾取（约1.4倍视觉半径）
      const pickupBonus = 1.4;

      for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
        const pu = this.activePowerUps[i];
        const puPos = pu.mesh.position;

        // Z轴快速排除（稍微放宽）
        if (Math.abs(puPos.z - playerPos.z) > (pu.radius + playerRadius) * pickupBonus) {
          continue;
        }

        const dx = puPos.x - playerPos.x;
        const dy = puPos.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (pu.radius + playerRadius) * pickupBonus) {
          collected.push(pu.type);
          pu.active = false;
          pu.mesh.visible = false;
          this.activePowerUps.splice(i, 1);
        }
      }

      return collected;
    }

    reset() {
      for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
        const pu = this.activePowerUps[i];
        pu.active = false;
        pu.mesh.visible = false;
      }
      this.activePowerUps.length = 0;
      this.spawnTimer = 0;
    }

    dispose() {
      this.pool.forEach(pu => {
        this.scene.remove(pu.mesh);
        pu.mesh.traverse(child => {
          if (child.geometry) {
            try { child.geometry.dispose(); } catch (e) {}
          }
          if (child.material) {
            try { child.material.dispose(); } catch (e) {}
          }
        });
      });
      this.pool.length = 0;
      this.activePowerUps.length = 0;
    }
  }

  global.PowerUpManager = PowerUpManager;
  global.POWERUP_TYPES = POWERUP_TYPES;
})(window);
