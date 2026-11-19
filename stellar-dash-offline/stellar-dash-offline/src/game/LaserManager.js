/**
 * LaserManager - 激光射击系统
 * 激光弹对象池、飞行更新、碰撞检测
 * 与障碍物对象池保持一致的架构：预创建、运行时不复用网格
 */
(function(global) {
  'use strict';

  class LaserManager {
    constructor(scene) {
      this.scene = scene;
      this.pool = [];
      this.activeLasers = [];
      this.poolSize = 40;
      this.laserSpeed = 80; // 激光弹飞行速度（每秒单位）
      this.maxRange = 200; // 最大射程（超出则回收）

      this.initPool();
    }

    initPool() {
      for (let i = 0; i < this.poolSize; i++) {
        const laser = this.createLaser();
        laser.mesh.visible = false;
        this.scene.add(laser.mesh);
        this.pool.push(laser);
      }
    }

    createLaser() {
      const group = new THREE.Group();

      // 激光核心 - 细长圆柱体
      const coreGeom = new THREE.CylinderGeometry(0.06, 0.06, 4, 8);
      coreGeom.rotateX(Math.PI / 2); // 沿Z轴方向
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      group.add(core);

      // 外层光晕
      const glowGeom = new THREE.CylinderGeometry(0.18, 0.12, 3, 8);
      glowGeom.rotateX(Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      group.add(glow);

      // 前端光球（弹头效果）
      const tipGeom = new THREE.SphereGeometry(0.2, 12, 12);
      const tipMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const tip = new THREE.Mesh(tipGeom, tipMat);
      tip.position.z = 2;
      group.add(tip);

      return {
        mesh: group,
        active: false,
        startZ: 0
      };
    }

    fire(x, y, z) {
      // 从对象池找一个空闲激光
      const laser = this.pool.find(l => !l.active);
      if (!laser) return null; // 池耗尽

      laser.mesh.position.set(x, y, z);
      laser.mesh.visible = true;
      laser.active = true;
      laser.startZ = z;

      this.activeLasers.push(laser);
      return laser;
    }

    update(deltaTime) {
      for (let i = this.activeLasers.length - 1; i >= 0; i--) {
        const laser = this.activeLasers[i];
        // 激光向前飞（玩家朝向 -Z 方向）
        laser.mesh.position.z -= this.laserSpeed * deltaTime;

        // 超出射程或飞过玩家后方，回收
        if (laser.startZ - laser.mesh.position.z > this.maxRange) {
          laser.active = false;
          laser.mesh.visible = false;
          this.activeLasers.splice(i, 1);
        }
      }
    }

    /**
     * 检测激光与障碍物的碰撞
     * @param {ObstacleManager} obstacleManager
     * @returns {Array} 被击中的障碍物数组 { obstacle, laser }
     */
    checkCollisions(obstacleManager) {
      const hits = [];
      const obstacles = obstacleManager.activeObstacles;

      for (let i = this.activeLasers.length - 1; i >= 0; i--) {
        const laser = this.activeLasers[i];
        const laserPos = laser.mesh.position;

        for (let j = 0; j < obstacles.length; j++) {
          const obs = obstacles[j];
          const obsPos = obs.mesh.position;

          // Z轴快速排除（激光在障碍物后面还没到达）
          if (laserPos.z > obsPos.z + obs.radius + 1) continue;
          if (laserPos.z < obsPos.z - obs.radius - 2) continue;

          // 能量柱特殊碰撞
          if (obs.type === OBSTACLE_TYPES.ENERGY_PILLAR) {
            const length = obs.mesh.userData.pillarLength;
            const isHorizontal = obs.mesh.userData.isHorizontal;
            if (isHorizontal) {
              if (Math.abs(obsPos.x - laserPos.x) < length / 2 + 0.2 &&
                  Math.abs(obsPos.y - laserPos.y) < 0.6) {
                hits.push({ obstacle: obs, laser: laser });
                laser.active = false;
                laser.mesh.visible = false;
                this.activeLasers.splice(i, 1);
                break;
              }
            } else {
              if (Math.abs(obsPos.y - laserPos.y) < length / 2 + 0.2 &&
                  Math.abs(obsPos.x - laserPos.x) < 0.6) {
                hits.push({ obstacle: obs, laser: laser });
                laser.active = false;
                laser.mesh.visible = false;
                this.activeLasers.splice(i, 1);
                break;
              }
            }
            continue;
          }

          // 普通球形碰撞
          const dx = obsPos.x - laserPos.x;
          const dy = obsPos.y - laserPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < obs.radius + 0.15) {
            hits.push({ obstacle: obs, laser: laser });
            laser.active = false;
            laser.mesh.visible = false;
            this.activeLasers.splice(i, 1);
            break; // 一条激光只击中一个目标
          }
        }
      }

      return hits;
    }

    reset() {
      for (let i = this.activeLasers.length - 1; i >= 0; i--) {
        const laser = this.activeLasers[i];
        laser.active = false;
        laser.mesh.visible = false;
      }
      this.activeLasers.length = 0;
    }

    dispose() {
      this.pool.forEach(laser => {
        this.scene.remove(laser.mesh);
        laser.mesh.traverse(child => {
          if (child.geometry) {
            try { child.geometry.dispose(); } catch (e) {}
          }
          if (child.material) {
            try { child.material.dispose(); } catch (e) {}
          }
        });
      });
      this.pool.length = 0;
      this.activeLasers.length = 0;
    }
  }

  global.LaserManager = LaserManager;
})(window);
