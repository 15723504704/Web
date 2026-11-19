// === 主菜单组件 ===
function MainMenu({ onStart, onShowHelp, onShowAchievements, onShowSkins, difficulty, onDifficultyChange, highScore, onSoundToggle, soundEnabled, achievementCount, achievementTotal }) {
  return (
    <div className="menu-container">
      <div>
        <h1 className="game-title neon-text">星穹疾驰</h1>
        <p className="game-subtitle">STELLAR DASH</p>
      </div>

      <div className="menu-panel glass-panel">
        <button
          className="menu-btn primary"
          onClick={onStart}
        >
          开始游戏
        </button>

        <div className="difficulty-row">
          <button
            className={`diff-btn ${difficulty === 'easy' ? 'active' : ''}`}
            onClick={() => onDifficultyChange('easy')}
          >
            简单
          </button>
          <button
            className={`diff-btn ${difficulty === 'normal' ? 'active' : ''}`}
            onClick={() => onDifficultyChange('normal')}
          >
            普通
          </button>
          <button
            className={`diff-btn ${difficulty === 'hard' ? 'active' : ''}`}
            onClick={() => onDifficultyChange('hard')}
          >
            困难
          </button>
        </div>

        <div className="menu-secondary-row">
          <button className="menu-btn secondary" onClick={onShowSkins}>
            飞船皮肤
          </button>
          <button className="menu-btn secondary" onClick={onShowAchievements}>
            成就 <span style={{ fontSize: '12px', opacity: 0.7 }}>{achievementCount}/{achievementTotal}</span>
          </button>
        </div>

        <button className="menu-btn" onClick={onShowHelp}>
          操作说明
        </button>

        <div className="highscore-display">
          历史最高分 <span>{highScore}</span>
        </div>
      </div>

      <div className="menu-footer">
        WEB 程序设计课程大作业 · Three.js + React
      </div>

      <SoundToggle onToggle={onSoundToggle} enabled={soundEnabled} />
    </div>
  );
}

// === 帮助面板 ===
function HelpPanel({ onClose }) {
  return (
    <div className="overlay">
      <div className="help-panel glass-panel">
        <h2 className="panel-title">操作说明</h2>

        <div className="help-content">
          <div className="help-section">
            <h4>基础操作</h4>
            <p>
              <span className="key">↑ ↓ ← →</span> / <span className="key">WASD</span> 控制飞船移动
            </p>
            <p>
              <span className="key">Space</span> / 鼠标左键 发射激光
            </p>
            <p>
              移动端：触摸屏幕左右两侧控制方向，右下角按钮开火
            </p>
            <p>
              <span className="key">Esc</span> 暂停游戏
            </p>
          </div>

          <div className="help-section">
            <h4>道具说明</h4>
            <p>
              <span style={{ color: '#ffcc00' }}>◆ 金色能量</span> — 获得 100 分加分
            </p>
            <p>
              <span style={{ color: '#00e5ff' }}>◯ 护盾能量</span> — 获得 8 秒护盾保护
            </p>
            <p>
              <span style={{ color: '#ff2fd0' }}>⚡ 加速能量</span> — 获得 3 秒加速冲刺
            </p>
            <p>
              <span style={{ color: '#fff' }}>★ 稀有星</span> — 大量加分 + 护盾
            </p>
          </div>

          <div className="help-section">
            <h4>玩家状态</h4>
            <p>
              <b>生命值：</b>共 3 格生命，显示在左上角。受到伤害会损失一格，全部失去即任务失败。
            </p>
            <p>
              <b>护盾：</b>拾取蓝色护盾道具可获得护盾，能抵挡一次伤害并获得短暂无敌。
            </p>
            <p>
              <b>无敌帧：</b>受击后有 1.5 秒无敌时间（飞船闪烁），期间不会连续受伤，可利用这段时间调整位置。
            </p>
          </div>

          <div className="help-section">
            <h4>Boss 战</h4>
            <p>
              累计得分达到 <span className="key">2000</span> 后遭遇首个 Boss，之后每 <span className="key">+5000</span> 分出现下一个。
            </p>
            <p>
              <b>击败方式：</b>按住 <span className="key">空格</span> 持续发射激光，命中 Boss 即可扣血；血量清零即可击败，获得大量分数。
            </p>
            <p>
              <b>三阶段机制：</b>Boss 血量分为 P1（0~66%）、P2（66%~33%）、P3（33% 以下，濒死）。血量越低攻击越猛烈：弹幕更多、攻击更快，还会解锁激光束等新招式。
            </p>
            <p>
              <b>躲避要点：</b>
            </p>
            <p>
              · <b>扇形弹幕</b>：左右移动绕开子弹轨迹
            </p>
            <p>
              · <b>冲撞攻击</b>：看到屏幕红色「冲撞预警」和 Boss 红光聚能时，立即向 <b>反方向</b> 横向闪避；冲撞有明显预警期，不要慌
            </p>
            <p>
              · <b>激光束</b>：红色警告线出现 1 秒后发射，迅速上下移动脱离光束范围
            </p>
            <p>
              护盾道具可以抵挡一次致命伤害。
            </p>
          </div>

          <div className="help-section">
            <h4>得分技巧</h4>
            <p>紧贴障碍物飞过触发「完美闪避」，连续闪避累积连击数获得更高分数！</p>
            <p>激光击毁障碍物也可得分（大型能量柱需2发），击毁得分低于完美闪避，鼓励技术与取舍。</p>
          </div>
        </div>

        <div className="help-footer">
          <button className="menu-btn" onClick={onClose}>
            返回
          </button>
        </div>
      </div>
    </div>
  );
}

// === 成就面板 ===
function AchievementPanel({ achievements, onClose }) {
  return (
    <div className="overlay">
      <div className="achievement-panel glass-panel">
        <h2 className="panel-title">成就</h2>

        <div className="achievement-list">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="achievement-icon">{ach.icon}</div>
              <div className="achievement-info">
                <div className="achievement-name">{ach.name}</div>
                <div className="achievement-desc">{ach.desc}</div>
                {!ach.unlocked && (
                  <div className="achievement-progress-bar">
                    <div
                      className="achievement-progress-fill"
                      style={{ width: `${Math.min(100, (ach.progress / ach.target) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="achievement-status">
                {ach.unlocked ? '✓' : `${Math.floor(ach.progress)}/${ach.target}`}
              </div>
            </div>
          ))}
        </div>

        <button className="menu-btn" onClick={onClose}>
          返回
        </button>
      </div>
    </div>
  );
}

// === 皮肤面板 ===
function SkinPanel({ skins, selectedSkin, onSelect, onClose, achievementManager }) {
  return (
    <div className="overlay">
      <div className="skin-panel glass-panel">
        <h2 className="panel-title">飞船皮肤</h2>

        <div className="skin-list">
          {skins.map(skin => {
            const unlocked = skin.unlocked || (achievementManager?.isSkinUnlocked?.(skin) ?? false);
            const isSelected = selectedSkin === skin.id;
            return (
              <div
                key={skin.id}
                className={`skin-item ${unlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}`}
                onClick={() => unlocked && onSelect(skin.id)}
              >
                <div className="skin-preview" style={{ borderColor: `#${skin.colors.glow.toString(16).padStart(6, '0')}` }}>
                  <div className="skin-preview-inner" style={{
                    background: `radial-gradient(circle at 50% 30%, rgba(${hexToRgb(skin.colors.glow)}, 0.3), transparent 70%)`,
                  }}>
                    <ShipPreviewIcon colors={skin.colors} shape={skin.shape} />
                  </div>
                </div>
                <div className="skin-name" style={{ color: unlocked ? `#${skin.colors.glow.toString(16).padStart(6, '0')}` : '#666' }}>
                  {skin.name}
                </div>
                <div className="skin-desc">
                  {unlocked
                    ? (isSelected ? '★ 已装备 ★' : '✓ 已解锁 · 点击装备')
                    : getSkinUnlockText(skin)
                  }
                </div>
                {unlocked && !skin.unlocked && (
                  <div className="skin-condition">
                    解锁条件：{getSkinUnlockText(skin).replace(' 解锁', '')}
                  </div>
                )}
                {unlocked && skin.unlocked && !isSelected && (
                  <div className="skin-condition">
                    初始解锁
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="menu-btn" onClick={onClose}>
          返回
        </button>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `${r}, ${g}, ${b}`;
}

function getSkinUnlockText(skin) {
  switch (skin.unlockType) {
    case 'score': return `累计得分 ${skin.unlockValue.toLocaleString()} 解锁`;
    case 'bossKills': return `击败 ${skin.unlockValue} 个 Boss 解锁`;
    case 'totalDestroyed': return `累计击毁 ${skin.unlockValue.toLocaleString()} 个障碍解锁`;
    case 'flightDistance': return `累计飞行 ${formatDistance(skin.unlockValue)} 解锁`;
    case 'totalPowerUps': return `累计收集 ${skin.unlockValue} 个道具解锁`;
    case 'totalLasers': return `累计发射 ${skin.unlockValue} 次激光解锁`;
    case 'gamesPlayed': return `游玩 ${skin.unlockValue} 局解锁`;
    case 'totalPerfectDodges': return `累计 ${skin.unlockValue} 次完美闪避解锁`;
    case 'totalShieldBlocks': return `累计护盾抵挡 ${skin.unlockValue} 次解锁`;
    default: return '未解锁';
  }
}

function formatDistance(units) {
  if (units >= 1000) return (units / 1000).toFixed(1) + ' 千公里';
  return Math.floor(units) + ' 公里';
}

// 简化的飞船预览图标（SVG）— 按造型显示不同轮廓
function ShipPreviewIcon({ colors, shape }) {
  const glow = `#${colors.glow.toString(16).padStart(6, '0')}`;
  const primary = `#${colors.primary.toString(16).padStart(6, '0')}`;
  const secondary = `#${colors.secondary.toString(16).padStart(6, '0')}`;
  const accent = `#${colors.accent.toString(16).padStart(6, '0')}`;
  const trail = `#${colors.trail.toString(16).padStart(6, '0')}`;

  switch (shape) {
    case 'crimson':
      // 赤焰战鹰：前掠翼+外置双引擎
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M34,60 L31,78 L37,78 Z" fill={trail} opacity="0.6" />
          <path d="M46,60 L43,78 L49,78 Z" fill={trail} opacity="0.6" />
          <path d="M34,60 L32,76 L36,76 Z" fill="#fff" opacity="0.8" />
          <path d="M46,60 L44,76 L48,76 Z" fill="#fff" opacity="0.8" />
          {/* 前掠翼 */}
          <polygon points="6,48 28,32 28,52 14,56" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="74,48 52,32 52,52 66,56" fill={secondary} stroke={glow} strokeWidth="0.8" />
          {/* 机身 */}
          <polygon points="40,10 33,28 31,58 35,62 45,62 49,58 47,28" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 背上装甲 */}
          <rect x="34" y="30" width="12" height="18" fill={secondary} opacity="0.5" />
          {/* 座舱 */}
          <ellipse cx="40" cy="26" rx="5" ry="6" fill={glow} opacity="0.75" />
          <ellipse cx="40" cy="26" rx="3" ry="4" fill="#fff" opacity="0.4" />
          {/* 大垂尾 */}
          <polygon points="33,54 30,44 36,44 36,54" fill={secondary} stroke={glow} strokeWidth="0.6" />
          <polygon points="47,54 50,44 44,44 44,54" fill={secondary} stroke={glow} strokeWidth="0.6" />
          {/* 外置引擎 */}
          <rect x="29" y="58" width="5" height="8" fill={accent} rx="1" />
          <rect x="46" y="58" width="5" height="8" fill={accent} rx="1" />
          <circle cx="31.5" cy="66" r="1.5" fill={glow} />
          <circle cx="48.5" cy="66" r="1.5" fill={glow} />
          {/* 翼尖 */}
          <circle cx="7" cy="45" r="1.5" fill={accent} />
          <circle cx="73" cy="45" r="1.5" fill={accent} />
        </svg>
      );

    case 'violet':
      // 紫电魅影：X翼+双尾撑
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M40,64 L37,78 L43,78 Z" fill={trail} opacity="0.6" />
          <path d="M40,64 L38.5,76 L41.5,76 Z" fill="#fff" opacity="0.8" />
          <path d="M18,62 L17,74 L19,74 Z" fill={trail} opacity="0.4" />
          <path d="M62,62 L61,74 L63,74 Z" fill={trail} opacity="0.4" />
          {/* X翼（上下交叉） */}
          <polygon points="10,34 30,38 30,54 16,52" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="70,34 50,38 50,54 64,52" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="14,52 30,42 30,58 18,58" fill={secondary} stroke={glow} strokeWidth="0.6" opacity="0.7" />
          <polygon points="66,52 50,42 50,58 62,58" fill={secondary} stroke={glow} strokeWidth="0.6" opacity="0.7" />
          {/* 机身 */}
          <polygon points="40,8 34,28 32,62 36,66 44,66 48,62 46,28" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 棱角座舱 */}
          <polygon points="40,22 35,32 45,32" fill={glow} opacity="0.7" />
          <polygon points="40,24 37,31 43,31" fill="#fff" opacity="0.5" />
          {/* 尾撑+垂尾 */}
          <rect x="20" y="52" width="3" height="12" fill={secondary} />
          <rect x="57" y="52" width="3" height="12" fill={secondary} />
          <polygon points="20,52 18,60 23,60 23,52" fill={accent} />
          <polygon points="60,52 62,60 57,60 57,52" fill={accent} />
          {/* 翼尖发光 */}
          <circle cx="11" cy="43" r="1.2" fill={accent} />
          <circle cx="69" cy="43" r="1.2" fill={accent} />
        </svg>
      );

    case 'golden':
      // 黄金圣骑：宽翼面+背鳍
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M30,62 L27,78 L33,78 Z" fill={trail} opacity="0.6" />
          <path d="M50,62 L47,78 L53,78 Z" fill={trail} opacity="0.6" />
          <path d="M30,62 L28.5,76 L31.5,76 Z" fill="#fff" opacity="0.8" />
          <path d="M50,62 L48.5,76 L51.5,76 Z" fill="#fff" opacity="0.8" />
          {/* 宽大三角翼 */}
          <polygon points="4,46 28,28 28,54 14,58" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="76,46 52,28 52,54 66,58" fill={secondary} stroke={glow} strokeWidth="0.8" />
          {/* 机身 */}
          <polygon points="40,12 32,30 30,60 35,64 45,64 50,60 48,30" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 金色装饰带 */}
          <rect x="32" y="34" width="16" height="2" fill={accent} />
          <rect x="33" y="42" width="14" height="2" fill={accent} />
          {/* 背鳍 */}
          <polygon points="40,18 37,42 43,42" fill={secondary} stroke={glow} strokeWidth="0.6" />
          {/* 座舱 */}
          <ellipse cx="40" cy="30" rx="5" ry="6" fill={glow} opacity="0.75" />
          <ellipse cx="40" cy="30" rx="3" ry="4" fill="#fff" opacity="0.4" />
          {/* 双垂尾 */}
          <polygon points="32,56 29,46 35,46 35,56" fill={secondary} stroke={glow} strokeWidth="0.6" />
          <polygon points="48,56 51,46 45,46 45,56" fill={secondary} stroke={glow} strokeWidth="0.6" />
          {/* 翼下引擎 */}
          <rect x="25" y="54" width="4" height="10" fill={accent} rx="1" />
          <rect x="51" y="54" width="4" height="10" fill={accent} rx="1" />
          <circle cx="27" cy="64" r="1.5" fill={glow} />
          <circle cx="53" cy="64" r="1.5" fill={glow} />
        </svg>
      );

    case 'frost':
      // 寒霜之翼：细长飞镖型
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M40,68 L37,78 L43,78 Z" fill={trail} opacity="0.7" />
          <path d="M40,68 L38.5,77 L41.5,77 Z" fill="#fff" opacity="0.9" />
          {/* 窄小后掠翼 */}
          <polygon points="18,42 30,30 30,48 22,50" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="62,42 50,30 50,48 58,50" fill={secondary} stroke={glow} strokeWidth="0.8" />
          {/* 极细长机身 */}
          <polygon points="40,5 35,28 33,68 37,72 43,72 47,68 45,28" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 长机头 */}
          <polygon points="40,5 37,18 43,18" fill={secondary} />
          {/* 座舱（细窄） */}
          <ellipse cx="40" cy="28" rx="3" ry="7" fill={glow} opacity="0.7" />
          <ellipse cx="40" cy="28" rx="1.5" ry="5" fill="#fff" opacity="0.5" />
          {/* 单高垂尾 */}
          <polygon points="39,56 37,42 41,42 41,56" fill={secondary} stroke={glow} strokeWidth="0.6" />
          {/* 小平尾 */}
          <polygon points="32,62 28,60 28,64 32,65" fill={secondary} />
          <polygon points="48,62 52,60 52,64 48,65" fill={secondary} />
          {/* 机鼻光点 */}
          <circle cx="40" cy="6" r="1.2" fill={accent} />
        </svg>
      );

    case 'shadow':
      // 幽影之刺：无尾三角翼飞翼
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M32,62 L30,76 L34,76 Z" fill={trail} opacity="0.5" />
          <path d="M48,62 L46,76 L50,76 Z" fill={trail} opacity="0.5" />
          {/* 大三角飞翼（身翼一体） */}
          <polygon points="40,10 6,50 20,62 60,62 74,50" fill={primary} stroke={glow} strokeWidth="1" />
          {/* 后缘锯齿 */}
          <polygon points="20,62 28,60 36,62" fill={accent} opacity="0.6" />
          <polygon points="44,62 52,60 60,62" fill={accent} opacity="0.6" />
          {/* 背部隆起 */}
          <polygon points="40,16 32,56 48,56" fill={secondary} opacity="0.5" />
          {/* 扁平座舱 */}
          <ellipse cx="40" cy="28" rx="5" ry="5" fill={glow} opacity="0.6" />
          <ellipse cx="40" cy="28" rx="2.5" ry="3" fill="#fff" opacity="0.4" />
          {/* 翼尖荧光条 */}
          <circle cx="8" cy="49" r="1.5" fill={accent} />
          <circle cx="72" cy="49" r="1.5" fill={accent} />
          {/* 机鼻传感器 */}
          <circle cx="40" cy="13" r="1.2" fill={glow} />
          {/* 扁平喷口 */}
          <rect x="30" y="60" width="5" height="4" fill={accent} rx="0.5" />
          <rect x="45" y="60" width="5" height="4" fill={accent} rx="0.5" />
        </svg>
      );

    case 'orion':
      // 猎户座巡航者：双尾撑经典战机
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M22,64 L20,78 L24,78 Z" fill={trail} opacity="0.6" />
          <path d="M58,64 L56,78 L60,78 Z" fill={trail} opacity="0.6" />
          <path d="M22,64 L21,76 L23,76 Z" fill="#fff" opacity="0.7" />
          <path d="M58,64 L57,76 L59,76 Z" fill="#fff" opacity="0.7" />
          {/* 中单翼 */}
          <polygon points="8,40 28,30 28,50 14,52" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="72,40 52,30 52,50 66,52" fill={secondary} stroke={glow} strokeWidth="0.8" />
          {/* 中央机身 */}
          <polygon points="40,10 34,28 33,58 37,62 43,62 47,58 46,28" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 气泡座舱 */}
          <ellipse cx="40" cy="24" rx="5" ry="6" fill={glow} opacity="0.75" />
          <ellipse cx="40" cy="24" rx="3" ry="4" fill="#fff" opacity="0.45" />
          {/* 后舱盖 */}
          <ellipse cx="40" cy="36" rx="4" ry="4" fill={secondary} opacity="0.5" />
          {/* 双尾撑 */}
          <rect x="19" y="46" width="3" height="20" fill={secondary} />
          <rect x="58" y="46" width="3" height="20" fill={secondary} />
          {/* 尾端垂尾+平尾 */}
          <polygon points="19,58 17,66 22,66 22,58" fill={accent} />
          <polygon points="61,58 63,66 58,66 58,58" fill={accent} />
          <rect x="15" y="64" width="8" height="2" fill={secondary} />
          <rect x="57" y="64" width="8" height="2" fill={secondary} />
          {/* 翼尖发光 */}
          <circle cx="9" cy="42" r="1.2" fill={accent} />
          <circle cx="71" cy="42" r="1.2" fill={accent} />
        </svg>
      );

    case 'fireball':
      // 火流星：碟形/环形
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M40,66 L36,78 L44,78 Z" fill={trail} opacity="0.65" />
          <path d="M40,66 L38,77 L42,77 Z" fill="#fff" opacity="0.8" />
          <path d="M26,60 L24,72 L28,72 Z" fill={trail} opacity="0.4" />
          <path d="M54,60 L52,72 L56,72 Z" fill={trail} opacity="0.4" />
          {/* 外环 */}
          <ellipse cx="40" cy="40" rx="30" ry="8" fill={secondary} stroke={glow} strokeWidth="1.2" />
          <ellipse cx="40" cy="40" rx="30" ry="8" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.8" />
          {/* 中央球体 */}
          <ellipse cx="40" cy="40" rx="12" ry="7" fill={primary} stroke={glow} strokeWidth="1" />
          {/* 顶部座舱 */}
          <ellipse cx="40" cy="32" rx="6" ry="5" fill={glow} opacity="0.7" />
          <ellipse cx="40" cy="32" rx="3.5" ry="3" fill="#fff" opacity="0.5" />
          {/* 环上三个节点 */}
          <circle cx="40" cy="14" r="2.5" fill={accent} />
          <circle cx="15" cy="44" r="2" fill={accent} />
          <circle cx="65" cy="44" r="2" fill={accent} />
          {/* 机鼻突出 */}
          <circle cx="40" cy="11" r="1.5" fill={glow} />
        </svg>
      );

    case 'ringblade':
      // 环刃武士：环形翼战机
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M33,62 L30,76 L36,76 Z" fill={trail} opacity="0.6" />
          <path d="M47,62 L44,76 L50,76 Z" fill={trail} opacity="0.6" />
          <path d="M33,62 L31.5,74 L34.5,74 Z" fill="#fff" opacity="0.75" />
          <path d="M47,62 L45.5,74 L48.5,74 Z" fill="#fff" opacity="0.75" />
          {/* 环形机翼（大圆环） */}
          <ellipse cx="40" cy="42" rx="28" ry="7" fill="none" stroke={secondary} strokeWidth="2.5" />
          <ellipse cx="40" cy="42" rx="28" ry="7" fill="none" stroke={glow} strokeWidth="0.8" opacity="0.8" />
          {/* 中央机身 */}
          <polygon points="40,16 35,34 34,60 37,64 43,64 46,60 45,34" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 辐条连接 */}
          <line x1="40" y1="36" x2="13" y2="42" stroke={secondary} strokeWidth="1.5" />
          <line x1="40" y1="36" x2="67" y2="42" stroke={secondary} strokeWidth="1.5" />
          <line x1="40" y1="48" x2="14" y2="46" stroke={secondary} strokeWidth="1.2" opacity="0.7" />
          <line x1="40" y1="48" x2="66" y2="46" stroke={secondary} strokeWidth="1.2" opacity="0.7" />
          {/* 座舱 */}
          <ellipse cx="40" cy="30" rx="4" ry="5" fill={glow} opacity="0.75" />
          <ellipse cx="40" cy="30" rx="2.5" ry="3.5" fill="#fff" opacity="0.45" />
          {/* 机首 */}
          <polygon points="40,16 37,22 43,22" fill={secondary} />
          <circle cx="40" cy="15" r="1.2" fill={glow} />
          {/* 双引擎 */}
          <rect x="30" y="58" width="4" height="8" fill={accent} rx="1" />
          <rect x="46" y="58" width="4" height="8" fill={accent} rx="1" />
          <circle cx="32" cy="66" r="1.3" fill={glow} />
          <circle cx="48" cy="66" r="1.3" fill={glow} />
        </svg>
      );

    case 'armor':
      // 装甲巨像：重装六边形方舟
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M28,64 L25,78 L31,78 Z" fill={trail} opacity="0.6" />
          <path d="M52,64 L49,78 L55,78 Z" fill={trail} opacity="0.6" />
          <path d="M40,66 L37,78 L43,78 Z" fill={trail} opacity="0.7" />
          <path d="M28,64 L26.5,76 L29.5,76 Z" fill="#fff" opacity="0.7" />
          <path d="M52,64 L50.5,76 L53.5,76 Z" fill="#fff" opacity="0.7" />
          <path d="M40,66 L38.5,76 L41.5,76 Z" fill="#fff" opacity="0.8" />
          {/* 厚重主翼 */}
          <polygon points="6,42 24,32 24,54 12,56" fill={secondary} stroke={glow} strokeWidth="1" />
          <polygon points="74,42 56,32 56,54 68,56" fill={secondary} stroke={glow} strokeWidth="1" />
          {/* 翼尖装甲块 */}
          <rect x="4" y="38" width="4" height="12" fill={accent} rx="1" />
          <rect x="72" y="38" width="4" height="12" fill={accent} rx="1" />
          {/* 六边形舰体（俯视简化为矩形+装甲条） */}
          <rect x="28" y="16" width="24" height="48" fill={primary} stroke={glow} strokeWidth="1.2" rx="3" />
          {/* 装甲加强筋 */}
          <line x1="28" y1="26" x2="52" y2="26" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <line x1="28" y1="38" x2="52" y2="38" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <line x1="28" y1="50" x2="52" y2="50" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          {/* 指挥塔/舰桥 */}
          <rect x="32" y="20" width="16" height="8" fill={secondary} stroke={glow} strokeWidth="0.8" rx="1" />
          {/* 观察窗 */}
          <rect x="34" y="22" width="12" height="3" fill={glow} rx="1" opacity="0.8" />
          {/* 座舱 */}
          <ellipse cx="40" cy="34" rx="5" ry="4" fill={glow} opacity="0.6" />
          <ellipse cx="40" cy="34" rx="3" ry="2.5" fill="#fff" opacity="0.4" />
          {/* 主炮 */}
          <rect x="36" y="8" width="8" height="10" fill={accent} rx="1.5" />
          <circle cx="40" cy="8" r="1.5" fill={glow} />
          {/* 三引擎喷口 */}
          <circle cx="29" cy="64" r="2" fill={accent} />
          <circle cx="40" cy="66" r="2.5" fill={accent} />
          <circle cx="51" cy="64" r="2" fill={accent} />
          <circle cx="29" cy="64" r="1" fill={glow} />
          <circle cx="40" cy="66" r="1.2" fill={glow} />
          <circle cx="51" cy="64" r="1" fill={glow} />
        </svg>
      );

    case 'hummingbird':
      // 蜂鸟斥候：双尾撑前掠翼轻型机
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M24,62 L22,74 L26,74 Z" fill={trail} opacity="0.55" />
          <path d="M56,62 L54,74 L58,74 Z" fill={trail} opacity="0.55" />
          <path d="M24,62 L22.5,72 L25.5,72 Z" fill="#fff" opacity="0.7" />
          <path d="M56,62 L54.5,72 L57.5,72 Z" fill="#fff" opacity="0.7" />
          {/* 前掠主翼（翼尖朝前） */}
          <polygon points="14,44 28,52 28,36 20,34" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="66,44 52,52 52,36 60,34" fill={secondary} stroke={glow} strokeWidth="0.8" />
          {/* 翼尖发光 */}
          <circle cx="15" cy="43" r="1.2" fill={accent} />
          <circle cx="65" cy="43" r="1.2" fill={accent} />
          {/* 小巧机身 */}
          <polygon points="40,14 35,30 34,58 37,62 43,62 46,58 45,30" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 气泡座舱 */}
          <ellipse cx="40" cy="28" rx="3.5" ry="4.5" fill={glow} opacity="0.8" />
          <ellipse cx="40" cy="28" rx="2" ry="3" fill="#fff" opacity="0.5" />
          {/* 机首锥 */}
          <polygon points="40,14 37,20 43,20" fill={secondary} />
          <circle cx="40" cy="13" r="1" fill={glow} />
          {/* 双尾撑杆 */}
          <line x1="34" y1="50" x2="24" y2="62" stroke={secondary} strokeWidth="1.5" />
          <line x1="46" y1="50" x2="56" y2="62" stroke={secondary} strokeWidth="1.5" />
          {/* 尾端垂尾 */}
          <polygon points="24,58 22,64 26,64 26,58" fill={accent} />
          <polygon points="56,58 58,64 54,64 54,58" fill={accent} />
          {/* 尾端平尾 */}
          <line x1="20" y1="63" x2="28" y2="63" stroke={secondary} strokeWidth="1.5" />
          <line x1="52" y1="63" x2="60" y2="63" stroke={secondary} strokeWidth="1.5" />
          {/* 引擎喷口 */}
          <circle cx="24" cy="63" r="1.2" fill={glow} />
          <circle cx="56" cy="63" r="1.2" fill={glow} />
        </svg>
      );

    case 'reaper':
      // 死神镰刃：大后掠镰刀翼+前掠鸭翼
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <path d="M33,62 L30,76 L36,76 Z" fill={trail} opacity="0.6" />
          <path d="M47,62 L44,76 L50,76 Z" fill={trail} opacity="0.6" />
          <path d="M33,62 L31.5,74 L34.5,74 Z" fill="#fff" opacity="0.75" />
          <path d="M47,62 L45.5,74 L48.5,74 Z" fill="#fff" opacity="0.75" />
          {/* 大后掠镰刀形主翼（后掠角极大） */}
          <polygon points="20,52 28,26 28,48 10,56" fill={secondary} stroke={glow} strokeWidth="0.9" />
          <polygon points="60,52 52,26 52,48 70,56" fill={secondary} stroke={glow} strokeWidth="0.9" />
          {/* 镰刀外段（翼尖延伸） */}
          <polygon points="6,56 16,48 20,52 8,60" fill={accent} opacity="0.8" />
          <polygon points="74,56 64,48 60,52 72,60" fill={accent} opacity="0.8" />
          {/* 翼尖发光（杀气） */}
          <circle cx="7" cy="56" r="1.3" fill={glow} />
          <circle cx="73" cy="56" r="1.3" fill={glow} />
          {/* 前掠鸭翼（机首两侧） */}
          <polygon points="22,32 30,36 28,28 24,28" fill={secondary} stroke={glow} strokeWidth="0.7" />
          <polygon points="58,32 50,36 52,28 56,28" fill={secondary} stroke={glow} strokeWidth="0.7" />
          {/* 鸭翼尖发光 */}
          <circle cx="23" cy="30" r="0.9" fill={accent} />
          <circle cx="57" cy="30" r="0.9" fill={accent} />
          {/* 中央机身（修长棱角） */}
          <polygon points="40,10 34,28 33,60 36,64 44,64 47,60 46,28" fill={primary} stroke={glow} strokeWidth="1.2" />
          {/* 脊背线 */}
          <line x1="40" y1="14" x2="40" y2="58" stroke={accent} strokeWidth="0.8" opacity="0.6" />
          {/* 低矮狭长座舱 */}
          <ellipse cx="40" cy="30" rx="3.5" ry="5" fill={glow} opacity="0.7" />
          <ellipse cx="40" cy="30" rx="2" ry="3.5" fill="#fff" opacity="0.4" />
          {/* 单垂尾 */}
          <polygon points="39,54 37,42 41,42 41,54" fill={secondary} stroke={glow} strokeWidth="0.6" />
          {/* 垂尾警示灯 */}
          <circle cx="39" cy="41" r="1" fill={accent} />
          {/* 机首 */}
          <polygon points="40,10 37,16 43,16" fill={secondary} />
          <circle cx="40" cy="9" r="1.2" fill={glow} />
          {/* 双引擎 */}
          <rect x="30" y="58" width="4" height="8" fill={accent} rx="1" />
          <rect x="46" y="58" width="4" height="8" fill={accent} rx="1" />
          <circle cx="32" cy="66" r="1.3" fill={glow} />
          <circle cx="48" cy="66" r="1.3" fill={glow} />
        </svg>
      );

    case 'azure':
    default:
      // 苍穹之刃：标准修长后掠三角翼
      return (
        <svg viewBox="0 0 80 80" className="ship-preview-icon" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          {/* 引擎尾迹光束 */}
          <path d="M35,62 L33,78 L37,78 Z" fill={trail} opacity="0.6" />
          <path d="M45,62 L43,78 L47,78 Z" fill={trail} opacity="0.6" />
          <path d="M35,62 L34,76 L36,76 Z" fill="#fff" opacity="0.8" />
          <path d="M45,62 L44,76 L46,76 Z" fill="#fff" opacity="0.8" />

          {/* 机翼（大后掠） */}
          <polygon points="8,40 28,32 28,52 14,54" fill={secondary} stroke={glow} strokeWidth="0.8" />
          <polygon points="72,40 52,32 52,52 66,54" fill={secondary} stroke={glow} strokeWidth="0.8" />

          {/* 机身主体（修长流线形） */}
          <polygon points="40,10 32,28 30,58 34,62 46,62 50,58 48,28" fill={primary} stroke={glow} strokeWidth="1.2" />

          {/* 机身中段深色部 */}
          <polygon points="33,36 47,36 49,52 31,52" fill={secondary} opacity="0.6" />

          {/* 座舱 */}
          <ellipse cx="40" cy="28" rx="4.5" ry="7" fill={glow} opacity="0.75" />
          <ellipse cx="40" cy="28" rx="3" ry="5" fill="#fff" opacity="0.4" />

          {/* 双垂尾 */}
          <polygon points="34,56 32,48 36,48 37,56" fill={secondary} stroke={glow} strokeWidth="0.6" />
          <polygon points="46,56 44,48 48,48 47,56" fill={secondary} stroke={glow} strokeWidth="0.6" />

          {/* 引擎喷口 */}
          <circle cx="36" cy="62" r="2.5" fill={accent} />
          <circle cx="44" cy="62" r="2.5" fill={accent} />
          <circle cx="36" cy="62" r="1.2" fill={glow} />
          <circle cx="44" cy="62" r="1.2" fill={glow} />

          {/* 翼尖发光点 */}
          <circle cx="9" cy="47" r="1.5" fill={accent} />
          <circle cx="71" cy="47" r="1.5" fill={accent} />

          {/* 机鼻 */}
          <polygon points="40,10 37,16 43,16" fill={secondary} />
        </svg>
      );
  }
}

// === 成就解锁 Toast ===
function AchievementToast({ achievement, onAnimationEnd }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd?.();
    }, 3500);
    return () => clearTimeout(timer);
  }, [achievement?.id, onAnimationEnd]);

  if (!achievement) return null;

  return (
    <div className="achievement-toast">
      <div className="toast-icon">{achievement.icon}</div>
      <div className="toast-content">
        <div className="toast-title">成就解锁</div>
        <div className="toast-name">{achievement.name}</div>
        <div className="toast-desc">{achievement.desc}</div>
      </div>
    </div>
  );
}

// === Boss 血条 HUD ===
function BossHealthBar({ hp, maxHp, phase, bossActive }) {
  if (!bossActive) return null;
  const percent = Math.max(0, (hp / maxHp) * 100);

  const phaseColors = ['#ff4477', '#ffaa00', '#ff1133'];
  const color = phaseColors[Math.min(phase - 1, 2)];
  const isDying = percent < 33 && phase === 3;

  const phaseNames = ['一', '二', '三'];

  return (
    <div className={`boss-hud ${isDying ? 'boss-dying' : ''}`}>
      <div className="boss-name">
        <span>虚空掠食者</span>
        <span className={`boss-phase phase-${phase}`}>P{phase} · 阶段{phaseNames[phase - 1]}</span>
      </div>
      <div className="boss-hp-bar">
        <div
          className="boss-hp-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      {isDying && <div className="boss-dying-text">⚠ 濒死状态 ⚠</div>}
    </div>
  );
}

// === 玩家生命值 HUD ===
function LivesDisplay({ lives, maxLives }) {
  const hearts = [];
  for (let i = 0; i < maxLives; i++) {
    hearts.push(
      <div
        key={i}
        className={`life-heart ${i < lives ? 'active' : 'lost'}`}
      >
        <svg viewBox="0 0 24 24" className="heart-icon">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    );
  }
  return <div className="lives-display">{hearts}</div>;
}

// === 冲撞预警 ===
function ChargeWarning({ warn }) {
  if (!warn) return null;
  return (
    <div className="charge-warn-overlay">
      <div className="charge-warn-text">⚠ 冲撞预警 ⚠</div>
      <div className="charge-warn-sub">立即横向闪避！</div>
      <div className={`charge-warn-arrow ${warn.x > 0 ? 'from-right' : 'from-left'}`}>
        ↕
      </div>
    </div>
  );
}

// === 道具拾取浮字 ===
function PickupTexts({ texts }) {
  return (
    <div className="pickup-texts">
      {texts.map(t => (
        <div
          key={t.id}
          className="pickup-text-item"
          style={{ color: t.color }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

// === Boss 出场提示 ===
function BossIntro({ visible }) {
  if (!visible) return null;
  return (
    <div className="boss-intro">
      <div className="boss-intro-line1">⚠ 警告 ⚠</div>
      <div className="boss-intro-line2">锁定 Boss，持续开火！</div>
      <div className="boss-intro-line3">用激光射击 · 躲避弹幕与冲撞</div>
    </div>
  );
}

// === 游戏HUD ===
function GameHUD({ score, speed, speedMultiplier, hasShield, combo, onPause, isBoosting, fireCooldown, bossHp, bossMaxHp, bossPhase, bossActive, bossIntro, chargeWarn, pickupTexts, lives, maxLives }) {
  const speedPercent = Math.min(100, (speedMultiplier - 1) / 2 * 100);
  const cooldownPercent = Math.min(100, fireCooldown * 100);
  const canFire = fireCooldown >= 1;

  return (
    <div className="hud-container">
      <div className="hud-top">
        <div className="hud-score-block">
          <div className="hud-label">得分</div>
          <div className="hud-score">{score.toLocaleString()}</div>
          <LivesDisplay lives={lives} maxLives={maxLives} />
        </div>

        <div className="hud-right">
          <div className="hud-speed-bar">
            <div className="hud-label">速度</div>
            <div className="speed-bar">
              <div
                className="speed-bar-fill"
                style={{ width: `${speedPercent}%` }}
              />
            </div>
          </div>

          {hasShield && (
            <div className="hud-shield">
              <div className="shield-icon"></div>
              护盾激活
            </div>
          )}
        </div>
      </div>

      <button className="pause-btn" onClick={onPause}>
        <div className="pause-icon">
          <span></span>
          <span></span>
        </div>
      </button>

      <div className={`hud-combo ${combo > 0 ? 'visible' : ''}`}>
        <div className="combo-count">x{combo}</div>
        <div className="combo-label">COMBO</div>
      </div>

      <div className={`boost-indicator ${isBoosting ? 'active' : ''}`}>
        BOOST
      </div>

      {/* 武器冷却指示（屏幕中央准星下方） */}
      <div className="weapon-cooldown-hud">
        <div className="cooldown-ring">
          <svg viewBox="0 0 36 36">
            <circle
              className="cooldown-ring-bg"
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(0, 229, 255, 0.2)"
              strokeWidth="2"
            />
            <circle
              className="cooldown-ring-fill"
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={canFire ? '#00ffff' : '#006677'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${cooldownPercent * 0.94} 100`}
              transform="rotate(-90 18 18)"
              style={{ transition: 'stroke 0.1s' }}
            />
          </svg>
          <div className="cooldown-dot" style={{ opacity: canFire ? 1 : 0.4 }}></div>
        </div>
      </div>

      {/* Boss 血条 */}
      <BossHealthBar
        hp={bossHp}
        maxHp={bossMaxHp}
        phase={bossPhase}
        bossActive={bossActive}
      />

      {/* Boss 出场提示 */}
      <BossIntro visible={bossIntro} />

      {/* 冲撞预警 */}
      <ChargeWarning warn={chargeWarn} />

      {/* 拾取浮字 */}
      <PickupTexts texts={pickupTexts} />
    </div>
  );
}

// === 暂停面板 ===
function PausePanel({ onResume, onRestart, onMenu }) {
  return (
    <div className="overlay">
      <div className="pause-panel glass-panel">
        <h2 className="pause-title">游戏暂停</h2>
        <button className="menu-btn primary" onClick={onResume}>
          继续游戏
        </button>
        <button className="menu-btn" onClick={onRestart}>
          重新开始
        </button>
        <button className="menu-btn" onClick={onMenu}>
          返回主菜单
        </button>
      </div>
    </div>
  );
}

// === 游戏结束面板 ===
function GameOverPanel({ stats, onRestart, onMenu, fatalError, newAchievements, deathCause }) {
  const { score, highScore, maxCombo, gameTime, isNewRecord } = stats;

  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // 死亡原因文字映射
  const deathReasons = {
    obstacle: '撞上障碍物',
    bossBullet: '被 Boss 弹幕击中',
    bossLaser: '被 Boss 激光束命中',
    bossCharge: '被 Boss 冲撞碾压'
  };
  const reasonText = deathReasons[deathCause] || '';

  return (
    <div className="overlay">
      <div className="gameover-panel glass-panel">
        <h2 className="gameover-title">
          {fatalError ? '运行异常' : '任务失败'}
        </h2>

        {fatalError && (
          <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: '13px', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
            {fatalError}
          </p>
        )}

        {reasonText && !fatalError && (
          <div className="death-reason">
            <span className="death-reason-label">阵亡原因</span>
            <span className="death-reason-text">{reasonText}</span>
          </div>
        )}

        {isNewRecord && !fatalError && <div className="new-record">★ 新纪录 ★</div>}

        <div className="score-summary">
          <div className="score-row">
            <span className="label">本局得分</span>
            <span className="value">{score.toLocaleString()}</span>
          </div>
          <div className="score-row highlight">
            <span className="label">历史最高</span>
            <span className="value">{highScore.toLocaleString()}</span>
          </div>
          <div className="score-row">
            <span className="label">最高连击</span>
            <span className="value">x{maxCombo}</span>
          </div>
          <div className="score-row">
            <span className="label">飞行时长</span>
            <span className="value">{timeStr}</span>
          </div>
        </div>

        {newAchievements && newAchievements.length > 0 && (
          <div className="new-achievements">
            <div className="na-title">本局解锁成就</div>
            {newAchievements.map(ach => (
              <div key={ach.id} className="na-item">
                <span>{ach.icon}</span> {ach.name}
              </div>
            ))}
          </div>
        )}

        <button className="menu-btn primary" onClick={onRestart}>
          再来一局
        </button>
        <button className="menu-btn" onClick={onMenu}>
          返回主菜单
        </button>
      </div>
    </div>
  );
}

// === 倒计时 ===
function Countdown({ value }) {
  if (!value) return null;
  return (
    <div className="countdown-overlay">
      <div className="countdown-number">{value}</div>
    </div>
  );
}

// === 伤害闪屏 ===
function DamageFlash({ trigger }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (trigger) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  if (!visible) return null;
  return <div className="damage-flash" />;
}

// === 触控控件 ===
function TouchControls({ onTouchStart, onTouchEnd, onFireStart, onFireEnd }) {
  const handleStart = (dir) => (e) => {
    e.preventDefault();
    onTouchStart(dir);
  };
  const handleEnd = (dir) => (e) => {
    e.preventDefault();
    onTouchEnd(dir);
  };

  return (
    <div className="touch-controls">
      <div
        className="touch-left"
        onTouchStart={handleStart('left')}
        onTouchEnd={handleEnd('left')}
        onTouchCancel={handleEnd('left')}
        onMouseDown={handleStart('left')}
        onMouseUp={handleEnd('left')}
        onMouseLeave={handleEnd('left')}
      >
        <div className="touch-indicator">◀</div>
      </div>
      <div
        className="touch-right"
        onTouchStart={handleStart('right')}
        onTouchEnd={handleEnd('right')}
        onTouchCancel={handleEnd('right')}
        onMouseDown={handleStart('right')}
        onMouseUp={handleEnd('right')}
        onMouseLeave={handleEnd('right')}
      >
        <div className="touch-indicator">▶</div>
      </div>

      {/* 开火按钮 */}
      <div
        className="touch-fire"
        onTouchStart={(e) => { e.preventDefault(); onFireStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); onFireEnd(); }}
        onTouchCancel={(e) => { e.preventDefault(); onFireEnd(); }}
        onMouseDown={(e) => { e.preventDefault(); onFireStart(); }}
        onMouseUp={(e) => { e.preventDefault(); onFireEnd(); }}
        onMouseLeave={(e) => { e.preventDefault(); onFireEnd(); }}
      >
        <div className="touch-fire-icon">🔥</div>
      </div>
    </div>
  );
}

// === 音效开关 ===
function SoundToggle({ onToggle, enabled }) {
  return (
    <button
      className="sound-toggle"
      onClick={onToggle}
      title={enabled ? '关闭音效' : '开启音效'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}

// === 错误边界 ===
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message || 'Unknown error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="overlay">
          <div className="gameover-panel glass-panel">
            <h2 className="gameover-title">渲染异常</h2>
            <p style={{ color: 'rgba(200,220,255,0.8)', fontSize: '14px', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.6 }}>
              界面渲染出现了意外错误。
              <br />
              请刷新页面重新开始游戏。
            </p>
            <p style={{ color: 'rgba(255,100,100,0.7)', fontSize: '12px', textAlign: 'center', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {this.state.error}
            </p>
            <button className="menu-btn primary" onClick={() => window.location.reload()}>
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// === 主App组件 ===
function App() {
  const canvasRef = React.useRef(null);
  const gameRef = React.useRef(null);
  const [gameState, setGameState] = React.useState('menu');
  const [score, setScore] = React.useState(0);
  const [speedMultiplier, setSpeedMultiplier] = React.useState(1);
  const [hasShield, setHasShield] = React.useState(false);
  const [isBoosting, setIsBoosting] = React.useState(false);
  const [fireCooldown, setFireCooldown] = React.useState(1);
  const [combo, setCombo] = React.useState(0);
  const [highScore, setHighScore] = React.useState(0);
  const [difficulty, setDifficulty] = React.useState('normal');
  const [showHelp, setShowHelp] = React.useState(false);
  const [showAchievements, setShowAchievements] = React.useState(false);
  const [showSkins, setShowSkins] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [damageFlash, setDamageFlash] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [stats, setStats] = React.useState({
    score: 0,
    highScore: 0,
    maxCombo: 0,
    gameTime: 0,
    isNewRecord: false
  });
  const [fatalError, setFatalError] = React.useState(null);

  // Boss 状态
  const [bossActive, setBossActive] = React.useState(false);
  const [bossHp, setBossHp] = React.useState(200);
  const [bossMaxHp, setBossMaxHp] = React.useState(200);
  const [bossPhase, setBossPhase] = React.useState(1);
  const [bossIntro, setBossIntro] = React.useState(false); // Boss出场提示
  const [chargeWarn, setChargeWarn] = React.useState(null); // 冲撞预警 {x,y,z}

  // 玩家状态
  const [lives, setLives] = React.useState(3);
  const [maxLives, setMaxLives] = React.useState(3);
  const [deathCause, setDeathCause] = React.useState(null);

  // 拾取浮字（队列）
  const [pickupTexts, setPickupTexts] = React.useState([]);
  const pickupIdRef = React.useRef(0);

  // 成就状态
  const [achievements, setAchievements] = React.useState([]);
  const [achievementCount, setAchievementCount] = React.useState(0);
  const [toastAchievement, setToastAchievement] = React.useState(null);
  const [newAchievementsThisRun, setNewAchievementsThisRun] = React.useState([]);

  // 皮肤状态
  const [selectedSkin, setSelectedSkin] = React.useState('azure');
  const [skinList, setSkinList] = React.useState([]);

  // 初始化游戏
  React.useEffect(() => {
    const canvas = document.getElementById('game-canvas');
    const game = new Game(canvas);
    gameRef.current = game;

    setHighScore(game.getHighScore());

    // 初始化成就
    const achManager = game.getAchievementManager();
    setAchievements(achManager.getAllAchievements());
    setAchievementCount(achManager.getUnlockedCount());
    setSkinList(ShipSkins.SKIN_DEFS);
    setSelectedSkin(game.getSelectedSkin());

    // 设置回调
    game.onStateChange = (state) => {
      setGameState(state);
      if (state === 'gameover') {
        setStats(game.getStats());
        setHighScore(game.getHighScore());
        // 更新成就列表
        setAchievements(achManager.getAllAchievements());
        setAchievementCount(achManager.getUnlockedCount());
        setNewAchievementsThisRun([...achManager.unlockedThisSession]);
      }
      if (state === 'menu') {
        // 回菜单时刷新皮肤解锁状态
        setSkinList([...ShipSkins.SKIN_DEFS]);
        // 同步已解锁皮肤数量
        let unlockedSkinCount = 0;
        ShipSkins.SKIN_DEFS.forEach(s => {
          if (s.unlocked || achManager.isSkinUnlocked(s)) unlockedSkinCount++;
        });
        achManager.updateSkinCount(unlockedSkinCount);
      }
    };
    game.onScoreChange = (s) => setScore(s);
    game.onSpeedChange = (s) => setSpeedMultiplier(s);
    game.onShieldChange = (s) => setHasShield(s);
    game.onBoostChange = (b) => setIsBoosting(b);
    game.onComboChange = (c) => setCombo(c);
    game.onCooldownChange = (r) => setFireCooldown(r);
    game.onCountdown = (v) => setCountdown(v);
    game.onDamage = () => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 300);
    };
    game.onFatalError = (msg) => {
      setFatalError(msg);
      setStats(game.getStats());
    };

    // Boss 回调
    game.onBossAppear = () => {
      setBossActive(true);
      setBossPhase(1);
      setBossIntro(true);
      setTimeout(() => setBossIntro(false), 3500);
    };
    game.onBossHpChange = (hp, maxHp) => {
      setBossHp(hp);
      setBossMaxHp(maxHp);
    };
    game.onBossDefeated = () => {
      setBossActive(false);
    };
    game.onPhaseChange = (phase) => {
      setBossPhase(phase);
    };

    // 生命变化
    game.onLivesChange = (lives, maxL) => {
      setLives(lives);
      setMaxLives(maxL);
    };

    // 冲撞预警
    if (game.bossManager) {
      game.bossManager.onChargeWarn = (info) => {
        setChargeWarn(info);
        setTimeout(() => setChargeWarn(null), 1500);
      };
    }

    // 死亡原因
    game.onGameOverReason = (reason) => {
      setDeathCause(reason);
    };

    // 道具拾取回调
    game.onPowerUpCollected = (info) => {
      const id = ++pickupIdRef.current;
      let text = '';
      let color = '#fff';
      switch (info.type) {
        case 'score':
          text = `+${info.value}`;
          color = '#ffcc00';
          break;
        case 'shield':
          text = '护盾！';
          color = '#00e5ff';
          break;
        case 'boost':
          text = '加速！';
          color = '#ff2fd0';
          break;
        case 'rare':
          text = `稀有！+${info.value}`;
          color = '#ffffff';
          break;
      }
      setPickupTexts(prev => [...prev, { id, text, color }]);
      setTimeout(() => {
        setPickupTexts(prev => prev.filter(p => p.id !== id));
      }, 1200);
    };

    // 成就解锁回调
    game.onAchievementUnlock = (ach) => {
      setToastAchievement({ ...ach, id: ach.id + '_' + Date.now() });
      setAchievements(achManager.getAllAchievements());
      setAchievementCount(achManager.getUnlockedCount());
      // 刷新皮肤解锁状态
      setSkinList([...ShipSkins.SKIN_DEFS]);
      // 同步已解锁皮肤数量到成就系统（收藏大师成就）
      let unlockedSkinCount = 0;
      ShipSkins.SKIN_DEFS.forEach(s => {
        if (s.unlocked || achManager.isSkinUnlocked(s)) unlockedSkinCount++;
      });
      achManager.updateSkinCount(unlockedSkinCount);
    };

    // 启动菜单背景动画
    game.startMenuAnimation();

    return () => {
      game.dispose();
    };
  }, []);

  const handleStart = React.useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.playClick();
    game.setDifficulty(difficulty);
    game.stopMenuAnimation();
    game.startCountdown();
    setBossActive(false);
    setNewAchievementsThisRun([]);
  }, [difficulty]);

  const handlePause = React.useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.playClick();
    game.pause();
  }, []);

  const handleResume = React.useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.playClick();
    game.resume();
  }, []);

  const handleRestart = React.useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.playClick();
    game.setDifficulty(difficulty);
    setFatalError(null);
    setBossActive(false);
    setNewAchievementsThisRun([]);
    game.startCountdown();
  }, [difficulty]);

  const handleMenu = React.useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.playClick();
    setFatalError(null);
    setBossActive(false);
    game.returnToMenu();
    game.startMenuAnimation();
    // 刷新成就和皮肤
    const achManager = game.getAchievementManager();
    setAchievements(achManager.getAllAchievements());
    setAchievementCount(achManager.getUnlockedCount());
    setSkinList([...ShipSkins.SKIN_DEFS]);
  }, []);

  const handleShowHelp = React.useCallback(() => {
    gameRef.current?.playClick();
    setShowHelp(true);
  }, []);

  const handleCloseHelp = React.useCallback(() => {
    gameRef.current?.playClick();
    setShowHelp(false);
  }, []);

  const handleShowAchievements = React.useCallback(() => {
    gameRef.current?.playClick();
    const game = gameRef.current;
    if (game) {
      const achManager = game.getAchievementManager();
      setAchievements(achManager.getAllAchievements());
    }
    setShowAchievements(true);
  }, []);

  const handleCloseAchievements = React.useCallback(() => {
    gameRef.current?.playClick();
    setShowAchievements(false);
  }, []);

  const handleShowSkins = React.useCallback(() => {
    gameRef.current?.playClick();
    const game = gameRef.current;
    if (game) {
      setSkinList([...ShipSkins.SKIN_DEFS]);
      setSelectedSkin(game.getSelectedSkin());
    }
    setShowSkins(true);
  }, []);

  const handleCloseSkins = React.useCallback(() => {
    gameRef.current?.playClick();
    setShowSkins(false);
  }, []);

  const handleSelectSkin = React.useCallback((skinId) => {
    const game = gameRef.current;
    if (!game) return;
    game.playClick();
    game.setSelectedSkin(skinId);
    setSelectedSkin(skinId);
  }, []);

  const handleDifficultyChange = React.useCallback((diff) => {
    gameRef.current?.playClick();
    setDifficulty(diff);
  }, []);

  const handleSoundToggle = React.useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.audioManager.resume();
    const enabled = game.toggleSound();
    setSoundEnabled(enabled);
  }, []);

  // 触控
  const handleTouchStart = React.useCallback((dir) => {
    gameRef.current?.setTouchInput(dir, true);
  }, []);

  const handleTouchEnd = React.useCallback((dir) => {
    gameRef.current?.setTouchInput(dir, false);
  }, []);

  const handleFireStart = React.useCallback(() => {
    gameRef.current?.setTouchInput('fire', true);
  }, []);

  const handleFireEnd = React.useCallback(() => {
    gameRef.current?.setTouchInput('fire', false);
  }, []);

  const handleToastEnd = React.useCallback(() => {
    setToastAchievement(null);
  }, []);

  // 鼠标左键开火
  React.useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button === 0 && gameRef.current) {
        const target = e.target;
        if (target.id === 'game-canvas' || target.closest('#game-canvas')) {
          gameRef.current.setMouseInput('left', true);
        }
      }
    };
    const handleMouseUp = (e) => {
      if (e.button === 0 && gameRef.current) {
        gameRef.current.setMouseInput('left', false);
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const achManager = gameRef.current?.getAchievementManager?.();

  return (
    <>
      {gameState === 'menu' && (
        <MainMenu
          onStart={handleStart}
          onShowHelp={handleShowHelp}
          onShowAchievements={handleShowAchievements}
          onShowSkins={handleShowSkins}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          highScore={highScore}
          onSoundToggle={handleSoundToggle}
          soundEnabled={soundEnabled}
          achievementCount={achievementCount}
          achievementTotal={achievements.length || 8}
        />
      )}

      {showHelp && <HelpPanel onClose={handleCloseHelp} />}
      {showAchievements && (
        <AchievementPanel
          achievements={achievements}
          onClose={handleCloseAchievements}
        />
      )}
      {showSkins && (
        <SkinPanel
          skins={skinList}
          selectedSkin={selectedSkin}
          onSelect={handleSelectSkin}
          onClose={handleCloseSkins}
          achievementManager={achManager}
        />
      )}

      {(gameState === 'playing' || gameState === 'paused' || gameState === 'countdown') && (
        <>
          <GameHUD
            score={score}
            speed={speedMultiplier}
            speedMultiplier={speedMultiplier}
            hasShield={hasShield}
            combo={combo}
            onPause={handlePause}
            isBoosting={isBoosting}
            fireCooldown={fireCooldown}
            bossHp={bossHp}
            bossMaxHp={bossMaxHp}
            bossPhase={bossPhase}
            bossActive={bossActive}
            bossIntro={bossIntro}
            chargeWarn={chargeWarn}
            pickupTexts={pickupTexts}
            lives={lives}
            maxLives={maxLives}
          />
          <TouchControls
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onFireStart={handleFireStart}
            onFireEnd={handleFireEnd}
          />
          <Countdown value={countdown} />
          <DamageFlash trigger={damageFlash} />
        </>
      )}

      {gameState === 'paused' && (
        <PausePanel
          onResume={handleResume}
          onRestart={handleRestart}
          onMenu={handleMenu}
        />
      )}

      {gameState === 'gameover' && (
        <GameOverPanel
          stats={stats}
          onRestart={handleRestart}
          onMenu={handleMenu}
          fatalError={fatalError}
          newAchievements={newAchievementsThisRun}
          deathCause={deathCause}
        />
      )}

      {gameState === 'gameover' && (
        <SoundToggle onToggle={handleSoundToggle} enabled={soundEnabled} />
      )}

      {/* 成就解锁 Toast */}
      <AchievementToast
        achievement={toastAchievement}
        onAnimationEnd={handleToastEnd}
      />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
