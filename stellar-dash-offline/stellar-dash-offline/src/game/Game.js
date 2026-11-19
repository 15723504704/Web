/**
 * Game - 游戏主控制器
 * 整合所有子系统，管理游戏状态、主循环、碰撞检测、计分
 */
(function(global) {
  'use strict';

  const GAME_STATE = {
    MENU: 'menu',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover'
  };

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.state = GAME_STATE.MENU;
      this.difficulty = 'normal';

      // Three.js 基础
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.composer = null;
      this.bloomPass = null;

      // 子系统
      this.starField = null;
      this.player = null;
      this.obstacleManager = null;
      this.powerUpManager = null;
      this.laserManager = null;
      this.bossManager = null;
      this.achievementManager = new AchievementManager();
      this.audioManager = new AudioManager();

      // 游戏状态
      this.score = 0;
      this.highScore = 0;
      this.speedMultiplier = 1;
      this.maxSpeedMultiplier = 3;
      this.combo = 0;
      this.maxCombo = 0;
      this.comboTimer = 0;
      this.gameTime = 0;
      this.countdownValue = 3;

      // 输入状态
      this.input = {
        left: false,
        right: false,
        up: false,
        down: false,
        fire: false // 射击输入
      };

      // 射击系统
      this.fireCooldown = 0.25; // 射击冷却时间（秒）
      this.fireTimer = 0; // 剩余冷却时间

      // Boss战
      this.bossActive = false;
      this.nextBossScore = 2000; // 达到此分数触发第一个Boss
      this.bossScoreIncrement = 5000; // 每次击败后增量
      this.destroyedThisRun = 0; // 本局击毁数
      this.hitTakenThisRun = false; // 本局是否受过伤（用于无伤成就）
      this.scoreAtLastHit = 0; // 上次受击时的分数（无伤距离计算）

      // 主循环
      this.animationId = null;
      this.lastTime = 0;
      this.deltaTime = 0;
      this._running = false;
      this._consecutiveErrors = 0;
      this._maxConsecutiveErrors = 10;

      // 回调（React层用）
      this.onStateChange = null;
      this.onScoreChange = null;
      this.onComboChange = null;
      this.onShieldChange = null;
      this.onBoostChange = null;
      this.onCooldownChange = null;
      this.onBossHpChange = null;
      this.onBossAppear = null;
      this.onBossDefeated = null;
      this.onPhaseChange = null;
      this.onAchievementUnlock = null;
      this.onSpeedChange = null;
      this.onDamage = null;
      this.onCountdown = null;
      this.onPowerUpCollected = null; // 道具拾取回调 { type, value, position3D }
      this.onLivesChange = null; // 生命变化回调
      this.onGameOverReason = null; // 游戏结束原因回调

      // 屏幕震动
      this.shakeAmount = 0;
      this.shakeDecay = 0.92;

      // 爆炸粒子池（由主循环统一更新）
      this._explosionParticles = [];
      this._maxExplosionParticles = 60;

      // 计时器引用
      this._countdownInterval = null;

      this.webglAvailable = false;
      this.initError = null;

      // 加载最高分
      this.loadHighScore();

      // 初始化
      try {
        this.initThree();
        this.webglAvailable = true;
      } catch (e) {
        this.initError = e.message || 'WebGL 初始化失败';
        console.warn('WebGL init failed:', e);
      }
      this.initInput();
      this.bindEvents();
    }

    initThree() {
      // 先检测 WebGL 是否可用，避免 Three.js 抛错日志
      if (!this.webGLAvailable()) {
        throw new Error('WebGL not supported');
      }

      // 场景
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x05060f);

      // 相机
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.set(0, 2, 8);
      this.camera.lookAt(0, 0, -10);

      // 渲染器
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      // 电影级色调映射：高光滚降更柔和，避免霓虹与金属直接过曝成白块
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.88;

      // 环境反射贴图：让金属装甲有可读的高光层次
      this.initEnvironment();

      // 监听 WebGL 上下文丢失
      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('WebGL context lost');
        this.webglAvailable = false;
        this._emergencyStop(new Error('WebGL上下文丢失'));
      }, false);

      this.canvas.addEventListener('webglcontextrestored', (e) => {
        console.warn('WebGL context restored - restarting game');
        // 上下文恢复时回到菜单
        this.webglAvailable = true;
        this.returnToMenu();
        this.startMenuAnimation();
      }, false);

      // 后期处理 - Bloom辉光
      this.initPostProcessing();

      // 环境光（冷调环境，营造太空感）
      const ambientLight = new THREE.AmbientLight(0x303050, 0.35);
      this.scene.add(ambientLight);

      // 主光（Key Light）：暖白色，右上方高角度，硬阴影塑造体积
      const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.1);
      keyLight.position.set(8, 15, 6);
      this.scene.add(keyLight);

      // 补光（Fill Light）：冷蓝色，左下方，柔化暗部
      const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
      fillLight.position.set(-6, 4, -3);
      this.scene.add(fillLight);

      // 轮廓光/边缘光（Rim Light）：青蓝色，后上方，勾勒机体边缘
      const rimLight = new THREE.DirectionalLight(0x00ccff, 0.6);
      rimLight.position.set(0, 8, -10);
      this.scene.add(rimLight);

      // 点光源（飞船前方本地照明，照亮机首）
      this.playerLight = new THREE.PointLight(0x00e5ff, 0.8, 40);
      this.playerLight.position.set(0, 0, 0);
      this.scene.add(this.playerLight);

      // 初始化子系统
      if (this.scene) {
        this.starField = new StarField(this.scene);
        this.player = new Player(this.scene, this.getSelectedSkin());
        this.obstacleManager = new ObstacleManager(this.scene);
        this.powerUpManager = new PowerUpManager(this.scene);
        this.laserManager = new LaserManager(this.scene);
        this.bossManager = new BossManager(this.scene);

        // Boss回调
        this.bossManager.onBossAppear = () => {
          this.bossActive = true;
          if (this.powerUpManager) this.powerUpManager.bossActive = true;
          this.onBossAppear?.();
        };
        this.bossManager.onBossDefeated = () => {
          this._onBossDefeated();
        };
        this.bossManager.onHpChange = (hp, maxHp) => {
          this.onBossHpChange?.(hp, maxHp);
        };
        this.bossManager.onPhaseChange = (phase) => {
          this.shakeAmount = Math.max(this.shakeAmount, 0.8);
          this.audioManager.playSelect();
          this.onPhaseChange?.(phase);
        };

        // 成就回调
        this.achievementManager.onUnlock = (ach) => {
          this.onAchievementUnlock?.(ach);
        };
      }
    }

    initEnvironment() {
      // 用一个极简的程序化场景烘一张环境贴图，供所有 PBR 材质反射
      const envScene = new THREE.Scene();
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(50, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x1a2438, side: THREE.BackSide })
      );
      envScene.add(dome);
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(42, 5, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x2a6fae })
      );
      band.rotation.x = Math.PI / 2;
      envScene.add(band);
      const warm = new THREE.Mesh(
        new THREE.BoxGeometry(30, 3, 8),
        new THREE.MeshBasicMaterial({ color: 0x6a4a35 })
      );
      warm.position.set(-18, 6, -20);
      envScene.add(warm);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
      dome.geometry.dispose();
      dome.material.dispose();
      band.geometry.dispose();
      band.material.dispose();
      warm.geometry.dispose();
      warm.material.dispose();
    }

    initPostProcessing() {
      if (!this.renderer) return;
      this.composer = new THREE.EffectComposer(this.renderer);

      const renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4,   // strength：只给发光体加一层柔光
        0.32,  // radius
        0.65   // threshold：阈值拉高，避免白色装甲整片泛光
      );
      this.composer.addPass(this.bloomPass);
    }

    initInput() {
      // 键盘
      window.addEventListener('keydown', (e) => {
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            this.input.left = true;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.input.right = true;
            break;
          case 'ArrowUp':
          case 'KeyW':
            this.input.up = true;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.input.down = true;
            break;
          case 'Space':
            e.preventDefault();
            if (this.state === GAME_STATE.PLAYING) {
              this.input.fire = true;
            }
            break;
          case 'Escape':
            e.preventDefault();
            if (this.state === GAME_STATE.PLAYING) {
              this.pause();
            } else if (this.state === GAME_STATE.PAUSED) {
              this.resume();
            }
            break;
        }
      });

      window.addEventListener('keyup', (e) => {
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            this.input.left = false;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.input.right = false;
            break;
          case 'ArrowUp':
          case 'KeyW':
            this.input.up = false;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.input.down = false;
            break;
          case 'Space':
            this.input.fire = false;
            break;
        }
      });
    }

    bindEvents() {
      // 窗口大小变化
      window.addEventListener('resize', () => this.onResize());

      // 页面可见性变化（切后台自动暂停）
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === GAME_STATE.PLAYING) {
          this.pause();
        }
      });
    }

    webGLAvailable() {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
          (canvas.getContext('webgl2') || canvas.getContext('webgl')));
      } catch (e) {
        return false;
      }
    }

    onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      if (this.composer) {
        this.composer.setSize(width, height);
      }
    }

    // === 游戏状态控制 ===

    setDifficulty(diff) {
      this.difficulty = diff;
      if (this.obstacleManager) {
        this.obstacleManager.setDifficulty(diff);
      }
    }

    startCountdown() {
      this.audioManager.resume();
      this.audioManager.playSelect();

      // 取消已有倒计时，防止重入
      this._clearCountdown();

      this.resetGame();
      this.state = GAME_STATE.COUNTDOWN;
      this.countdownValue = 3;
      this.onStateChange?.(this.state);
      this.onCountdown?.(this.countdownValue);
      this.audioManager.playTone(660, 0.15, 'sine', 0.2);

      this._countdownInterval = setInterval(() => {
        this.countdownValue--;
        if (this.countdownValue > 0) {
          this.onCountdown?.(this.countdownValue);
          this.audioManager.playTone(660, 0.15, 'sine', 0.2);
        } else {
          this._clearCountdown();
          this.onCountdown?.(0);
          if (this.webglAvailable) {
            this.startGame();
          } else {
            // 无WebGL时直接结束，让UI显示错误
            this.state = GAME_STATE.GAME_OVER;
            this.onStateChange?.(this.state);
          }
        }
      }, 800);
    }

    _clearCountdown() {
      if (this._countdownInterval) {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
      }
    }

    startGame() {
      this.state = GAME_STATE.PLAYING;
      this._running = true;
      this._consecutiveErrors = 0;
      this.deathCause = null;
      this.onStateChange?.(this.state);
      this.audioManager.playStart();
      this.audioManager.startEngineSound();

      // 通知初始生命数
      this.onLivesChange?.(this.player.getLives(), this.player.getMaxLives());

      if (!this.animationId) {
        this.lastTime = performance.now();
        this.animate();
      }
    }

    resetGame() {
      this.score = 0;
      this.speedMultiplier = 1;
      this.combo = 0;
      this.maxCombo = 0;
      this.comboTimer = 0;
      this.gameTime = 0;
      this.shakeAmount = 0;
      this._consecutiveErrors = 0;

      if (this.player) this.player.reset();
      if (this.obstacleManager) {
        this.obstacleManager.reset();
        // 清除所有障碍物的dodged标记
        this.obstacleManager.pool.forEach(obs => {
          if (obs.userData) obs.userData.dodged = false;
        });
      }
      if (this.powerUpManager) {
        this.powerUpManager.reset();
        this.powerUpManager.bossActive = false;
      }
      if (this.laserManager) this.laserManager.reset();
      if (this.bossManager) this.bossManager.reset();

      this.fireTimer = 0;
      this.bossActive = false;
      this.nextBossScore = 2000;
      this.destroyedThisRun = 0;
      this.hitTakenThisRun = false;
      this.scoreAtLastHit = 0;
      this.achievementManager.resetSessionUnlocks();
      this.achievementManager.resetSessionStats();

      this.onScoreChange?.(0);
      this.onComboChange?.(0);
      this.onSpeedChange?.(1);
      this.onShieldChange?.(false);
      this.onBoostChange?.(false);
      this.onCooldownChange?.(1);
    }

    pause() {
      if (this.state !== GAME_STATE.PLAYING) return;
      this.state = GAME_STATE.PAUSED;
      this._running = false;
      this.onStateChange?.(this.state);
      this.audioManager.stopEngineSound();

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    resume() {
      if (this.state !== GAME_STATE.PAUSED) return;
      this.state = GAME_STATE.PLAYING;
      this._running = true;
      this._consecutiveErrors = 0;
      this.onStateChange?.(this.state);
      this.audioManager.startEngineSound();

      this.lastTime = performance.now();
      this.animate();
    }

    gameOver(reason) {
      this.state = GAME_STATE.GAME_OVER;
      this._running = false;
      this.deathCause = reason || 'obstacle';
      this.onStateChange?.(this.state);
      this.onGameOverReason?.(this.deathCause);
      this.audioManager.stopEngineSound();
      this.audioManager.playGameOver();

      // 更新成就统计
      const finalScore = Math.floor(this.score);
      this.achievementManager.updateStat('totalScore', finalScore);
      this.achievementManager.updateStat('totalDestroyed', this.destroyedThisRun);
      this.achievementManager.updateStat('gamesPlayed', 1);
      this.achievementManager.updateStat('maxCombo', this.maxCombo, true);
      this.achievementManager.updateStat('longestTime', this.gameTime, true);

      // 检查是否打破纪录
      if (this.score > this.highScore) {
        this.highScore = Math.floor(this.score);
        this.saveHighScore();
      }

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    _emergencyStop(error) {
      this._running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.audioManager.stopEngineSound();
      this.state = GAME_STATE.GAME_OVER;
      this._fatalError = error?.message || 'Unknown error';
      this.onStateChange?.(this.state);
      this.onFatalError?.(this._fatalError);
      // 保存当前分数
      if (this.score > this.highScore) {
        this.highScore = Math.floor(this.score);
        this.saveHighScore();
      }
    }

    returnToMenu() {
      this._running = false;
      this._clearCountdown();
      this.state = GAME_STATE.MENU;
      this.onStateChange?.(this.state);
      this.resetGame();

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    // === 主循环 ===

    animate() {
      if (!this._running) return;

      this.animationId = requestAnimationFrame(() => this.animate());

      const now = performance.now();
      this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      try {
        this.update(this.deltaTime);
        this.render();
        this._consecutiveErrors = 0;
      } catch (e) {
        this._consecutiveErrors++;
        console.error('Game loop error:', e);
        // 连续错误超过阈值，安全终止游戏
        if (this._consecutiveErrors >= this._maxConsecutiveErrors) {
          console.error('Too many consecutive errors, stopping game loop');
          this._emergencyStop(e);
        }
      }
    }

    update(dt) {
      this.gameTime += dt;

      // 速度随时间递增
      const speedIncrease = this.gameTime * 0.02; // 每秒增加2%
      let targetSpeed = 1 + speedIncrease;
      if (this.player.isBoosting) targetSpeed *= 1.5;
      targetSpeed = Math.min(targetSpeed, this.maxSpeedMultiplier * (this.player.isBoosting ? 1.5 : 1));

      this.speedMultiplier += (targetSpeed - this.speedMultiplier) * 2 * dt;
      this.onSpeedChange?.(this.speedMultiplier);

      // 统计：飞行距离（基于速度）
      this.achievementManager.updateStat('totalFlightDistance', dt * this.speedMultiplier * 10);

      // 统计：最高速度档位（达到 2.5 倍速以上记为最高档）
      if (this.speedMultiplier >= 2.5) {
        this.achievementManager.updateStat('maxSpeedReached', 1, true);
      }

      // 更新引擎音效
      this.audioManager.setEngineSpeed(this.speedMultiplier);

      // 更新星空
      this.starField.update(dt, this.speedMultiplier);
      this.starField.setSpeedFactor(this.player.isBoosting ? 0.8 : 0);

      // 更新玩家
      this.player.update(dt, this.input);

      // 射击冷却与开火
      if (this.fireTimer > 0) {
        this.fireTimer -= dt;
      }
      const cooldownRatio = 1 - (this.fireTimer / this.fireCooldown);
      this.player.updateMuzzle(dt, cooldownRatio);
      this.onCooldownChange?.(cooldownRatio);

      if (this.input.fire && this.fireTimer <= 0) {
        this._fireLaser();
      }

      // 更新激光
      this.laserManager.update(dt);

      // 灯光跟随玩家
      this.playerLight.position.set(
        this.player.x,
        this.player.y + 1,
        -2
      );
      this.playerLight.intensity = this.player.isBoosting ? 2 : 1;

      // 更新障碍物（Boss战期间暂停生成，已存在的继续飞行）
      if (!this.bossActive) {
        this.obstacleManager.update(dt, this.speedMultiplier);
      } else {
        // Boss战中仍让已有障碍物飞走，不生成新的
        this.obstacleManager.update(dt, this.speedMultiplier, true);
      }

      // 玩家位置（提前计算，供道具磁吸和碰撞检测使用）
      const playerPos = this.player.getPosition();
      const playerRadius = this.player.getCollisionRadius();

      // 更新道具
      this.powerUpManager.update(dt, this.speedMultiplier, playerPos);

      // 碰撞检测 - 障碍物
      const collision = this.obstacleManager.checkCollision(playerPos, playerRadius);
      if (collision.hit) {
        const hit = this.player.hit();
        this.onLivesChange?.(this.player.getLives(), this.player.getMaxLives());
        if (hit) {
          // 真实碰撞 - 游戏结束
          this.triggerExplosion(collision.obstacle.mesh.position);
          this.shakeAmount = 1;
          this.onDamage?.();
          this.achievementManager.markHitTaken();
          this.gameOver('obstacle');
          return;
        } else {
          // 护盾抵挡
          this.audioManager.playShieldHit();
          this.shakeAmount = 0.3;
          this.onShieldChange?.(false);
          this.onDamage?.();
          this.achievementManager.updateStat('totalShieldBlocks', 1);
          // 移除该障碍物
          collision.obstacle.active = false;
          collision.obstacle.mesh.visible = false;
          const idx = this.obstacleManager.activeObstacles.indexOf(collision.obstacle);
          if (idx > -1) this.obstacleManager.activeObstacles.splice(idx, 1);
        }
      }

      // 碰撞检测 - 道具
      const collected = this.powerUpManager.checkCollision(playerPos, playerRadius);
      collected.forEach(type => {
        this.handlePowerUp(type);
        this.achievementManager.updateStat('totalPowerUps', 1);
      });

      // 激光碰撞检测 - 击毁障碍物
      const laserHits = this.laserManager.checkCollisions(this.obstacleManager);
      for (let i = 0; i < laserHits.length; i++) {
        const hit = laserHits[i];
        const obs = hit.obstacle;
        if (!obs.active) continue;

        obs.hp -= 1;

        if (obs.hp <= 0) {
          // 障碍物被摧毁
          obs.active = false;
          obs.mesh.visible = false;
          const idx = this.obstacleManager.activeObstacles.indexOf(obs);
          if (idx > -1) this.obstacleManager.activeObstacles.splice(idx, 1);

          // 爆炸效果（小爆炸）
          this.triggerMiniExplosion(obs.mesh.position);

          // 击毁得分：低于完美闪避，鼓励技术与取舍
          // 基础30分 + 障碍类型加成 + 连击加成
          let bonus = 30;
          if (obs.type === OBSTACLE_TYPES.ENERGY_PILLAR) bonus = 60; // 能量柱血厚分高
          if (obs.type === OBSTACLE_TYPES.DEBRIS) bonus = 40;
          bonus = Math.floor(bonus * (1 + this.combo * 0.1));
          this.score += bonus;

          // 击毁计数
          this.destroyedThisRun++;

          this.audioManager.playLaserHit();
          this.shakeAmount = Math.max(this.shakeAmount, 0.08);
        } else {
          // 未摧毁，命中反馈（轻微闪烁由后续实现）
          this.audioManager.playLaserHit();
        }
      }

      // 激光击中Boss检测
      if (this.bossActive && this.bossManager) {
        const activeLasers = this.laserManager.activeLasers;
        for (let i = activeLasers.length - 1; i >= 0; i--) {
          const laser = activeLasers[i];
          const hitPos = this.bossManager.checkLaserHit(laser.mesh.position);
          if (hitPos) {
            // 命中Boss
            this.bossManager.takeDamage(1, hitPos);
            laser.active = false;
            laser.mesh.visible = false;
            activeLasers.splice(i, 1);
            this.audioManager.playLaserHit();
          }
        }
      }

      // Boss战相关更新
      if (this.bossManager) {
        this.bossManager.update(dt, playerPos);

        // Boss子弹碰撞玩家
        if (this.bossActive) {
          const bossBulletHit = this.bossManager.checkPlayerCollision(playerPos, playerRadius);
          const laserHit = this.bossManager.checkLaserPlayerCollision(playerPos, playerRadius);
          const chargeHit = this.bossManager.checkChargeCollision(playerPos, playerRadius);
          let deathReason = null;
          if (bossBulletHit) deathReason = 'bossBullet';
          else if (laserHit) deathReason = 'bossLaser';
          else if (chargeHit) deathReason = 'bossCharge';

          if ((bossBulletHit || laserHit || chargeHit) && this.state === GAME_STATE.PLAYING) {
            const hit = this.player.hit();
            this.onLivesChange?.(this.player.getLives(), this.player.getMaxLives());
            if (hit) {
              this.triggerExplosion(playerPos);
              this.shakeAmount = 1;
              this.onDamage?.();
              this.achievementManager.markHitTaken();
              this.gameOver(deathReason);
              return;
            } else {
              this.audioManager.playShieldHit();
              this.shakeAmount = Math.max(this.shakeAmount, 0.3);
              this.onShieldChange?.(false);
              this.onDamage?.();
              this.achievementManager.updateStat('totalShieldBlocks', 1);
            }
          }
        }
      }

      // 检测是否触发Boss战
      if (!this.bossActive && this.score >= this.nextBossScore && this.bossManager) {
        this.bossManager.startBoss();
      }

      // 本局击毁数统计（用于成就）
      if (this.destroyedThisRun > 0) {
        // 实时更新累计击毁成就（仅在变化时）
      }

      // 计分（距离分）
      this.score += dt * 10 * this.speedMultiplier;
      this.onScoreChange?.(Math.floor(this.score));

      // 局内成就检测：无伤飞行
      if (!this.hitTakenThisRun) {
        this.achievementManager.updateSessionProgress('flawlessScore', Math.floor(this.score));
      }
      // 局内成就检测：单局时长
      this.achievementManager.updateSessionProgress('gameTime', this.gameTime);

      // 连击计时
      if (this.combo > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 0;
          this.onComboChange?.(0);
        }
      }

      // 完美闪避检测（障碍物刚刚从玩家身边经过）
      this.checkPerfectDodges();

      // 更新爆炸粒子
      this._updateExplosions(dt);

      // 屏幕震动衰减
      this.shakeAmount *= this.shakeDecay;
      if (this.shakeAmount > 0.01) {
        this.camera.position.x = (Math.random() - 0.5) * this.shakeAmount * 0.5;
        this.camera.position.y = 2 + (Math.random() - 0.5) * this.shakeAmount * 0.3;
      } else {
        this.camera.position.x += (0 - this.camera.position.x) * 5 * dt;
        this.camera.position.y += (2 - this.camera.position.y) * 5 * dt;
      }

      // 相机跟随玩家（轻微）
      const targetLookX = this.player.x * 0.3;
      const targetLookY = this.player.y * 0.2;
      this.camera.position.x += (targetLookX - this.camera.position.x) * 2 * dt;
      this.camera.position.y += (targetLookY + 2 - this.camera.position.y) * 2 * dt;
      this.camera.lookAt(this.player.x * 0.5, this.player.y * 0.3, -15);

      // 加速时的辉光增强
      if (this.bloomPass) {
        const targetStrength = this.player.isBoosting ? 1.8 : 1.2;
        this.bloomPass.strength += (targetStrength - this.bloomPass.strength) * 3 * dt;
      }
    }

    checkPerfectDodges() {
      const playerPos = this.player.getPosition();
      const playerRadius = this.player.getCollisionRadius();

      const obstacles = this.obstacleManager.activeObstacles;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        // 刚刚飞过玩家（z从负变正）
        if (obs.mesh.position.z > playerPos.z + 2 && !obs.userData?.dodged) {
          obs.userData = obs.userData || {};
          obs.userData.dodged = true;

          // 检查距离是否足够近（完美闪避）
          const dx = obs.mesh.position.x - playerPos.x;
          const dy = obs.mesh.position.y - playerPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < obs.radius + playerRadius + 2) {
            this.addCombo();
            // 完美闪避额外加分
            const bonus = Math.floor(50 * (1 + this.combo * 0.1));
            this.score += bonus;
            this.audioManager.playPerfectDodge();
            // 成就：完美闪避统计
            this.achievementManager.updateStat('totalPerfectDodges', 1);
          }
        }
      }
    }

    addCombo() {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboTimer = 3; // 3秒内不继续则清零
      this.onComboChange?.(this.combo);
      this.audioManager.playCombo(this.combo);

      // 更新最高连击成就
      this.achievementManager.updateStat('maxCombo', this.maxCombo, true);
    }

    _onBossDefeated() {
      this.bossActive = false;
      if (this.powerUpManager) this.powerUpManager.bossActive = false;
      // Boss击败奖励
      const bonus = 1500;
      this.score += bonus;
      this.shakeAmount = Math.max(this.shakeAmount, 2);

      // 大型爆炸特效（复用explosion粒子池产生大量爆炸）
      const bossPos = this.bossManager.boss.mesh.position.clone();
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (this.bossManager && this.bossManager.state === BOSS_STATE.DEFEATED) {
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 4,
              (Math.random() - 0.5) * 4
            );
            this.triggerExplosion(bossPos.clone().add(offset));
          }
        }, i * 150);
      }

      this.audioManager.playExplosion();

      // 更新成就
      this.achievementManager.updateStat('bossKills', 1);
      this.achievementManager.updateStat('totalScore', bonus);

      // 设置下一个Boss阈值
      this.nextBossScore = Math.floor(this.score) + this.bossScoreIncrement;

      this.onBossDefeated?.();
    }

    _fireLaser() {
      if (!this.laserManager) return;
      // 从飞船头部发射
      const laser = this.laserManager.fire(
        this.player.x,
        this.player.y,
        this.player.getPosition().z - 2.5 // 机首位置
      );
      if (laser) {
        this.fireTimer = this.fireCooldown;
        this.player.triggerMuzzleFlash();
        this.audioManager.playShoot();
        this.achievementManager.updateStat('totalLasers', 1);
      }
    }

    triggerMiniExplosion(position) {
      // 小型爆炸（激光击毁用） - 复用爆炸粒子池
      const count = 6;
      for (let i = 0; i < count; i++) {
        let particle = this._explosionParticles.find(p => !p.active);
        if (!particle && this._explosionParticles.length < this._maxExplosionParticles) {
          const geom = new THREE.SphereGeometry(0.2, 6, 6);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const mesh = new THREE.Mesh(geom, mat);
          this.scene.add(mesh);
          particle = { mesh, active: false, velocity: new THREE.Vector3(), life: 0, maxLife: 1 };
          this._explosionParticles.push(particle);
        }
        if (!particle) continue;

        particle.active = true;
        particle.life = 0;
        particle.maxLife = 0.4 + Math.random() * 0.3;
        particle.mesh.position.copy(position);
        particle.velocity.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6
        );
        particle.mesh.scale.setScalar(0.4 + Math.random() * 0.4);
        particle.mesh.material.color.setHSL(0.5 + Math.random() * 0.1, 1, 0.6);
        particle.mesh.material.opacity = 1;
        particle.mesh.visible = true;
      }
    }

    handlePowerUp(type) {
      let value = 0;
      switch (type) {
        case POWERUP_TYPES.SCORE:
          this.score += 100;
          this.audioManager.playCollect();
          value = 100;
          break;
        case POWERUP_TYPES.SHIELD:
          this.player.activateShield(8);
          this.onShieldChange?.(true);
          this.audioManager.playShield();
          break;
        case POWERUP_TYPES.BOOST:
          this.player.activateBoost(3);
          this.onBoostChange?.(true);
          setTimeout(() => {
            if (!this.player.isBoosting) return;
            this.onBoostChange?.(false);
          }, 3000);
          this.audioManager.playBoost();
          break;
        case POWERUP_TYPES.RARE:
          this.score += 500;
          this.player.activateShield(5);
          this.onShieldChange?.(true);
          this.audioManager.playRare();
          value = 500;
          break;
      }
      this.onPowerUpCollected?.({
        type: type,
        value: value,
        x: this.player.x,
        y: this.player.y
      });
    }

    triggerExplosion(position) {
      const count = 15;
      for (let i = 0; i < count; i++) {
        // 找一个空闲粒子或创建新的
        let particle = this._explosionParticles.find(p => !p.active);
        if (!particle && this._explosionParticles.length < this._maxExplosionParticles) {
          const geom = new THREE.SphereGeometry(0.25, 6, 6);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xff6633,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const mesh = new THREE.Mesh(geom, mat);
          this.scene.add(mesh);
          particle = { mesh, active: false, velocity: new THREE.Vector3(), life: 0, maxLife: 1 };
          this._explosionParticles.push(particle);
        }
        if (!particle) continue;

        particle.active = true;
        particle.life = 0;
        particle.maxLife = 0.8 + Math.random() * 0.4;
        particle.mesh.position.copy(position);
        particle.velocity.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        );
        particle.mesh.scale.setScalar(0.5 + Math.random() * 0.8);
        particle.mesh.material.color.setHSL(0.03 + Math.random() * 0.08, 1, 0.6);
        particle.mesh.material.opacity = 1;
        particle.mesh.visible = true;
      }

      this.audioManager.playExplosion();
    }

    _updateExplosions(dt) {
      for (let i = this._explosionParticles.length - 1; i >= 0; i--) {
        const p = this._explosionParticles[i];
        if (!p.active) continue;

        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.mesh.visible = false;
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
        p.velocity.multiplyScalar(0.95); // 减速
        p.mesh.material.opacity = 1 - lifeRatio;
        p.mesh.scale.setScalar((1 + lifeRatio * 2) * 0.5);
      }
    }

    render() {
      if (!this.webglAvailable || !this.composer) {
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
        return;
      }
      this.composer.render();
    }

    // 菜单界面也渲染背景
    renderMenuFrame() {
      if (!this.webglAvailable) return;
      // 菜单态下缓慢更新星空做背景
      const dt = 0.016;
      if (this.starField) this.starField.update(dt, 0.3);
      if (this.player) this.player.update(dt, { left: false, right: false, up: false, down: false });
      try {
        this.render();
      } catch (e) {
        // 菜单渲染也容错
        console.warn('Menu render error:', e);
      }
    }

    startMenuAnimation() {
      if (!this.webglAvailable) return;
      if (this._menuAnimationId) return;
      // 确保游戏主循环没在跑
      if (this._running) return;

      const loop = () => {
        if (this.state !== GAME_STATE.MENU &&
            this.state !== GAME_STATE.GAME_OVER &&
            this.state !== GAME_STATE.PAUSED &&
            this.state !== GAME_STATE.COUNTDOWN) {
          this._menuAnimationId = null;
          return;
        }
        this.renderMenuFrame();
        this._menuAnimationId = requestAnimationFrame(loop);
      };
      this._menuAnimationId = requestAnimationFrame(loop);
    }

    stopMenuAnimation() {
      if (this._menuAnimationId) {
        cancelAnimationFrame(this._menuAnimationId);
        this._menuAnimationId = null;
      }
    }

    // === 高分存储 ===

    loadHighScore() {
      try {
        const saved = localStorage.getItem('stellarDash_highScore');
        this.highScore = saved ? parseInt(saved, 10) : 0;
      } catch (e) {
        this.highScore = 0;
      }
    }

    saveHighScore() {
      try {
        localStorage.setItem('stellarDash_highScore', String(this.highScore));
      } catch (e) {
        // 隐私模式等会失败，忽略
      }
    }

    getHighScore() {
      return this.highScore;
    }

    getSelectedSkin() {
      try {
        return localStorage.getItem('stellarDash_skin') || 'azure';
      } catch (e) {
        return 'azure';
      }
    }

    setSelectedSkin(skinId) {
      try {
        localStorage.setItem('stellarDash_skin', skinId);
      } catch (e) {}
      if (this.player) {
        this.player.setSkin(skinId);
      }
    }

    isSkinUnlocked(skinDef) {
      return this.achievementManager.isSkinUnlocked(skinDef);
    }

    getAchievementManager() {
      return this.achievementManager;
    }

    getGameState() {
      return this.state;
    }

    getStats() {
      return {
        score: Math.floor(this.score),
        highScore: this.highScore,
        maxCombo: this.maxCombo,
        gameTime: this.gameTime,
        isNewRecord: this.score >= this.highScore && this.score > 0
      };
    }

    toggleSound() {
      return this.audioManager.toggle();
    }

    isSoundEnabled() {
      return this.audioManager.isEnabled();
    }

    playClick() {
      this.audioManager.resume();
      this.audioManager.playClick();
    }

    // 触控接口
    setTouchInput(direction, active) {
      switch (direction) {
        case 'left':
          this.input.left = active;
          break;
        case 'right':
          this.input.right = active;
          break;
        case 'up':
          this.input.up = active;
          break;
        case 'down':
          this.input.down = active;
          break;
        case 'fire':
          if (this.state === GAME_STATE.PLAYING) {
            this.input.fire = active;
          }
          break;
      }
    }

    // 鼠标接口
    setMouseInput(button, active) {
      if (button === 'left' && this.state === GAME_STATE.PLAYING) {
        this.input.fire = active;
      }
    }

    dispose() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      this.starField.dispose();
      this.player.dispose();
      this.obstacleManager.dispose();
      this.powerUpManager.dispose();
      if (this.laserManager) this.laserManager.dispose();
      if (this.bossManager) this.bossManager.dispose();
      this.audioManager.stopEngineSound();

      this.renderer.dispose();
    }
  }

  global.Game = Game;
  global.GAME_STATE = GAME_STATE;
})(window);
