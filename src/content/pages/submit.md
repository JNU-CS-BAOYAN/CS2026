---
title: "投稿"
heading: "分享一篇经验"
description: "下载经验贴投稿模板并联系维护者。"
intro: "欢迎写下一篇完整的保研经历。推荐通过 PR 投稿，也可以使用邮箱；投稿由维护者人工审核、整理和发布。"
---

## 通过邮箱投稿

下载上方 Markdown 或 Word 模板并填写正文，将文章、封面和可公开附件一起发送到 [eeecank@163.com](mailto:eeecank@163.com)。请注明申请年份、希望显示的署名、本科专业、正文涉及的院校及附件的公开范围，YAML 文件头可由维护者补充。

## 投稿前请确认

1. 默认一位投稿者提交一篇完整经验贴，夏令营、预推免等经历可以在同一篇文章中分章节叙述。
2. 内容尽量清晰、简洁、有条理，分享亲身经历和对后来者有帮助的建议。
3. 请遵循投稿模板，Markdown 正文使用标准的标题、列表和图片格式，确保内容易读。
4. 可以使用真实姓名、昵称或匿名，不要求提交学号、精确排名或私人联系方式。
5. 封面图片可选；没有图片时由维护者选择统一封面。
6. 图片和附件请说明是否允许公开，未脱敏材料不要发送到公开仓库。
7. 维护者会补充 YAML 元数据、检查链接和图片，再决定是否发布。

## 通过 PR 投稿

1. Fork [项目仓库](https://github.com/JNU-CS-BAOYAN/CS2026)，在自己的仓库中创建分支。
2. 将文章保存为 `src/content/experiences/申请年份/文章ID/index.md`，例如 `src/content/experiences/2026/xiaojiang/index.md`。文章 ID 请使用不重复的英文或数字名称。
3. 将封面和正文图片放在文章的同一文件夹，并在 Markdown 开头补充下面的 YAML。年份应与目录一致；本科专业与院校按实际经历填写，不明确的信息可以省略。有封面时再添加 `cover: "./cover.jpg"`。
4. 提交修改后，向原仓库的 `main` 分支[发起 PR](https://github.com/JNU-CS-BAOYAN/CS2026/compare)，说明文章年份、署名及附件的公开范围。

```yaml
---
title: "我的保研经历"
author: "小江"
applicationYear: 2026
undergraduateMajor: "人工智能"
institutions:
  - "北京航空航天大学"
  - "东南大学"
publishedAt: 2026-10-11
draft: false
---
```

投稿由维护者审核。合并到 main 后，网站会自动检查、构建并部署；提交 PR 或审核通过本身不会发布文章。没有封面时，维护者会从项目图片池中选择一张。

`publishedAt` 是本站首次发布时间，由维护者发布前核对，不是申请年份或原文在其他平台的发表时间。本科专业和涉及院校会展示在卡片中，并用于搜索；院校建议填写完整名称，卡片会对常见院校使用简称。

## 文章元数据

必需字段为 `title`（标题）、`author`（署名，可填写“匿名”）和 `applicationYear`（申请年份）。其余可选字段为 `undergraduateMajor`（本科专业）、`institutions`（涉及院校列表）、`summary`（简介）、`cover`（封面）、`sourceUrl`（原始出处）、`publishedAt`（本站首次发布时间）和 `finalDestination`（最终去向）。

本站专门收录江南大学同学的经历，本科院校无需另填。涉及院校记录申请经历，最终去向记录最后的选择；两者分别填写。本科专业不明确时可以留空，`draft` 和图片替代文字 `coverAlt` 可由维护者处理。

如希望出现在贡献者列表，可一并提供 GitHub 个人主页链接，头像由维护者补充。更正、撤下或其他问题可通过[邮箱](mailto:eeecank@163.com)或 [Issue](https://github.com/JNU-CS-BAOYAN/CS2026/issues) 联系。
