# 贡献者维护

仓库贡献者由 GitHub API 自动汇总，手动补充只需编辑同目录的 `contributors.json`。手动名单保持文件顺序，自动发现且尚未列出的账号按用户名排序追加到末尾；按 GitHub 用户名去重（忽略大小写），手动昵称优先。

自动来源为当前网站 `JNU-CS-BAOYAN/CS2026` 与原内容仓库 `kleinblue4/JNU-CS-BAOYAN`，配置集中在 `src/lib/contributor-data.mjs` 的 `repositorySources`。不包含旧 Hugo 网站仓库。只收录 API 可关联的个人 GitHub 账号，跳过机器人和无法关联账号的匿名提交者；邮箱投稿、资料提供者等未出现在 API 中的贡献者，可在手动名单中补充。

在数组内追加一项（与前一项之间加逗号）：

```json
{ "github": "new-user" }
```

只填 GitHub 用户名，不填整条主页链接。头像、链接、署名和图片失败时的首字母自动生成；修改 GitHub 头像后，网站继续使用该账号的头像。

自定义显示昵称：

```json
{ "name": "小江", "github": "new-user" }
```

没有 GitHub 账号：

```json
{ "name": "小江" }
```

无账号时显示昵称首字母，不生成主页链接。不用的字段请省略，不要填空字符串。GitHub 用户名重复（忽略大小写）、错误字段或 JSON 格式会让检查/构建报错。

保存后本地刷新预览；如果旧预览未更新，重新运行 `./start-preview.sh`。发布时提交该文件，合并/推送后由 CI 构建上线。无需修改 Markdown/头像 HTML，也不用增加文章 YAML 字段。

`foreword.md` 的 `<!-- CONTRIBUTORS -->` 标记控制名单位置，请保留。介绍和感谢文字仍在 Markdown 中编辑。自动与手动名单都会加入启航絮语的搜索索引。

## 自动刷新与离线回退

- `npm run build` 会先执行 `npm run sync:contributors`，读取两个仓库的全部贡献者分页，再生成静态页面；访客无需请求 API。
- main 推送、手动运行部署工作流及每日北京时间 10:17（UTC 02:17）的定时任务都会触发构建部署。GitHub API 的贡献者信息可能缓存数小时，定时任务也可能延迟，不保证即时更新。
- 本地 `npm run dev` 不联网同步。需要更新自动名单时运行 `npm run sync:contributors`，然后重启预览。
- `.cache/contributors.json` 保存上次成功数据，不进入 Git；部署工作流通过 Actions cache 在后续运行间保留它。
- `contributors.snapshot.json` 是随仓库保存的初始备用名单，不用日常编辑；首次克隆或缓存不可用时使用它。维护者需要更新备用名单时，可在确认两个仓库都同步成功后将 `.cache/contributors.json` 复制到此文件，并随代码提交。
- 某个仓库超时、限流、返回错误或分页不完整时，只沿用该仓库的旧数据，另一个仓库仍可正常更新；手动名单始终保留。缓存损坏时回退至仓库内备用名单。
- 部署工作流使用自带的只读 `github.token` 访问公开 API，无需配置个人 Token 或 SSH 私钥。本地无需 Token；如需提高 API 请求额度，可通过环境变量 `CONTRIBUTORS_TOKEN` 提供，切勿写进 JSON 或前端代码。

初始快照于 2026-10-16 读取，当前仓库 3 人、原内容仓库 19 人。网站合并名单会去重，不将提交数量当作展示排名。
