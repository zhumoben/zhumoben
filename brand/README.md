# 朱墨本 · 标识

极简单色标识：**一页纸，夹着一枚书签**。

- `zhumoben-mark.svg` — 主标识，一条闭合轮廓（单 path，无洞），`currentColor`
- `zhumoben-mark-small.svg` — ≤24px 用的光学尺寸版（书签槽加宽）
- `zhumoben-favicon.svg` — 圆角墨底 + 纸色页面，随系统深浅色反转
- `zhumoben-mark-512.png` / `-1024.png` — 透明底位图（页）
- `zhumoben-mark-512-inverse.png` / `-1024-inverse.png` — 透明底位图（纸，用于暗底）
- `zhumoben-favicon-512.png` — 应用图标位图
- `preview.png` — 品牌预览页（尺寸、底色、顶栏实况、构成、备选）
- `build_assets.py` / `geom.py` — 生成脚本（SVG 与 PNG 出自同一份几何定义）

## 构成

| 部件 | 数值 |
| --- | --- |
| 页 | 13.2 × 19，位于 (9.4, 6.4)，圆角 1.5 |
| 书签槽 | 宽 4.8，直接在页顶上开口，槽底 13.3，V 尖 15.8 |
| 色彩 | 单一颜色；`currentColor` |

> 缺口是**轮廓的一部分**，不是叠在页上的一个「洞」。之前用 even-odd 洞的写法时，洞顶比页顶高出 0.6 格，那一小条只被计入一次、于是被填成一根横杠——26px 下反锯齿把它抹成一条清楚的线。现在整枚标识是一条闭合轮廓，不存在这种「单次计入」的碎块。

## 用法

```html
<!-- 直接用文件：颜色由父级 color 决定 -->
<img src="zhumoben-mark.svg" alt="朱墨本" width="32" height="32" />
```

```tsx
// 或者内联，省一次请求（应用里就是这样用的，26px 盒子）
<svg className="brand__mark" viewBox="5 4.6 22 22" width={26} height={26} aria-hidden="true">
  <path d="..." fill="currentColor" fillRule="evenodd" />
</svg>
```

> `viewBox` 已收紧到画形外沿（22 格见方），所以放进 26px 盒子里，页高约 23px，不会像 32 格那样四周空一圈。

规则：

1. **一色到底**。不要描边、渐变、投影，也不要把书签槽填成第二个颜色。
2. **墨色优先**。界面里标识用 `--ink`（#15181c）；朱（#b0403a）是评分与当前项专用，标识不抢它。
3. **暗底用纸色**（#f2f3f5）反白，不要用灰或降低不透明度。
4. **≤24px 换 `-small`**：书签槽加宽，避免缩小时糊成一条缝。
5. **留白**：四周至少留出页宽的 1/4；不要与其他图形叠放、不要加圆角容器底板（favicon 除外）。

## 重新生成

```powershell
python brand/build_assets.py
```

改几何只需动 `build_assets.py` 顶部的 `PAGE` / `SLOT` / `MARK_D`；SVG 与 PNG 会一起更新。
