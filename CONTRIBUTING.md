# 如何贡献

欢迎完善清单、答疑、申请模板、搜索与页面体验。

1. 新建 Issue 说明具体问题或拟补充内容，或直接提交范围明确的 PR。
2. 知识内容修改放在 `content/` 对应 Markdown 中；保留 frontmatter 字段，新增文件使用唯一 `id` 与正确 `order`。
3. 操作经验与制度要求应分清楚。涉及法律法规、医疗制度的结论，请附官方来源；不要用制度要求推断某家医院现场已如何执行。
4. 不提交患者、家属或其他个人的真实姓名、住院号、私人联系方式、可识别影像、病历或监控原件。描述经验时先匿名化。转运目录可记录机构官方公开的服务电话或微信，必须附公开来源。
5. 运行 `npm run build` 与 `npm test`，确认清单、搜索、FAQ 和打印功能仍可用。
6. 合并到 `main` 会自动发布 GitHub Pages；部署权限仅用于正式分支，来自 Fork 的 PR 不会发布。

贡献知识内容时，你同意按 CC BY 4.0 授权；贡献软件代码时，你同意按 MIT 授权。

## 内容维护

知识内容与页面元数据保存在 `content/` 的 Markdown 文件中，文件顶部的 YAML frontmatter 保存标题、顺序、优先级等字段。

| 路径 | 内容 |
| --- | --- |
| `content/site.md` | 页面标题、简介、原则、章节和导航等元数据 |
| `content/actions/` | 清单动作、优先级、操作与完成判断 |
| `content/faq/` | 问题和答案 |
| `content/templates/` | 书面申请模板 |
| `content/sealing/` | 病历、实物和监控封存字段 |
| `content/references.md` | 官方参考依据 |
| `content/transport.md` | 按省份、城市整理的转运机构、联系方式、服务范围、资质依据、来源发布日期和录入时间 |
| `content/todo.md` | 待完善内容；更新时同步 README 的 TODO List |

转运目录只采纳政府、医疗机构或机构官方公开的资料，以及能追溯消息来源的原创报道。公司资质须有可核对的实际备案或许可依据，不把营业执照认证、广告宣传、拟审批公示当作转运许可。官方发布的医院服务或调度入口应注明该类型及服务边界。保留来源原始发布日期和本次录入日期；未实际致电时不得声称电话已接通、车辆可用。微信须有官方公开的明确账号，不能由手机号推断。

## 本地预览与验证

需要 Node.js 22 以上，推荐 Node.js 24；预览命令需要 Python 3。

```sh
npm ci
npm run build
npm run test:coverage
npm run serve
```

打开 `http://localhost:8768/`。构建产物是 `dist/index.html`，CSS 和 JavaScript 已内联，也可将该 HTML 单独保存后离线打开。根目录 `index.html` 是自动生成的兼容副本，不应直接编辑。

`src/` 保存样式及交互，`scripts/` 负责 Markdown 校验与安全渲染，`tests/` 验证搜索、内容构建与页面交互。

## 自动发布

合并到 `main` 后，GitHub Actions 在构建、测试和依赖安全检查通过后发布到 GitHub Pages。PR 只运行验证，不发布站点；部署使用 GitHub 自动提供的令牌。

首次 Fork 后，在仓库的 Settings → Pages 中选择 **GitHub Actions**，并按需修改 `content/site.md` 的仓库链接。
