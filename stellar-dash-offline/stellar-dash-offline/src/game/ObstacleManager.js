/**
 * ObstacleManager - 障碍物管理
 * 负责障碍物生成、对象池复用、碰撞检测
 * 所有障碍物在初始化时预创建，运行时不动态创建/销毁GPU资源
 */
(function(global) {
  'use strict';

  const OBSTACLE_TYPES = {
    ASTEROID: 'asteroid',       // 小行星 - 单个大障碍
    ENERGY_PILLAR: 'pillar',    // 能量柱 - 横向/竖向长条
    DEBRIS: 'debris',           // 碎片群 - 多个小障碍
    SPIKE: 'spike'              // 尖刺 - 尖锐危险物
  };

  class ObstacleManager {
    constructor(scene) {
      this.scene = scene;
      this.pool = [];
      this.activeObstacles = [];
      this.spawnTimer = 0;
      this.spawnInterval = 1.2;
      this.baseSpeed = 25;
      this.currentSpeed = 25;
      // 每种类型的池大小
      this.poolPerType = 25;

      this.initPool();
    }

    initPool() {
      const types = Object.values(OBSTACLE_TYPES);
      types.forEach(type => {
        for (let i = 0; i < this.poolPerType; i++) {
          const obstacle = this.createObstacle(type);
          obstacle.mesh.visible = false;
          this.scene.add(obstacle.mesh);
          this.pool.push(obstacle);
        }
      });
    }

    createObstacle(type) {
      let mesh;
      let radius = 1;

      switch (type) {
        case OBSTACLE_TYPES.ASTEROID: {
          // 小行星 - 不规则多面体
          const geom = new THREE.IcosahedronGeometry(1 + Math.random() * 0.5, 0);
          // 随机变形顶点让它看起来更像陨石
          const positions = geom.attributes.position.array;
          for (let i = 0; i < positions.length; i += 3) {
            const noise = 0.7 + Math.random() * 0.6;
            positions[i] *= noise;
            positions[i + 1] *= noise;
            positions[i + 2] *= noise;
          }
          geom.computeVertexNormals();

          const mat = new THREE.MeshStandardMaterial({
            color: 0x4a4050,
            metalness: 0.3,
            roughness: 0.8,
            emissive: 0xff3366,
            emissiveIntensity: 0.2
          });
          mesh = new THREE.Mesh(geom, mat);
          radius = 1.2;

          // 加一个发光环提示危险
          const ringGeom = new THREE.TorusGeometry(radius * 1.2, 0.05, 8, 24);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
          });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          mesh.add(ring);
          break;
        }

        case OBSTACLE_TYPES.ENERGY_PILLAR: {
          // 能量柱
          const isHorizontal = Math.random() > 0.5;
          const length = 3 + Math.random() * 3;
          const geom = new THREE.CylinderGeometry(0.3, 0.3, length, 8);
          if (isHorizontal) {
            geom.rotateZ(Math.PI / 2);
          }

          const mat = new THREE.MeshBasicMaterial({
            color: 0xff2fd0,
            transparent: true,
            opacity: 0.8
          });
          mesh = new THREE.Mesh(geom, mat);

          // 柱体外发光
          const glowGeom = new THREE.CylinderGeometry(0.6, 0.6, length + 0.5, 8);
          if (isHorizontal) {
            glowGeom.rotateZ(Math.PI / 2);
          }
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff2fd0,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
          });
          const glow = new THREE.Mesh(glowGeom, glowMat);
          mesh.add(glow);

          radius = 0.5; // 碰撞半径用小的，长度检测单独处理
          mesh.userData.pillarLength = length;
          mesh.userData.isHorizontal = isHorizontal;
          break;
        }

        case OBSTACLE_TYPES.DEBRIS: {
          // 碎片群 - 多个小碎片组成
          mesh = new THREE.Group();
          const count = 3 + Math.floor(Math.random() * 4);
          for (let i = 0; i < count; i++) {
            const size = 0.3 + Math.random() * 0.4;
            const fragGeom = new THREE.TetrahedronGeometry(size);
            const fragMat = new THREE.MeshStandardMaterial({
              color: 0x6a5a7a,
              metalness: 0.5,
              roughness: 0.6,
              emissive: 0xff6600,
              emissiveIntensity: 0.3
            });
            const frag = new THREE.Mesh(fragGeom, fragMat);
            frag.position.set(
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            );
            frag.rotation.set(
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              Math.random() * Math.PI
            );
            mesh.add(frag);
          }
          radius = 2;
          break;
        }

        case OBSTACLE_TYPES.SPIKE: {
          // 尖刺
          const geom = new THREE.ConeGeometry(0.3, 2.5, 6);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.9
          });
          mesh = new THREE.Mesh(geom, mat);
          mesh.rotation.z = Math.PI; // 尖端朝前

          // 发光底座
          const baseGeom = new THREE.SphereGeometry(0.4, 12, 12);
          const baseMat = new THREE.MeshBasicMaterial({
            color: 0xff2222,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
          });
          const base = new THREE.Mesh(baseGeom, baseMat);
          base.position.z = 0.8;
          mesh.add(base);

          radius = 0.8;
          break;
        }

        default: {
          mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
          );
          radius = 1;
        }
      }

      return {
        mesh: mesh,
        type: type,
        radius: radius,
        hp: this._getTypeMaxHp(type),
        maxHp: this._getTypeMaxHp(type),
        active: false,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2
        }
      };
    }

    _getTypeMaxHp(type) {
      switch (type) {
        case OBSTACLE_TYPES.ENERGY_PILLAR: return 2; // 能量柱需要2发击毁
        case OBSTACLE_TYPES.DEBRIS: return 1;
        case OBSTACLE_TYPES.SPIKE: return 1;
        case OBSTACLE_TYPES.ASTEROID: return 1;
        default: return 1;
      }
    }

    spawnObstacle(difficulty) {
      // 随机选择障碍类型，难度越高类型越多
      const types = [OBSTACLE_TYPES.ASTEROID];
      if (difficulty > 0.2) types.push(OBSTACLE_TYPES.ENERGY_PILLAR);
      if (difficulty > 0.4) types.push(OBSTACLE_TYPES.DEBRIS);
      if (difficulty > 0.6) types.push(OBSTACLE_TYPES.SPIKE);

      const type = types[Math.floor(Math.random() * types.length)];

      // 从对象池中找对应类型的空闲对象
      const obstacle = this.pool.find(o => !o.active && o.type === type);
      if (!obstacle) return; // 该类型池耗尽，跳过

      // 设置位置
      const laneX = (Math.random() - 0.5) * 10;
      const laneY = (Math.random() - 0.5) * 5;
      const startZ = -150;

      obstacle.mesh.position.set(laneX, laneY, startZ);
      obstacle.mesh.visible = true;
      obstacle.active = true;
      obstacle.hp = obstacle.maxHp; // 重置血量

      // 重置旋转
      obstacle.mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // 清除闪避标记
      if (obstacle.userData) {
        obstacle.userData.dodged = false;
      }

      this.activeObstacles.push(obstacle);
    }

    update(deltaTime, speedMultiplier, noSpawn) {
      this.currentSpeed = this.baseSpeed * speedMultiplier;

      if (!noSpawn) {
        this.spawnTimer += deltaTime;
        const adjustedInterval = this.spawnInterval / speedMultiplier;
        if (this.spawnTimer >= adjustedInterval) {
          this.spawnTimer = 0;
          const difficulty = Math.min(1, (speedMultiplier - 1) / 2);
          this.spawnObstacle(difficulty);

          // 高难度时可能一次生成多个
          if (difficulty > 0.5 && Math.random() < 0.3) {
            this.spawnObstacle(difficulty);
          }
        }
      }

      // 更新障碍物位置和旋转
      for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
        const obs = this.activeObstacles[i];
        obs.mesh.position.z += this.currentSpeed * deltaTime;

        // 旋转效果
        obs.mesh.rotation.x += obs.rotationSpeed.x * deltaTime;
        obs.mesh.rotation.y += obs.rotationSpeed.y * deltaTime;
        obs.mesh.rotation.z += obs.rotationSpeed.z * deltaTime;

        // 超出相机范围，回收
        if (obs.mesh.position.z > 20) {
          obs.active = false;
          obs.mesh.visible = false;
          // 清除闪避标记以便复用时重新计算
          if (obs.userData) {
            obs.userData.dodged = false;
          }
          this.activeObstacles.splice(i, 1);
        }
      }
    }

    checkCollision(playerPos, playerRadius) {
      for (let i = 0; i < this.activeObstacles.length; i++) {
        const obs = this.activeObstacles[i];
        const obsPos = obs.mesh.position;

        // Z轴范围检查（先快速排除）
        if (Math.abs(obsPos.z - playerPos.z) > obs.radius + playerRadius + 1) {
          continue;
        }

        // 能量柱需要特殊处理（长条状）
        if (obs.type === OBSTACLE_TYPES.ENERGY_PILLAR) {
          const length = obs.mesh.userData.pillarLength;
          const isHorizontal = obs.mesh.userData.isHorizontal;
          if (isHorizontal) {
            // 水平柱：X方向长
            if (Math.abs(obsPos.x - playerPos.x) < length / 2 &&
                Math.abs(obsPos.y - playerPos.y) < 0.5 + playerRadius) {
              return { hit: true, obstacle: obs };
            }
          } else {
            // 垂直柱：Y方向长
            if (Math.abs(obsPos.y - playerPos.y) < length / 2 &&
                Math.abs(obsPos.x - playerPos.x) < 0.5 + playerRadius) {
              return { hit: true, obstacle: obs };
            }
          }
          continue;
        }

        // 2D距离检测（XY平面）
        const dx = obsPos.x - playerPos.x;
        const dy = obsPos.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < obs.radius + playerRadius) {
          return { hit: true, obstacle: obs };
        }
      }
      return { hit: false, obstacle: null };
    }

    reset() {
      for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
        const obs = this.activeObstacles[i];
        obs.active = false;
        obs.mesh.visible = false;
        if (obs.userData) obs.userData.dodged = false;
      }
      this.activeObstacles.length = 0;
      this.spawnTimer = 0;
      this.currentSpeed = this.baseSpeed;
    }

    setDifficulty(level) {
      switch (level) {
        case 'easy':
          this.spawnInterval = 1.8;
          this.baseSpeed = 20;
          break;
        case 'normal':
          this.spawnInterval = 1.2;
          this.baseSpeed = 25;
          break;
        case 'hard':
          this.spawnInterval = 0.8;
          this.baseSpeed = 35;
          break;
      }
    }

    getActiveCount() {
      return this.activeObstacles.length;
    }

    dispose() {
      this.pool.forEach(obs => {
        this.scene.remove(obs.mesh);
        obs.mesh.traverse(child => {
          if (child.geometry) {
            try { child.geometry.dispose(); } catch (e) {}
          }
          if (child.material) {
            try { child.material.dispose(); } catch (e) {}
          }
        });
      });
      this.pool.length = 0;
      this.activeObstacles.length = 0;
    }
  }

  global.ObstacleManager = ObstacleManager;
  global.OBSTACLE_TYPES = OBSTACLE_TYPES;
})(window);
