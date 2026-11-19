/**
 * Player - 玩家飞船（皮肤系统 + 精致战机 + 光束尾迹版）
 * 预创建所有皮肤变体，运行时仅切换可见性，不重建GPU资源
 */
(function(global) {
  'use strict';

  class Player {
    constructor(scene, skinId) {
      this.scene = scene;
      this.skinId = skinId || 'azure';
      this.skins = {};
      this.activeSkin = null;
      this.group = null;

      // 尾迹粒子（用于周围散开的小粒子，补充主光束效果）
      this.trailPool = [];
      this.maxTrails = 40;

      // 护盾
      this.shield = null;

      // 位置与移动
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.moveSpeed = 15;

      // 状态
      this.maxLives = 3;
      this.lives = 3;
      this.hasShield = false;
      this.shieldTime = 0;
      this.isBoosting = false;
      this.boostTime = 0;
      this.isInvincible = false;
      this.invincibleTime = 0;
      this.hitFlash = 0; // 受击闪烁计时

      this.collisionRadius = 0.72; // 飞船整体缩放 0.72 后的碰撞半径

      // 倾斜
      this.rollAngle = 0;
      this.pitchAngle = 0;

      this._trailTimer = 0;
      this._trailInterval = 0.05;
      this._enginePulse = 0; // 引擎脉动计时

      this.init();
    }

    init() {
      const defs = ShipSkins.SKIN_DEFS;
      for (let i = 0; i < defs.length; i++) {
        const skin = ShipSkins.createShip(defs[i]);
        skin.group.visible = false;
        this.scene.add(skin.group);
        this.skins[defs[i].id] = skin;
      }

      this.setSkin(this.skinId);
      this.createShield();
      this.initTrailParticles();

      this.group.position.set(0, 0, 0);
    }

    setSkin(skinId) {
      if (!this.skins[skinId]) return;
      for (const id in this.skins) {
        this.skins[id].group.visible = false;
      }
      this.skins[skinId].group.visible = true;
      this.activeSkin = this.skins[skinId];
      this.group = this.activeSkin.group;
      this.skinId = skinId;

      // 护盾颜色同步
      if (this.shield) {
        this.shield.material.color.setHex(this.activeSkin.colors.glow);
      }
    }

    getMuzzleGlow() {
      return this.activeSkin ? this.activeSkin.muzzleGlow : null;
    }

    createShield() {
      const shieldGeom = new THREE.SphereGeometry(1.45, 24, 24);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.shield = new THREE.Mesh(shieldGeom, shieldMat);
      this.shield.visible = false;
      this.scene.add(this.shield);
    }

    /**
     * 尾迹粒子系统（小粒子，补充主光束尾迹的发散感）
     */
    initTrailParticles() {
      const trailGeom = new THREE.SphereGeometry(0.2, 6, 6);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      for (let i = 0; i < this.maxTrails; i++) {
        const particle = new THREE.Mesh(trailGeom.clone(), trailMat.clone());
        particle.visible = false;
        this.scene.add(particle);
        this.trailPool.push({
          mesh: particle,
          active: false,
          life: 0,
          maxLife: 0,
          velocity: new THREE.Vector3()
        });
      }
    }

    spawnTrailParticle() {
      let particle = this.trailPool.find(p => !p.active);
      if (!particle) return;

      particle.active = true;
      particle.life = 0;
      particle.maxLife = 0.4 + Math.random() * 0.2;
      particle.mesh.position.set(
        this.x + (Math.random() - 0.5) * 0.3,
        this.y + (Math.random() - 0.5) * 0.2,
        -4.5
      );
      particle.velocity.set(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.4,
        -3 - Math.random() * 2
      );
      particle.mesh.scale.setScalar(0.3 + Math.random() * 0.4);
      particle.mesh.visible = true;

      const colors = this.activeSkin.colors;
      particle.mesh.material.color.setHex(colors.trail || 0x00e5ff);
      particle.mesh.material.opacity = this.isBoosting ? 0.7 : 0.45;
    }

    update(deltaTime, input) {
      const moveAmount = 18 * deltaTime;
      if (input.left) this.targetX -= moveAmount;
      if (input.right) this.targetX += moveAmount;
      if (input.up) this.targetY += moveAmount;
      if (input.down) this.targetY -= moveAmount;

      const boundaryX = 6;
      const boundaryY = 3.5;
      this.targetX = Math.max(-boundaryX, Math.min(boundaryX, this.targetX));
      this.targetY = Math.max(-boundaryY, Math.min(boundaryY, this.targetY));

      this.x += (this.targetX - this.x) * this.moveSpeed * deltaTime;
      this.y += (this.targetY - this.y) * this.moveSpeed * deltaTime;

      const targetRoll = (this.targetX - this.x) * 0.35;
      this.rollAngle += (targetRoll - this.rollAngle) * 5 * deltaTime;
      const targetPitch = (this.targetY - this.y) * 0.35;
      this.pitchAngle += (targetPitch - this.pitchAngle) * 5 * deltaTime;

      this.group.position.x = this.x;
      this.group.position.y = this.y;
      this.group.rotation.z = this.rollAngle;
      this.group.rotation.x = this.pitchAngle;

      // 浮动
      this.group.position.y += Math.sin(performance.now() * 0.002) * 0.04;

      // 护盾跟随
      if (this.shield) {
        this.shield.position.x = this.x;
        this.shield.position.y = this.y;
      }

      // 护盾时间
      if (this.hasShield) {
        this.shieldTime -= deltaTime;
        if (this.shieldTime <= 0) {
          this.hasShield = false;
          this.shield.visible = false;
        } else {
          this.shield.material.opacity = 0.2 + Math.sin(performance.now() * 0.01) * 0.05;
        }
      }

      // 无敌闪烁
      if (this.isInvincible) {
        this.invincibleTime -= deltaTime;
        if (this.invincibleTime <= 0) {
          this.isInvincible = false;
          this.group.visible = true;
        } else {
          // 闪烁：每帧快闪，前半段更快
          const flashSpeed = this.invincibleTime > 0.8 ? 12 : 20;
          this.group.visible = Math.floor(performance.now() * 0.001 * flashSpeed) % 2 === 0;
        }
      }

      // 受击闪光衰减
      if (this.hitFlash > 0) {
        this.hitFlash -= deltaTime;
        if (this.hitFlash < 0) this.hitFlash = 0;
      }

      // 加速
      if (this.isBoosting) {
        this.boostTime -= deltaTime;
        if (this.boostTime <= 0) {
          this.isBoosting = false;
        }
      }

      // 更新引擎光束尾迹的脉动效果
      this._updateEngineBeams(deltaTime);

      // 尾迹粒子生成
      this._trailTimer += deltaTime;
      if (this._trailTimer >= this._trailInterval) {
        this._trailTimer = 0;
        this.spawnTrailParticle();
      }

      // 更新尾迹粒子
      this.trailPool.forEach(p => {
        if (!p.active) return;
        p.life += deltaTime;
        const lifeRatio = p.life / p.maxLife;
        p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
        p.mesh.material.opacity = (1 - lifeRatio) * (this.isBoosting ? 0.7 : 0.45);
        p.mesh.scale.setScalar((1 - lifeRatio) * 0.6 + 0.2);
        if (p.life >= p.maxLife) {
          p.active = false;
          p.mesh.visible = false;
        }
      });
    }

    /**
     * 更新引擎光束尾迹的脉动、长度、亮度
     */
    _updateEngineBeams(dt) {
      if (!this.activeSkin || !this.activeSkin.engineBeams) return;

      this._enginePulse += dt;
      const pulse = 0.85 + Math.sin(this._enginePulse * 12) * 0.15;

      // 加速时光束更长更亮
      const boostFactor = this.isBoosting ? 1.6 : 1.0;
      const lengthScale = boostFactor * pulse;
      const opacityBase = this.isBoosting ? 0.9 : 0.7;

      const beams = this.activeSkin.engineBeams;
      for (let i = 0; i < beams.length; i++) {
        const beam = beams[i];
        if (beam.name && beam.name.includes('Core')) {
          // 核心光柱
          beam.material.opacity = (opacityBase + 0.1) * pulse;
          beam.scale.z = lengthScale * 1.0;
        } else if (beam.name && beam.name.includes('Outer')) {
          // 外发光柱
          beam.material.opacity = (opacityBase - 0.2) * pulse;
          beam.scale.z = lengthScale * 1.0;
        } else if (beam.name && beam.name.includes('Halo')) {
          // 喷口光晕圆盘
          beam.material.opacity = (opacityBase + 0.05) * (0.9 + pulse * 0.1);
          beam.scale.setScalar(0.9 + pulse * 0.3);
        }
      }

      // 引擎核心发光
      if (this.activeSkin.engineCores) {
        for (let i = 0; i < this.activeSkin.engineCores.length; i++) {
          const core = this.activeSkin.engineCores[i];
          core.material.opacity = (0.7 + boostFactor * 0.2) * pulse;
          core.scale.setScalar(0.9 + pulse * 0.3);
        }
      }
    }

    triggerMuzzleFlash() {
      const muzzle = this.getMuzzleGlow();
      if (muzzle) {
        muzzle.material.opacity = 1;
      }
    }

    updateMuzzle(dt, cooldownRatio) {
      const muzzle = this.getMuzzleGlow();
      if (!muzzle) return;
      if (muzzle.material.opacity > 0) {
        muzzle.material.opacity = Math.max(0, muzzle.material.opacity - dt * 8);
      }
    }

    activateShield(duration) {
      this.hasShield = true;
      this.shieldTime = duration || 8;
      this.shield.visible = true;
      this.shield.material.opacity = 0.3;
    }

    activateBoost(duration) {
      this.isBoosting = true;
      this.boostTime = duration || 3;
    }

    hit() {
      return this.takeDamage(1);
    }

    /**
     * 玩家受到伤害
     * @param {number} amount 伤害量
     * @returns {boolean} 是否死亡（生命归零）
     */
    takeDamage(amount) {
      if (this.isInvincible) return false;

      if (this.hasShield) {
        // 护盾抵挡一次伤害
        this.hasShield = false;
        this.shield.visible = false;
        this.isInvincible = true;
        this.invincibleTime = 1.5;
        this.hitFlash = 0.2;
        return false;
      }

      this.lives -= amount;
      this.hitFlash = 0.3;
      this.isInvincible = true;
      this.invincibleTime = 1.5; // 1.5秒无敌帧避免连续扣血

      if (this.lives <= 0) {
        this.lives = 0;
        return true; // 死亡
      }
      return false;
    }

    getLives() {
      return this.lives;
    }

    getMaxLives() {
      return this.maxLives;
    }

    getPosition() {
      return { x: this.x, y: this.y, z: 0 };
    }

    getCollisionRadius() {
      return this.collisionRadius;
    }

    reset() {
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.lives = this.maxLives;
      this.hasShield = false;
      this.shieldTime = 0;
      this.isBoosting = false;
      this.boostTime = 0;
      this.isInvincible = false;
      this.invincibleTime = 0;
      this.rollAngle = 0;
      this.pitchAngle = 0;

      this.group.position.set(0, 0, 0);
      // 重置姿态：保留基准朝向（机头朝 -Z 飞行方向），仅清零横滚与俯仰
      this.group.rotation.x = 0;
      this.group.rotation.y = Math.PI;
      this.group.rotation.z = 0;
      this.shield.visible = false;
      this.group.visible = true;

      const muzzle = this.getMuzzleGlow();
      if (muzzle) muzzle.material.opacity = 0;

      this.trailPool.forEach(p => {
        p.active = false;
        p.mesh.visible = false;
      });
    }

    dispose() {
      for (const id in this.skins) {
        const skin = this.skins[id];
        this.scene.remove(skin.group);
        skin.group.traverse(child => {
          if (child.geometry) { try { child.geometry.dispose(); } catch (e) {} }
          if (child.material) { try { child.material.dispose(); } catch (e) {} }
        });
      }
      this.skins = {};

      if (this.shield) {
        this.scene.remove(this.shield);
        try { this.shield.geometry.dispose(); } catch (e) {}
        try { this.shield.material.dispose(); } catch (e) {}
      }

      this.trailPool.forEach(p => {
        this.scene.remove(p.mesh);
        try { p.mesh.geometry.dispose(); } catch (e) {}
        try { p.mesh.material.dispose(); } catch (e) {}
      });
      this.trailPool = [];
    }
  }

  global.Player = Player;
})(window);
