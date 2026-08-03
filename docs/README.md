# 《汴京漫游 · 3D 清明上河图》项目文档

> 纯程序化生成的国画风 3D 古风街市小游戏，可直接部署 GitHub Pages。
> 在线体验：https://juicyzhou.github.io/qingming-shanghe-tu-3d/

## 📄 文档导航

| 文档 | 内容 |
|---|---|
| [01-PRODUCT.md](01-PRODUCT.md) | **产品方案设计**：定位/卖点/玩法/任务线/内容规模/艺术风格/发布验收指标 |
| [02-TECHNOLOGY.md](02-TECHNOLOGY.md) | **技术选型与架构**：技术栈/模块结构/渲染管线/性能优化/关键系统/部署/自动化测试 |
| [03-ASSETS.md](03-ASSETS.md) | **资产总结**：程序化贴图/几何/人物/音频清单与规模 |
| [04-CHANGELOG.md](04-CHANGELOG.md) | **迭代记录**：21 个提交分阶段说明 + 经验教训 |
| [05-ROADMAP.md](05-ROADMAP.md) | **优化计划**：P0~P3 优先级路线 + 发布验收清单 |
| [06-微信真机实测清单.md](06-%E5%BE%AE%E4%BF%A1%E7%9C%9F%E6%9C%BA%E5%AE%9E%E6%B5%8B%E6%B8%85%E5%8D%95.md) | **微信内置浏览器真机验收清单**（iOS/Android 12 项逐条勾选） |

## 🚀 快速命令

```bash
npm install       # 安装
npm run dev       # 开发（自动开浏览器）
npm run build     # 生产构建 → dist/
npm run preview   # 本地预览构建产物
```

## 🔍 调试钩子（URL 参数）

| 参数 | 用途 |
|---|---|
| `?autostart=1` | 跳过标题直接进游戏 |
| `?selftest=1` | 任务/方向/对话状态机自测 |
| `?features=1` | 第一批优化自测（指引箭头/引导/暂停/成就卡） |
| `?qa=1` | 综合 QA |
| `?day=1` | 关闭傍晚暖光（恢复正午光照，用于对比） |
| `?cinematic=1` | 保持自由相机持续运行（宣传视频帧捕获用） |
| `?hour=14` | 设定起始时辰 ｜ `?daylen=480` 一日秒数 ｜ `?nocycle=1` 关闭昼夜循环 |
| `?weather=rain/snow/clear` | 强制指定天气（否则 40~90s 随机换天） |

## 宣传素材（`promo/`）

- 小红书竖版海报 `poster-vertical.png`（1080×1440）· 公众号横版海报 `poster-horizontal.png`（1920×1080）
- 知乎技术文 `tech-article.md` · 短视频帧序列脚本 `capture-cinematic.mjs`（详见 `promo/README.md`）
| `?debug=1` | 显示"射线"按钮，检测屏幕中心命中物体 |
| `?touch=1` | 强制触屏模式 ｜ `?simple=1` 关描边 ｜ `?nocomposer=1` 绕过后处理 |
