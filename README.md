# 疑似医疗事故应对 · 行动清单与答疑

供家属在诊疗出现严重异常时参考的开源知识库：推动救治、固定证据、协调转院，并逐项核对落实情况。

- [在线 GitHub Pages](https://zhanweelee.github.io/medical-malpractice-guide/)
- [现有独立域名](https://medical-malpractice.listen.im/)
- 11 项行动清单、13 条答疑、2 份书面申请模板与封存核对字段。
- 全站模糊搜索覆盖清单、折叠答疑正文、模板和参考依据，支持多关键词、常见同义词及少量错字；`⌘ / Ctrl + K` 打开搜索。
- 清单进度只保存在当前浏览器；页面不收集患者信息；可打印或保存为 PDF。

## 修改内容

所有知识内容与页面元数据保存在 `content/` 的 Markdown 文件中，文件顶部的 YAML frontmatter 保存标题、顺序、优先级等字段。

| 路径 | 内容 |
| --- | --- |
| `content/site.md` | 页面标题、简介、原则、章节和导航等元数据 |
| `content/actions/` | 清单动作、优先级、操作与完成判断 |
| `content/faq/` | 问题和答案 |
| `content/templates/` | 可参考的书面申请 |
| `content/sealing/` | 病历、实物和监控封存字段 |
| `content/references.md` | 官方参考依据 |

日常更新只需修改 Markdown 并提交 PR。合并到 `main` 后，GitHub Actions 自动构建、测试并发布到 GitHub Pages。PR 只运行验证，不发布站点；部署无需个人访问令牌。

## 本地运行

需要 Node.js 22 以上，推荐 Node.js 24；预览命令需要 Python 3。

```sh
npm ci
npm run build
npm test
npm run serve
```

打开 `http://localhost:8768/`。构建产物是 `dist/index.html`，CSS 和 JavaScript 已内联，也可将该 HTML 单独保存后离线打开。根目录 `index.html` 同样是自动生成的兼容副本，不应直接编辑。

`src/` 保存样式及交互，`scripts/` 负责 Markdown 校验与安全渲染，`tests/` 验证搜索、内容构建与页面交互。首次 Fork 后在仓库的 Settings → Pages 中选择 **GitHub Actions**，并按需修改 `content/site.md` 的仓库链接。

现有独立域名由 Cloudflare Worker 提供，`wrangler.jsonc` 和 `.assetsignore` 仅供维护该镜像使用；GitHub Actions 的自动发布目标是 GitHub Pages。

## 贡献与许可

欢迎通过 Issue 和 PR 补充现场经验、纠正错误并提供可核对的官方依据。请阅读 [贡献指南](CONTRIBUTING.md)。勿提交患者、家属、医护或其他人的可识别信息。

这是供参考的行动资料。诊疗、转运与具体案件处理应结合实际病情、现场条件和专业意见；不要因为文书争议延误必要救治。

知识内容采用 [CC BY 4.0](LICENSE-CONTENT.md)，代码采用 [MIT](LICENSE)。
