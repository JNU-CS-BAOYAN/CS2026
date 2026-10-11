# JNU CS BAOYAN

江南大学计算机相关专业保研经验分享站。经验贴按申请年份整理，正文来自投稿者的个人经历，网站使用 Astro 生成静态页面并部署到 GitHub Pages。

## 本地开发

项目需要 Node.js 22.12 或更高版本。

```bash
npm install
npm run dev
```

常用检查命令：

```bash
npm run check
npm run build
npm run preview
```

- `check`：运行 Astro 类型和内容集合检查。
- `build`：生成静态站点。
- `preview`：预览构建产物。

## 内容结构

经验文章放在 `src/content/experiences/<申请年份>/<stable-id>/index.md`，同一目录可放封面、正文图片和经过审核的附件。发布时可使用以下文件头：

```yaml
---
title: "文章标题"
author: "匿名"
applicationYear: 2026
# 可选：按实际经历填写，空缺时不显示
undergraduateMajor: "人工智能"
institutions:
  - "北京航空航天大学"
  - "东南大学"
publishedAt: 2026-10-11
draft: false
---
```

投稿统一使用 Markdown 模板，必填 YAML 为标题、署名和申请年份；选填字段已在模板中注释，按需要启用。`undergraduateMajor` 为本科专业，`institutions` 为实际涉及的申请院校列表，两者用于卡片显示和搜索，不作为一级栏目。院校填写并展示完整名称，常见简称仅用于搜索匹配，在 `src/lib/institutions.ts` 维护。不要从申请方向、比赛名称或排名推断本科专业。

`publishedAt` 表示本站首次发布时间，首页“最新收录”按它倒序排列，不是原文在其他平台的发表日期。原文出处用 `sourceUrl` 记录。历史文章沿用首次进入 Git 的记录回填；缺少本站发布时间的文章排在首页末尾，同一时间按申请年份和稳定 ID 排序。经验列表与年份页仍先按申请年份，再按本站发布时间组织。普通修订不刷新首次发布时间，不再维护 `collectedAt` 和 `updatedAt`。

### 文章元数据字段

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题，不允许为空 |
| `author` | 是 | 作者署名，可以明确填写“匿名” |
| `applicationYear` | 是 | 保研申请年份 |
| `undergraduateMajor` | 否 | 本科专业，用于卡片显示和搜索 |
| `institutions` | 否 | 涉及院校的完整名称列表，用于卡片药丸标签和搜索 |
| `summary` | 否 | 文章简介；卡片显示一行，文章页显示完整内容 |
| `cover` | 否 | 封面路径；省略时使用图片池 |
| `sourceUrl` | 否 | 原始出处的完整 URL，目前用于记录来源 |
| `publishedAt` | 否 | 本站首次发布时间，用于“最新收录”排序，卡片不显示日期 |
| `finalDestination` | 否 | 最终去向，在文章页显示 |

本科院校固定为江南大学，不另设字段。`institutions` 指文章中的申请院校，不等于最终去向。`draft`（默认 false）仅控制是否公开，`coverAlt` 是可选的图片替代文字，这两项保留为维护选项，不要求投稿者填写。

网站的介绍与说明文案统一位于 `src/content/pages/`：

| 页面 | 编辑文件 |
| --- | --- |
| 首页主标题和介绍 | `home.md` |
| 启航絮语 | `foreword.md` |
| 投稿说明与元数据指南 | `submit.md` |
| 保研流程 | `guide.md` |
| 资料与工具 | `resources.md` |
| 关于 | `about.md` |

页面 YAML 的 `title` 为页面名称，`heading` 可覆盖页面上的主标题，`intro` 是页首引导文字，`description` 为页面描述；正文使用 Markdown。`home.md` 的正文是首页介绍。“启航絮语”的栏目名自动读取 `foreword.md` 的标题。

Astro 负责布局、经验列表、分页、目录、搜索和交互。投稿下载/复制控件独立在 `src/components/SubmissionTools.astro`；投稿说明正文中的邮箱在 `submit.md` 中维护。搜索、404 等功能提示仍由对应组件或页面维护。

“启航絮语”以首页横向卡片展示，点击进入独立文章页；经验列表和年份列表均提供页码导航。投稿正文模板（与网站的投稿说明不同）位于：

- `public/templates/submission-template.md`

资料与工具统一维护在 `src/content/pages/resources.md`，不按年份拆分；有时效性的资料在条目中注明适用年份。独立资料文件可放在 `public/resources/`，文章附件仍与文章放在同一目录。旧 `/resources/2025/` 地址跳转到统一资料页。

## 投稿

- 邮箱：按 Markdown 模板填写 `index.md`，与封面和正文插图放在同一文件夹，打包发送至 `eeecank@163.com`；YAML 有疑问可请维护者协助。
- PR：Fork 本仓库，当前新稿提交到 `src/content/experiences/2026/<文章ID>/`，将整个文件夹提交到 `main` 的 PR；申请年份须为 2026。历史年份补稿放在对应年份目录。完整指南见 [投稿页面](https://jnu-cs-baoyan.github.io/CS2026/submit/)。

```text
src/content/experiences/2026/xiaojiang/
├── index.md
├── cover.jpg
└── interview.png
```

`cover` 可选，通过 YAML 的 `cover: "./cover.jpg"` 指定，供卡片和文章页顶部使用。正文插图通过 `![图片说明](./interview.png)` 引用；它们不会自动被选为封面。同目录的普通附件链接不会自动打包，需维护者核对后再发布。

新投稿默认一人一篇完整经验，夏令营与预推免经历放在同一篇文章内。投稿由维护者审核，PR 合并后自动构建部署；提交 PR 和 Approve 本身不会发布网站。

## 部署

当前项目按 GitHub Pages 项目站点配置：

```text
https://jnu-cs-baoyan.github.io/CS2026/
```

站点地址和仓库子路径集中在 `astro.config.mjs`。GitHub Actions 工作流会在 `main` 推送后执行检查、构建和部署。

## 维护

项目内部的迁移记录、审查结果和待办清单保存在本地 `docs/` 目录，不随 GitHub 仓库发布。投稿模板仍公开在：

- `public/templates/submission-template.md`

`references/` 位于项目目录外，仅用于前期盘点和迁移核对，不会提交到这个 GitHub 仓库。

