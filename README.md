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
npm run check:content
npm run check
npm test
npm run build
npm run check:links
npm run preview
```

- `check:content`：检查目录名/英文署名、年份、元数据、封面及旧跳转地址冲突；仅固定的历史文章豁免新署名规则。
- `check`：运行 Astro 类型和内容集合检查。
- `test`：运行内容校验、历史链接和 Git 收录时间的回归测试。
- `build`：生成静态站点。
- `check:links`：构建完成后检查站内页面、锚点、图片、脚本、样式及附件路径；不联网检查外部链接。
- `preview`：预览构建产物。

## 内容结构

新投稿放在 `src/content/experiences/<申请年份>/<author>/index.md`，文件夹名与英文昵称 `author` 完全相同。同一目录可放封面、正文图片和经过审核的附件。发布时可使用以下文件头：

```yaml
---
title: "文章标题"
author: "xiaojiang"
applicationYear: 2026
# 可选：按实际经历填写，空缺时不显示
undergraduateMajor: "人工智能"
institutions:
  - "北京航空航天大学"
  - "东南大学"
---
```

投稿统一使用 Markdown 模板，必填 YAML 为标题、署名和申请年份；选填字段已在模板中注释，按需要启用。`undergraduateMajor` 为本科专业，`institutions` 为符合下方收录范围的涉及院校列表，两者用于卡片显示和搜索，不作为一级栏目。院校填写并展示完整名称，常见简称仅用于搜索匹配，在 `src/lib/institutions.ts` 维护。不要从申请方向、比赛名称或排名推断本科专业。

新投稿的 `author` 仅使用大小写英文字母、数字或连字符，可使用 GitHub 用户名；匿名投稿也可自选英文昵称。目录名直接复制 `author`，大小写也必须一致；同一年内不能重名，也不能仅靠大小写区分昵称。历史文章维持原署名与地址，不按新规则改名。

收录时间由构建程序自动读取 Git 历史，取文章首次进入 `main` 的提交时间（合并提交使用合并时间，重命名会追溯原文件）。首页“最新收录”及 RSS 按收录时间倒序排列；经验列表先按申请年份，再按收录时间排序。同一时间按年份与稳定 ID 排序，普通修订不重新置顶。不在 YAML 中维护发布时间、收录时间或更新时间；原文出处用 `sourceUrl` 记录。

CI 使用 `fetch-depth: 0` 拉取完整历史。浅克隆需要先运行 `git fetch --unshallow`；没有 Git 历史或尚未进入主分支的本地稿件仍可预览，日期不显示，在“最新收录”中排在末尾。保留仓库 Git 历史进行迁移即可保持原有收录时间。

### 文章元数据字段

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题，不允许为空 |
| `author` | 是 | 新稿使用英文昵称，与文件夹名完全相同；匿名也可自选昵称 |
| `applicationYear` | 是 | 保研申请年份 |
| `undergraduateMajor` | 否 | 本科专业，用于卡片显示和搜索 |
| `institutions` | 否 | 涉及院校的完整名称列表，用于卡片药丸标签和搜索 |
| `cover` | 否 | 封面路径；省略时使用图片池 |
| `sourceUrl` | 否 | 原始出处的完整 URL，目前用于记录来源 |
| `finalDestination` | 否 | 最终去向，在文章页显示 |

本科院校固定为江南大学，不另设字段。`institutions` 只收录申请表或单独院校章节涉及的院校，包含未入营、放弃和未参加的情况，不等于最终去向；仅在问答、补充、多校投递回顾或一般建议中提到的不加入标签。同校不同学院合并，原文明确的校区/研究院保留区别，不推测未注明的院所。封面替代文字由文章标题自动生成；无需摘要或草稿字段，投稿经审核并合并到 `main` 后发布。

网站的介绍与说明文案统一位于 `src/content/pages/`：

| 页面 | 编辑文件 |
| --- | --- |
| 首页主标题和介绍 | `home.md` |
| 启航絮语 | `foreword.md` |
| 投稿流程与须知 | `submit.md` |
| Markdown、元数据与文件结构指南 | `markdown-guide.md` |
| 保研流程 | `guide.md` |
| 资料与工具 | `resources.md` |
| 关于 | `about.md` |

页面 YAML 的 `title` 为页面名称，`heading` 可覆盖页面上的主标题，`intro` 是页首引导文字，`description` 为页面描述；正文使用 Markdown。`home.md` 的正文是首页介绍。“启航絮语”的栏目名自动读取 `foreword.md` 的标题。

启航絮语的贡献者名单单独维护在 `src/data/contributors.json`，添加 GitHub 用户名即可自动生成头像和主页链接，也支持只填昵称。具体格式见 [贡献者维护说明](src/data/README.md)；`foreword.md` 中的 `<!-- CONTRIBUTORS -->` 控制展示位置。

Astro 负责布局、经验列表、分页、目录、搜索和交互。投稿页 `/submit/` 只维护准备稿件、PR/邮箱渠道、投稿须知和审核发布流程；技术说明独立在 `/submit/markdown/`，正文由 `markdown-guide.md` 维护，不加入顶部导航。投稿下载控件在 `src/components/SubmissionTools.astro`，两页共用同一份模板，完整预览/复制仅在指南页显示；组件也负责邮箱复制及失败回退，邮箱地址仍在 `submit.md` 中维护。搜索、404 等功能提示仍由对应组件或页面维护。

“启航絮语”以首页横向卡片展示，点击进入独立文章页；经验列表和年份列表均提供页码导航。投稿正文模板（与网站的投稿说明不同）位于：

- `public/templates/submission-template.md`

资料与工具统一维护在 `src/content/pages/resources.md`，不按年份拆分；有时效性的资料在条目中注明适用年份。独立资料文件可放在 `public/resources/`，文章附件仍与文章放在同一目录。旧 `/resources/2025/` 地址跳转到统一资料页。

## 投稿

- 邮箱：可参考 Markdown 模板撰写 `index.md`，与封面和正文插图放在同一文件夹，打包发送至 `eeecank@163.com`；YAML 有疑问可请维护者协助。
- PR：Fork 本仓库，当前新稿提交到 `src/content/experiences/2026/<author>/`，将整个文件夹提交到 `main` 的 PR；申请年份须为 2026，文件夹名与英文昵称 `author` 完全相同。历史年份补稿放在对应年份目录。完整指南见 [投稿页面](https://jnu-cs-baoyan.github.io/CS2026/submit/)。

```text
src/content/experiences/2026/xiaojiang/
├── index.md
├── cover.jpg
└── interview.png
```

`cover` 可选，通过 YAML 的 `cover: "./cover.jpg"` 指定，供卡片和文章页顶部使用。正文插图通过 `![图片说明](./interview.png)` 引用；它们不会自动被选为封面。经过审核的附件放在个人文章目录的 `asset/` 或 `assets/` 子目录，文末自动生成附件列表：图片点击查看原图，其他文件下载。当前支持 PNG/JPG/JPEG/WebP/GIF、PDF、DOCX、MD、TXT 和 ZIP，不需要额外 YAML 字段；根目录的封面和正文插图不加入附件列表。实现位于 `src/lib/article-attachments.ts` 和 `src/components/ArticleAttachments.astro`。

新投稿默认一人一篇完整经验，夏令营与预推免经历放在同一篇文章内。投稿由维护者审核，PR 合并后自动构建部署；提交 PR 和 Approve 本身不会发布网站。

模板仅供参考，不要求完全照搬；正文标题、章节、表格和顺序可按经历调整。模板提供个人背景表、夏令营和预推免院校汇总表及下方详细经历，不再添加表格到正文的跳转列。入营/入面可用 ✅ / ❌（或 `&#x2705;` / `&#x274c;`），结果按实际情况填写。不需要手写目录，文章页自动生成目录。YAML 的 `title`、`author`、`applicationYear` 必填，署名/年份与目录一致；其他字段选填。HTML 填写提示注释可以保留，网页正文与搜索不显示这些注释；未填写的占位内容和不适用的示例需删除。

## 部署

当前项目按 GitHub Pages 项目站点配置：

```text
https://jnu-cs-baoyan.github.io/CS2026/
```

站点地址和仓库子路径集中在 `astro.config.mjs`。

- `.github/workflows/pr-check.yml`：提交或更新目标为 `main` 的 PR 后，自动执行内容结构检查、类型检查、测试、构建和构建链接检查；只读权限，不部署。
- `.github/workflows/deploy.yml`：`main` 更新后执行同样的检查，全部通过后部署 GitHub Pages。

当前采用 GitHub 在线审稿：在 PR 中核对 Markdown/YAML 差异和图片、附件，结合自动检查结果决定是否合并。暂不提供下载网页预览包或独立 PR 预览站；GitHub 展示的 Markdown 不等于 Astro 网页的最终排版，样式或布局修改需要另行预览。

PR 的 Approve 仅表示审核通过，合并到 `main` 才触发发布。PR 检查需要完整历史，并保留独立的 `main` 分支用于收录时间计算，不将尚未合并的文章当作已发布。GitHub 对首次 Fork 投稿可能需要维护者批准运行工作流。

检查失败会让工作流失败；如需强制检查通过才允许合并，在 GitHub 分支保护/规则中将 `Content, tests and build` 设为必需检查。这是仓库设置，单独添加工作流不会自动启用。检查不代替内容质量、联系方式和图片来源的人工核对。

## 搜索

顶部搜索覆盖经验贴和七个 Markdown 说明页，包括独立写作指南。经验可按作者、申请年份、专业、院校全称/常见简称及正文查找；多个关键词用空格分隔，标题匹配优先。索引基于正文可见文字，不包含注释、HTML 属性或附件内部内容。

搜索与首页交互分页需要 JavaScript；关闭时提供静态栏目入口，仍可按年份和页码浏览全部经验。索引与说明页地址登记在 `src/pages/search/index.astro`，新增说明页时同步登记；匹配逻辑在 `src/lib/search.ts`，正文提取在 `src/lib/search-index.ts`，现有 Markdown 修改会在下次构建时自动更新索引。

## 审查报告

```bash
npm run review:contacts
npm run review:links
```

报告写入 `reports/contacts.md`、`reports/links.md` 及对应 JSON，目录已被 Git 忽略，不发布到网站。

- 联系方式报告只列文件、行号和疑似类型，不复制具体号码或地址，也不自动删改正文。PR 自动扫描本次新增/修改的经验文章及说明页，报告显示在 Actions Summary 并保留 14 天供下载；本地命令默认扫描全部内容。
- 外链报告每周一北京时间 10:23 在独立的 `External link review` 工作流运行，也可在 Actions 手动触发。请求 HTTP/HTTPS 链接并记录最终地址；404/410、访问受限、超时和网络错误分别展示，不进入 PR 必需检查或部署流程，不自动提交 Issue。

外链可达不代表内容、院校、年份或授权正确；联系方式没有命中也不等于审核完成。历史原有公开联系方式按交接记录保留。源码中注释和 fenced code 示例不做联系方式检测；附件不在本项扫描范围。浏览器加载验证码或登录页的情况仍需人工核对。

## 维护

项目内部的迁移记录、审查结果和待办清单保存在本地 `docs/` 目录，不随 GitHub 仓库发布。投稿模板仍公开在：

- `public/templates/submission-template.md`

`references/` 位于项目目录外，仅用于前期盘点和迁移核对，不会提交到这个 GitHub 仓库。

