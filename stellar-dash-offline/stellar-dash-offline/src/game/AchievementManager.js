/*
 * AchievementManager - 成就系统（15个成就 + 扩展统计）
 * 成就定义、进度追踪、解锁检测、localStorage持久化
 */
(function(global) {
  'use strict';

  const STORAGE_KEY = 'stellarDash_achievements';
  const STATS_KEY = 'stellarDash_stats';

  // 成就定义（15个）
  const ACHIEVEMENT_DEFS = [
    // === 原有 8 个 ===
    {
      id: 'first_boss',
      name: '首战告捷',
      desc: '击败第一个 Boss',
      icon: '🏆',
      type: 'bossKills',
      target: 1
    },
    {
      id: 'boss_hunter',
      name: 'Boss猎手',
      desc: '累计击败 5 个 Boss',
      icon: '⚔️',
      type: 'bossKills',
      target: 5
    },
    {
      id: 'destroyer',
      name: '歼灭者',
      desc: '累计击毁 100 个障碍物',
      icon: '💥',
      type: 'totalDestroyed',
      target: 100
    },
    {
      id: 'flawless_flight',
      name: '完美飞行',
      desc: '单局连续 3000 分未受击',
      icon: '✨',
      type: 'flawlessScore',
      target: 3000
    },
    {
      id: 'combo_master',
      name: '连击大师',
      desc: '达成 20 连击',
      icon: '🔥',
      type: 'maxCombo',
      target: 20
    },
    {
      id: 'veteran_pilot',
      name: '资深飞行员',
      desc: '累计得分达到 10000 分',
      icon: '⭐',
      type: 'totalScore',
      target: 10000
    },
    {
      id: 'ace_flyer',
      name: '王牌机师',
      desc: '累计得分达到 50000 分',
      icon: '🌟',
      type: 'totalScore',
      target: 50000
    },
    {
      id: 'survivor',
      name: '星空守望者',
      desc: '单局游戏时长超过 3 分钟',
      icon: '⏱️',
      type: 'gameTime',
      target: 180
    },
    // === 新增 7 个 ===
    {
      id: 'obstacle_ace',
      name: '清道夫',
      desc: '单局击毁 50 个障碍物',
      icon: '🎯',
      type: 'sessionDestroyed',
      target: 50
    },
    {
      id: 'multi_boss',
      name: '双杀Boss',
      desc: '单局击败 2 个 Boss',
      icon: '👑',
      type: 'sessionBossKills',
      target: 2
    },
    {
      id: 'shield_master',
      name: '铁壁防御',
      desc: '累计抵挡 20 次伤害',
      icon: '🛡️',
      type: 'totalShieldBlocks',
      target: 20
    },
    {
      id: 'speed_demon',
      name: '极速狂飙',
      desc: '达到最高速度档位',
      icon: '🚀',
      type: 'maxSpeedReached',
      target: 1
    },
    {
      id: 'collector',
      name: '道具收藏家',
      desc: '累计收集 50 个道具',
      icon: '💎',
      type: 'totalPowerUps',
      target: 50
    },
    {
      id: 'flawless_boss',
      name: '无伤Boss',
      desc: '单局无伤击败 Boss',
      icon: '⚡',
      type: 'flawlessBoss',
      target: 1
    },
    {
      id: 'laser_happy',
      name: '激光狂魔',
      desc: '累计发射 200 次激光',
      icon: '🔫',
      type: 'totalLasers',
      target: 200
    },
    // === 第二批 15 个（共30个） ===
    {
      id: 'star_voyager',
      name: '星际漫游者',
      desc: '累计飞行 1000 单位距离',
      icon: '🌌',
      type: 'totalFlightDistance',
      target: 1000
    },
    {
      id: 'far_traveler',
      name: '远航者',
      desc: '累计飞行 5000 单位距离',
      icon: '🛸',
      type: 'totalFlightDistance',
      target: 5000
    },
    {
      id: 'dodge_master',
      name: '近身大师',
      desc: '累计完成 30 次完美闪避',
      icon: '💨',
      type: 'totalPerfectDodges',
      target: 30
    },
    {
      id: 'bulletproof',
      name: '坚不可摧',
      desc: '累计护盾抵挡 100 次伤害',
      icon: '🛡️',
      type: 'totalShieldBlocks',
      target: 100
    },
    {
      id: 'collector_grand',
      name: '收藏大家',
      desc: '累计收集 200 个道具',
      icon: '💎',
      type: 'totalPowerUps',
      target: 200
    },
    {
      id: 'laser_storm',
      name: '激光风暴',
      desc: '累计发射 1000 发激光',
      icon: '⚡',
      type: 'totalLasers',
      target: 1000
    },
    {
      id: 'triple_kill',
      name: '三连绝杀',
      desc: '单局击败 3 个 Boss',
      icon: '💀',
      type: 'sessionBossKills',
      target: 3
    },
    {
      id: 'god_of_war',
      name: '战神降临',
      desc: '累计击败 10 个 Boss',
      icon: '⚔️',
      type: 'bossKills',
      target: 10
    },
    {
      id: 'flawless_god',
      name: '无伤战神',
      desc: '累计 5 次无伤击败 Boss',
      icon: '✨',
      type: 'flawlessBoss',
      target: 5
    },
    {
      id: 'close_call',
      name: '命悬一线',
      desc: '单局完成 20 次完美闪避',
      icon: '🎯',
      type: 'sessionPerfectDodges',
      target: 20
    },
    {
      id: 'combo_legend',
      name: '连击传奇',
      desc: '达成 50 连击',
      icon: '🔥',
      type: 'maxCombo',
      target: 50
    },
    {
      id: 'eternal_glory',
      name: '荣耀永恒',
      desc: '累计得分达到 100000 分',
      icon: '🏆',
      type: 'totalScore',
      target: 100000
    },
    {
      id: 'aviator',
      name: '飞行家',
      desc: '累计游玩 50 局',
      icon: '✈️',
      type: 'gamesPlayed',
      target: 50
    },
    {
      id: 'skin_collector',
      name: '收藏大师',
      desc: '解锁全部 12 款飞船皮肤',
      icon: '🎨',
      type: 'totalSkinsUnlocked',
      target: 12
    },
    {
      id: 'barrage_buster',
      name: '弹幕克星',
      desc: '累计完成 100 次完美闪避',
      icon: '🌠',
      type: 'totalPerfectDodges',
      target: 100
    }
  ];

  class AchievementManager {
    constructor() {
      this.achievements = {};
      // 扩展统计字段
      this.stats = {
        totalScore: 0,
        totalDestroyed: 0,
        bossKills: 0,
        gamesPlayed: 0,
        maxCombo: 0,
        longestTime: 0,
        totalShieldBlocks: 0,
        totalPowerUps: 0,
        totalLasers: 0,
        maxSpeedReached: 0,
        totalFlightDistance: 0,
        flawlessBossKills: 0,
        totalPerfectDodges: 0,
        totalSkinsUnlocked: 1 // 默认解锁苍穹之刃
      };
      // 单局统计（每局重置）
      this.sessionStats = {
        destroyed: 0,
        bossKills: 0,
        flawlessBoss: false,
        hitTaken: false,
        perfectDodges: 0
      };
      this.unlockedThisSession = [];
      this.onUnlock = null;

      this.load();
    }

    load() {
      try {
        const savedAch = localStorage.getItem(STORAGE_KEY);
        if (savedAch) {
          this.achievements = JSON.parse(savedAch);
        }
        const savedStats = localStorage.getItem(STATS_KEY);
        if (savedStats) {
          const parsed = JSON.parse(savedStats);
          // 合并以兼容老数据
          for (const key in parsed) {
            if (this.stats.hasOwnProperty(key)) {
              this.stats[key] = parsed[key];
            }
          }
        }
      } catch (e) {}
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.achievements));
        localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
      } catch (e) {}
    }

    getAllAchievements() {
      return ACHIEVEMENT_DEFS.map(def => {
        const progress = this.achievements[def.id]?.progress || 0;
        const unlocked = !!this.achievements[def.id]?.unlocked;
        return {
          ...def,
          progress: progress,
          unlocked: unlocked
        };
      });
    }

    getStats() {
      return { ...this.stats };
    }

    // 重置单局统计
    resetSessionStats() {
      this.sessionStats = {
        destroyed: 0,
        bossKills: 0,
        flawlessBoss: false,
        hitTaken: false,
        perfectDodges: 0
      };
    }

    markHitTaken() {
      this.sessionStats.hitTaken = true;
    }

    /**
     * 更新某项统计并检测成就解锁
     * @param {string} type - 统计类型
     * @param {number} value - 当前值（累计型直接累加，最大型取最大值）
     * @param {boolean} isMax - 是否为取最大型
     */
    updateStat(type, value, isMax) {
      let changed = false;

      switch (type) {
        case 'totalScore':
          this.stats.totalScore += value;
          changed = true;
          break;
        case 'totalDestroyed':
          this.stats.totalDestroyed += value;
          this.sessionStats.destroyed += value;
          changed = true;
          break;
        case 'bossKills':
          this.stats.bossKills += value;
          this.sessionStats.bossKills += value;
          // 若本局未受击，记为无伤Boss
          if (!this.sessionStats.hitTaken) {
            this.stats.flawlessBossKills += value;
            this.updateSessionProgress('flawlessBoss', this.stats.flawlessBossKills);
          }
          changed = true;
          break;
        case 'gamesPlayed':
          this.stats.gamesPlayed += value;
          changed = true;
          break;
        case 'maxCombo':
          if (value > this.stats.maxCombo) {
            this.stats.maxCombo = value;
            changed = true;
          }
          break;
        case 'longestTime':
          if (value > this.stats.longestTime) {
            this.stats.longestTime = value;
            changed = true;
          }
          break;
        case 'totalShieldBlocks':
          this.stats.totalShieldBlocks += value;
          changed = true;
          break;
        case 'totalPowerUps':
          this.stats.totalPowerUps += value;
          changed = true;
          break;
        case 'totalLasers':
          this.stats.totalLasers += value;
          changed = true;
          break;
        case 'maxSpeedReached':
          if (value > this.stats.maxSpeedReached) {
            this.stats.maxSpeedReached = value;
            changed = true;
          }
          break;
        case 'totalFlightDistance':
          this.stats.totalFlightDistance += value;
          changed = true;
          break;
        case 'totalPerfectDodges':
          this.stats.totalPerfectDodges += value;
          this.sessionStats.perfectDodges += value;
          changed = true;
          break;
      }

      if (changed) {
        this.checkAchievements();
        // 同步检测单局成就
        this._checkSessionAchievements();
        this.save();
      }

      return changed;
    }

    /**
     * 更新单局进度型成就（如单局游戏时长、单局无伤积分等）
     */
    updateSessionProgress(type, value) {
      let changed = false;
      switch (type) {
        case 'flawlessScore':
        case 'gameTime':
          changed = true;
          break;
        case 'sessionDestroyed':
          this.sessionStats.destroyed = Math.max(this.sessionStats.destroyed, value);
          changed = true;
          break;
        case 'sessionBossKills':
          this.sessionStats.bossKills = Math.max(this.sessionStats.bossKills, value);
          changed = true;
          break;
        case 'sessionPerfectDodges':
          this.sessionStats.perfectDodges = Math.max(this.sessionStats.perfectDodges, value);
          changed = true;
          break;
      }

      if (changed) {
        // 更新对应成就进度
        ACHIEVEMENT_DEFS.forEach(def => {
          if (this.achievements[def.id]?.unlocked) return;
          if (def.type === type) {
            const progress = Math.min(value, def.target);
            if (!this.achievements[def.id]) {
              this.achievements[def.id] = { progress: 0 };
            }
            if (progress > this.achievements[def.id].progress) {
              this.achievements[def.id].progress = progress;
            }
            if (value >= def.target) {
              this._unlock(def.id);
            }
          }
        });
        this.save();
      }
    }

    _checkSessionAchievements() {
      // 单局击毁数
      if (this.sessionStats.destroyed > 0) {
        this.updateSessionProgress('sessionDestroyed', this.sessionStats.destroyed);
      }
      // 单局 Boss 击杀数
      if (this.sessionStats.bossKills > 0) {
        this.updateSessionProgress('sessionBossKills', this.sessionStats.bossKills);
      }
      // 单局完美闪避数
      if (this.sessionStats.perfectDodges > 0) {
        this.updateSessionProgress('sessionPerfectDodges', this.sessionStats.perfectDodges);
      }
    }

    checkAchievements() {
      ACHIEVEMENT_DEFS.forEach(def => {
        if (this.achievements[def.id]?.unlocked) return;

        let currentValue = 0;
        switch (def.type) {
          case 'totalScore':
            currentValue = this.stats.totalScore;
            break;
          case 'totalDestroyed':
            currentValue = this.stats.totalDestroyed;
            break;
          case 'bossKills':
            currentValue = this.stats.bossKills;
            break;
          case 'maxCombo':
            currentValue = this.stats.maxCombo;
            break;
          case 'longestTime':
            currentValue = this.stats.longestTime;
            break;
          case 'totalShieldBlocks':
            currentValue = this.stats.totalShieldBlocks;
            break;
          case 'totalPowerUps':
            currentValue = this.stats.totalPowerUps;
            break;
          case 'totalLasers':
            currentValue = this.stats.totalLasers;
            break;
          case 'maxSpeedReached':
            currentValue = this.stats.maxSpeedReached;
            break;
          case 'totalFlightDistance':
            currentValue = this.stats.totalFlightDistance;
            break;
          case 'flawlessBoss':
            currentValue = this.stats.flawlessBossKills;
            break;
          case 'totalPerfectDodges':
            currentValue = this.stats.totalPerfectDodges;
            break;
          case 'gamesPlayed':
            currentValue = this.stats.gamesPlayed;
            break;
          case 'totalSkinsUnlocked':
            currentValue = this.stats.totalSkinsUnlocked;
            break;
          default:
            return; // 局内成就不在此处检测
        }

        const progress = Math.min(currentValue, def.target);
        if (this.achievements[def.id]) {
          this.achievements[def.id].progress = progress;
        }

        if (currentValue >= def.target) {
          this._unlock(def.id);
        }
      });
    }

    _unlock(achievementId) {
      if (this.achievements[achievementId]?.unlocked) return;

      if (!this.achievements[achievementId]) {
        this.achievements[achievementId] = {};
      }
      this.achievements[achievementId].unlocked = true;
      const def = ACHIEVEMENT_DEFS.find(d => d.id === achievementId);
      if (def) {
        this.achievements[achievementId].progress = def.target;
        this.unlockedThisSession.push(def);
      }

      this.save();

      if (this.onUnlock && def) {
        try {
          this.onUnlock(def);
        } catch (e) {}
      }
    }

    resetSessionUnlocks() {
      this.unlockedThisSession = [];
    }

    /**
     * 更新已解锁皮肤数量（用于收藏大师成就检测）
     */
    updateSkinCount(count) {
      if (count > this.stats.totalSkinsUnlocked) {
        this.stats.totalSkinsUnlocked = count;
        this.checkAchievements();
        this.save();
      }
    }

    getUnlockedCount() {
      let count = 0;
      for (const id in this.achievements) {
        if (this.achievements[id].unlocked) count++;
      }
      return count;
    }

    getTotalCount() {
      return ACHIEVEMENT_DEFS.length;
    }

    /**
     * 检查皮肤是否已解锁
     */
    isSkinUnlocked(skinDef) {
      if (skinDef.unlocked) return true;

      switch (skinDef.unlockType) {
        case 'score':
          return this.stats.totalScore >= skinDef.unlockValue;
        case 'bossKills':
          return this.stats.bossKills >= skinDef.unlockValue;
        case 'totalDestroyed':
          return this.stats.totalDestroyed >= skinDef.unlockValue;
        case 'flightDistance':
          return this.stats.totalFlightDistance >= skinDef.unlockValue;
        case 'totalPowerUps':
          return this.stats.totalPowerUps >= skinDef.unlockValue;
        case 'totalLasers':
          return this.stats.totalLasers >= skinDef.unlockValue;
        case 'gamesPlayed':
          return this.stats.gamesPlayed >= skinDef.unlockValue;
        case 'totalPerfectDodges':
          return this.stats.totalPerfectDodges >= skinDef.unlockValue;
        case 'totalShieldBlocks':
          return this.stats.totalShieldBlocks >= skinDef.unlockValue;
        default:
          return false;
      }
    }
  }

  global.AchievementManager = AchievementManager;
  global.ACHIEVEMENT_DEFS = ACHIEVEMENT_DEFS;

})(window);
