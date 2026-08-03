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
| `?qa=1` | 综合 QA |
| `?debug=1` | 显示"射线"按钮，检测屏幕中心命中物体 |
| `?touch=1` | 强制触屏模式 ｜ `?simple=1` 关描边 ｜ `?nocomposer=1` 绕过后处理 |
