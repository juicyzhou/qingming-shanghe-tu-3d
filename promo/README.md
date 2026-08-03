# 宣传素材

## 已生成

| 素材 | 用途 | 规格 |
|---|---|---|
| `poster-vertical.png` | 小红书/朋友圈竖版封面 | 1080×1440（3:4） |
| `poster-horizontal.png` | 公众号推文头图 | 1920×1080（16:9） |
| `scene-aerial.png` / `scene-street.png` | 高清原图（可裁切复用于视频封面/多平台） | 1600×900 |
| `og-cover.jpg` | 微信/QQ 链接分享缩略图（已在 `public/`，随构建发布） | 1200×630 |
| `tech-article.md` | 知乎技术文（程序化生成《清明上河图》） | Markdown |

## 短视频（小红书竖版 30s）

当前环境未安装 ffmpeg，无法直接输出 mp4。已备好**帧序列捕获脚本**，
运行后即可用任意工具编码：

```bash
# 1. 先本地起游戏静态服务
npm run build && npx vite preview --port 4173
#    （或把 dist 放到任意静态服务器）

# 2. 修改 capture-cinematic.mjs 顶部 URL 为你的服务地址，然后：
node promo/capture-cinematic.mjs ./promo/frames 450 15 720 1280   # 30s @15fps 竖版

# 3. 安装 ffmpeg 后编码（小红书竖版）
ffmpeg -framerate 15 -i ./promo/frames/f_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 promo/qingming-30s.mp4
```

相机飞行路径在 `capture-cinematic.mjs` 的 `WAYPOINTS` 里，可按需调整
（高空全景 → 桥上横越汴河 → 主街穿行 → 集市 → 城门 → 拉远）。

## 发布建议

- **小红书**：竖版视频/海报 + 文案：走进会动的《清明上河图》· 纯程序化 3D · 零安装打开即玩。
- **公众号**：横版海报头图 + 技术文链接。
- **知乎**：发布 `tech-article.md`，配 `og-cover.jpg` 或横版海报。
- **微信链接分享**：`og-cover.jpg` + `og:title/description` 已配好，分享即显示缩略图。
