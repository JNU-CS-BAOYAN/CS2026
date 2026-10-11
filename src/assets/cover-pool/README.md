# 默认封面池

这里存放可用于文章默认封面的本地图片或 SVG。建议使用连续编号，便于入库时指定：

```text
cover-001.svg
cover-002.jpg
cover-003.webp
```

封面池只保存已经确认可以公开使用的图片。文章正式入库时，优先将选中的图片复制到对应文章目录，并在 `index.md` 的 YAML 中明确指定：

```yaml
cover: "./cover.jpg"
```

没有指定封面时，网站继续使用统一默认封面。不要在文章中直接引用外部每日图片链接。

## “最前面的话”封面

如果要给首页顶部的“最前面的话”指定封面，把文件放在：

```text
src/content/pages/foreword-cover.jpg
```

然后在 `src/content/pages/foreword.md` 的 YAML 头中增加：

```yaml
image: "./foreword-cover.jpg"
```

没有指定时，首页继续使用项目插图作为默认图。
