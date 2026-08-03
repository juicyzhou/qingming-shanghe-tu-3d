# 《汴京漫游》技术选型与架构

> 版本：v1.0 ｜ 更新：2026-08 ｜ 源码约 4,860 行 JS，29 个模块

## 一、技术栈

| 项 | 选型 | 理由 |
|---|---|---|
| 渲染引擎 | **three.js r170**（npm 引入，Vite 打包） | WebGL、风格化渲染能力强、生态成熟 |
| 构建 | **Vite 6**（`base:'./'`，`assetsInlineLimit` 内联） | 产物近单文件、零外链、易部署 |
| 资源 | **100% 程序化生成**（几何 + Canvas 贴图 + Web Audio 音频） | 满足"零外部资源"，体积小（~620KB） |
| 后处理 | `EffectComposer`（OutlinePass + 自定义暖色/暗角 Pass + OutputPass） | 实现国画手绘风 |
| UI | 原生 DOM/CSS（羊皮纸风格） | 无框架负担，风格可控 |
| 音频 | **Web Audio API** 实时合成 | 五声拨弦 BGM + 音效，零音频文件 |
| 部署 | GitHub Pages + Actions 自动构建 | 静态托管，push 即发布 |

## 二、项目结构

```
qmsht/
├── index.html / package.json / vite.config.js
├── .github/workflows/deploy.yml      # Pages 自动部署
├── docs/                             # 技术文档
├── screenshots/                      # 宣传截图
└── src/
    ├── main.js                       # 入口 + 自动化测试钩子(autostart/selftest/qa/probe)
    ├── core/
    │   ├── Game.js                   # 主循环、场景、相机、灯光、交互、进店逻辑
    │   ├── Input.js                  # 键盘/鼠标/指针锁定（含 tapKey）
    │   ├── TouchControls.js          # 触屏摇杆/视角/按钮（按 touch id 追踪）
    │   ├── Audio.js                  # Web Audio 合成 BGM/音效
    │   ├── rand.js / touch.js        # 确定性随机数、触屏检测
    ├── render/
    │   ├── materials.js              # toon 着色器 + 全部 Canvas 贴图工厂
    │   ├── composer.js               # 后处理链（描边/暖色/输出）
    │   └── shaders.js                # 水面着色器
    ├── world/
    │   ├── layout.js                 # 布局数据 + 碰撞网格 + 地形高度
    │   ├── terrain.js / river.js / bridge.js
    │   ├── buildings.js              # 店铺外型（几何合并）+ 城门/栈桥
    │   ├── interiors.js              # 店内室（墙/家具/掌柜位）
    │   ├── decorations.js            # 树(实例化)/摊位/船/灯笼
    │   ├── merge.js                  # 几何合并器（减少 draw call）
    │   └── World.js                  # 世界装配
    ├── chars/
    │   ├── Character.js              # 参数化木偶角色 + 程序动画
    │   ├── appearance.js             # 外观随机生成器
    │   ├── Player.js                 # 玩家（双视角/碰撞/相机）
    │   └── Npc.js                    # NPC（AI/名牌/任务标记）
    ├── game/
    │   ├── HUD.js                    # 全部 DOM UI + 小地图 + 小玩法
    │   ├── QuestSystem.js / Inventory.js / Dialogue.js
    └── data/
        ├── npcs.js / quests.js / dialogue.js
```

## 三、渲染管线

```
场景 → RenderPass → [OutlinePass 墨线描边(桌面)] → 暖色校色+暗角 Pass → OutputPass(色彩空间)
```

### toon 着色器要点（render/materials.js）
- 3 段量化明暗 `floor(ndl*3+0.55)/3`，暗部保底 `d≥0.15`
- 暖色平行光 + 环境光（共享 uniform，调光一次全局生效）
- 克制边缘光（仅向阳面）+ **柔和高光压缩** `1-exp(-col*1.5)`（防过曝发白）
- **NaN 防护**：法线/视线零长度兜底（修复真实 GPU 上 normalize(0) 产生的垃圾三角形）
- 手动雾效（避免与 three 内置雾系统冲突）
- 室内材质 `uBoost` 环境光增益（避免背光墙发灰）

### 性能优化（已落地）
| 优化 | 效果 |
|---|---|
| 建筑外型按材质**合并几何**（Merger） | 每栋 ~40 → ~8 draw call |
| 树木 **InstancedMesh** | 360 → 4 |
| 摊位/船/灯笼合并 | ~250 → ~50 |
| 角色臂+手、腿+脚同枢轴合并 | 每 NPC 省 ~4 网格 |
| 远处 NPC 距离剔除（任务标记 NPC 恒显） | 广视角可见 NPC 大幅减少 |
| 渲染像素比：桌面 1.5、移动 2.0 | 清晰度与性能平衡 |
| 移动端自动跳过描边、像素比自适应 | 保证流畅 |

**实测**：出生街景可见 draw call 从 ~2588 → **~812**，三角面 ~10.6 万。

## 四、关键系统实现

### 4.1 方向约定（勿随意改动）
```
yaw=0 → 面向 +z；前向 F=(sin yaw, 0, cos yaw)
角色右侧 = F × 上向 = (−cos yaw, 0, sin yaw)
鼠标/触屏右移 → yaw 减小 → 视角右转；第一人称相机 rotation.y = yaw + π
```

### 4.2 进店系统
- 店铺碰撞 = 带门洞的四堵墙 + 家具碰撞（`EXTRA_COLLIDERS`）
- 玩家步行穿过门洞 → `_updateInteriorTransition` 足印检测 → 自动进店（隐藏外型、显示内室、切第一人称）
- 第一人称隐藏玩家自身身体（修复"凭空出现三角平面"=玩家自己的蓝袍挡视线）

### 4.3 输入
- 桌面：WASD + 鼠标（指针锁定）+ E/V/J/F(调试射线)
- 移动：左虚拟摇杆（按 touch id 追踪，防多指误触）+ 右侧拖动视角 + 交谈/视角/任务按钮
- 触屏交互按钮按需显示（有可交互目标才出现）

### 4.4 自动化测试（URL 参数）
| 参数 | 作用 |
|---|---|
| `?autostart=1` | 跳过标题直接进游戏 |
| `?selftest=1` | 任务/进店/方向/对话状态机自测，输出报告 |
| `?qa=1` | 综合 QA（店铺进出/落水/可达性/掌柜避让/四方向/灰蓝扫描） |
| `?repro=1` | 进入店铺环视扫描灰蓝伪影 |
| `?nan=1` | 扫描 NaN/退化三角形/坏挂载 |
| `?debug=1` | 显示"射线"按钮，检测屏幕中心命中物体 |
| `?simple=1` | 关闭描边 ｜ `?nocomposer=1` 绕过后处理 ｜ `?touch=1` 强制触屏 |

## 五、部署（GitHub Pages）
- `vite.config.js`：`base:'./'` + 资源内联 → 产物近单文件、零外链
- `.github/workflows/deploy.yml`：checkout@v7 / setup-node@v7 / upload-pages-artifact@v5 / deploy-pages@v5
- push 到 `main` 自动构建部署；本地 `npm run dev` / `npm run build` / `npm run preview`

## 六、已知约束
- 纯程序化资源 → 艺术细节受代码参数限制（非手绘美术）
- swiftshader（无头测试）与真实 GPU 渲染存在差异，部分伪影仅真机出现（已通过 NaN 防护 + 调试射线定位）
- 移动端为保流畅在部分机型关闭描边
