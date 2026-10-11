# 默认封面池

这里存放可用于文章默认封面的本地图片。建议使用连续编号，便于入库时指定：

```text
cover-001.jpg
cover-002.png
cover-003.webp
```

新增图片应记录原始来源、摄影署名和网站使用范围。当前图片的来源记录见下方，不能把下载来源等同于使用许可。文章正式入库时，优先将选中的图片复制到对应文章目录，并在 `index.md` 的 YAML 中明确指定：

```yaml
cover: "./cover.jpg"
```

没有指定封面时，`src/lib/cover-pool.ts` 按文章 ID 从图片池中稳定分配，刷新页面不会重新随机。扩充图片池后，未明确指定封面的文章可能重新分配；已复制到个人目录并填写 `cover` 的文章不受影响。不要在文章中直接引用外部每日图片链接。

当前图片池在 `src/lib/cover-pool.ts` 中逐张导入；添加、删除或改名后，需要同步该文件的 import 和 `coverPool` 数组，仅把图片放入此目录不会自动加入分配。

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

## 来源记录

2026-10-12，维护者确认 `cover-001.jpg` 至 `cover-015.jpg`，以及 `src/content/pages/foreword-cover.jpg` 均来自必应每日一图。原始页面/下载链接和原文件名未保留，日期和摄影署名未记录；这 16 个 JPEG 文件均未保留 EXIF/XMP/IPTC 元数据，不能从文件中恢复署名。`eternity-yt/cover.jpg` 是 `cover-014.jpg` 的同字节副本。

此记录确认下载来源，尚未确认逐图的公开网站复用范围。[微软服务协议的 Bing and MSN 条款](https://www.microsoft.com/en-us/servicesagreement)限定相关素材的个人非商业使用，其他用途须有相应授权或法律依据；每日一图可下载不代表自动获得网站复用许可。维护者决定暂不继续追溯并保留现图；原图署名与使用范围仍未核实，不自行填写摄影者或许可名称，今后获得来源再补。
