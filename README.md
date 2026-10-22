# Tt-study 英语学习工具

正式入口是 `outputs/wordbloom.html`。直接双击打开即可；核心代码、14,484 个内置词条和 55 篇原有文章均打包在单文件中，基础学习无需联网。

## 功能

- 每日默认 50 个未学词，每组 5 个；忘词进入下一组，例句展开后自动加入错题本。
- 错题本手动或批量添加、六轮间隔复习、三个自动状态灯。
- 今日错词与自由添加两种语境生成方式，保存例句与短文历史。
- 每日时报按日期排序，支持删除、Guardian 更新、正文导入、文章笔记和词汇标注。
- 可拖动的全站 AI 助教，支持任意选段、自由提问和按文章保存对话。
- 英语日记、AI 批改和生词收录；自定义词库的 TXT、CSV、JSON 导入、查询与背诵。
- 多个 OpenAI 兼容文本服务、独立视觉模型、连接测试及不包含 Key 的学习备份。

## 使用与数据

在原浏览器、原文件路径打开正式入口，首次运行自动兼容旧版 `wb_*` 学习记录，写入 `wb_learning_v2`，旧记录保留。旧日期缺失时不编造学习历史；旧无日期每日快照保存在迁移存档中。新的每日计划默认 50 个，可在设置调整。完整说明见 [迁移说明](docs/MIGRATION.md)。

API Key 保存在独立的 `wb_keys_v2`，默认当前会话有效，主动选择记住后才持久保存。旧版自填 Key 会转入会话配置；旧源码自带的共享 Key 不再启用，请填写自己的 Key。普通学习备份不包含 Key。

`outputs/tt-study-apple-motion/index.html` 仍是隔离预览，使用 `tt_preview_*` 存储，不把预览练习自动合入正式记录。复制文件或换浏览器不会自动搬移浏览器数据，请先在设置导出备份。

## 开发与验证

模块源码位于 `outputs/tt-study-apple-motion/`，正式入口由下列命令生成：

```powershell
node scripts/build-source.cjs
node outputs/tt-study-apple-motion/core.test.cjs
node outputs/tt-study-apple-motion/ai-client.test.cjs
node outputs/tt-study-apple-motion/migration.test.cjs
node outputs/tt-study-apple-motion/extras.test.cjs
node scripts/source.test.cjs
node outputs/tt-study-apple-motion/browser.test.cjs
node outputs/tt-study-apple-motion/revision.test.cjs
node outputs/tt-study-apple-motion/floating.test.cjs
```

单元测试使用 Node.js。浏览器测试需要 Chrome 和 Playwright，可用 `PLAYWRIGHT_MODULE` 指定安装位置；测试只用隔离数据和模拟 API。

正式入口不依赖 React/Babel CDN。PDF 导入首次需要加载固定版本 PDF.js；AI、在线词典与新闻更新需要网络及服务支持跨域。真实 API 账号可用性、PDF/OCR 质量和手机真机触控尚未验收。

本仓库保存本次迁移后的干净源码快照；含旧凭据的本地历史及迁移前备份未上传。不包含桌面打包、网站部署或个人学习数据。
