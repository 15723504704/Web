# 星穹疾驰 · Stellar Dash

一款基于 Three.js + React 的竖版太空射击小游戏。驾驶战机穿越星云，躲避陨石与能量束，击败 Boss，解锁 12 款独特战机皮肤与 30+ 成就。

## 快速开始

### 方式一：直接双击打开（推荐）

直接双击 `index.html`，用 Chrome / Edge / Firefox / Safari 等现代浏览器打开即可游玩。

> 说明：UI 代码已内联至入口页，所有现代浏览器在 `file://` 协议下均可直接运行，无需联网、无需本地服务器。

### 方式二：本地 HTTP 服务器（稳定推荐）

在项目根目录启动任意一个静态服务器即可：

```bash
# Python 3
python3 -m http.server 8080

# Node.js（需安装 http-server）
npx http-server -p 8080
```

然后在浏览器访问 `http://localhost:8080`。

## 操作说明

| 操作 | 按键 |
|------|------|
| 移动 | WASD / 方向键 / 鼠标拖动（触屏：手指拖动） |
| 射击 | 自动开火 |
| 冲刺加速 | 空格 / 屏幕右下角按钮 |
| 暂停 | Esc / P / 暂停按钮 |

## 游戏特性

- **12 款战机皮肤**：每款独特造型、配色与尾焰特效
- **30+ 成就**：速度、躲避、Boss 战、收集等多维度挑战
- **Boss 战**：每 2000 分触发 Boss 战，多种弹幕模式
- **道具系统**：护盾、加速、多重射击、激光
- **星云辉光特效**：Bloom 后处理 + 粒子尾焰
- **本地存档**：最高分、皮肤、成就自动保存到浏览器 localStorage

## 依赖说明

所有运行时依赖均已包含在 `vendor/` 目录中，**无需联网即可运行**。

| 依赖 | 版本 | 路径 | 说明 |
|------|------|------|------|
| Three.js | 0.147.0 | `vendor/three.min.js` | 3D 渲染引擎 |
| EffectComposer 等 | 0.147.0 | `vendor/postprocessing/`, `vendor/shaders/` | Three.js 后处理扩展（辉光特效） |
| React | 18.3.1 | `vendor/react.production.min.js` | UI 框架 |
| ReactDOM | 18.3.1 | `vendor/react-dom.production.min.js` | React DOM 渲染 |
| Babel Standalone | 7.29.0 | `vendor/babel.min.js` | 浏览器内 JSX 转译 |

游戏引擎（`src/game/`）为原生 JavaScript，无构建步骤；UI 层（`src/App.jsx`）使用 JSX，由 Babel 在浏览器内实时转译。

## 目录结构

```
stellar-dash/
├── index.html              # 入口页面
├── README.md               # 本文件
├── src/
│   ├── App.jsx             # React UI 主组件（菜单/HUD/皮肤面板/成就）
│   ├── styles.css          # 全局样式
│   └── game/
│       ├── Game.js             # 游戏主循环与状态管理
│       ├── Player.js           # 玩家战机控制
│       ├── ShipSkins.js        # 12 款战机皮肤模型
│       ├── StarField.js        # 星空背景
│       ├── ObstacleManager.js  # 障碍物生成与管理
│       ├── LaserManager.js     # 玩家激光
│       ├── PowerUpManager.js   # 道具系统
│       ├── BossManager.js      # Boss 战
│       ├── AchievementManager.js  # 成就系统
│       └── AudioManager.js     # 音效系统（WebAudio 合成）
└── vendor/                 # 第三方依赖（本地副本，离线可用）
```

## 浏览器兼容性

支持所有支持 WebGL 2.0 的现代浏览器：
- Chrome 69+
- Edge 79+
- Firefox 63+
- Safari 15+

若浏览器不支持 WebGL，游戏会自动降级显示提示页面。

## 数据存储

游戏数据（最高分、解锁皮肤、成就进度）保存在浏览器 `localStorage` 中，键名前缀为 `stellarDash_`。清除浏览器数据会同时清除游戏进度。

## 许可证

本项目仅供学习与个人娱乐使用。
