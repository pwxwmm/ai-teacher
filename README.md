# AI 伴读

一个围绕"读完一本书"的桌面学习助手：把书拆成学习单元，AI 带你领读、答疑、出题测验，错题和知识点进入间隔重复队列，按艾宾浩斯/SM-2 曲线提醒你复习。

## 功能

- **书架**：导入 Markdown / TXT / EPUB / PDF（PDF 按标题切章、自动剔除页眉页脚；扫描件需先 OCR），自动切分为 1500–3000 字的学习单元，展示每本书进度
- **领读**：每个单元生成结构化讲解（背景引入 / 重点梳理 / 难点解释）+ 知识点，支持针对当前单元自由提问
- **做题**：AI 按知识点出 3 道单选 + 2 道简答，简答由 AI 判分并点评，自动计算单元掌握度
- **间隔复习**：学完的知识点和错题进入复习队列，间隔按艾宾浩斯基线（1/2/4/7/15/30 天）起步，之后按 SM-2 依据复习成败动态调整
- **今日学习**：打开应用即见"今日复习 + 每本书下一单元"

## 快速开始

环境要求：Node.js + pnpm、Rust stable（MSVC 工具链）、Windows 需 WebView2（Win10/11 一般自带）、Linux 需 webkit2gtk 等系统依赖（[Tauri 官方清单](https://tauri.app/start/prerequisites/)）。

```bash
pnpm install
pnpm tauri dev      # 开发模式（前端热更新）
pnpm tauri build    # 产出可执行文件 + 当前平台安装包（Windows NSIS / macOS DMG / Linux AppImage）
```

首次打开后到 **设置** 页填入 LLM 配置（OpenAI 兼容接口，如 DeepSeek / Kimi / 通义）：`base_url`、`api_key`、`model`，点"测试连接"确认。配置保存在系统应用数据目录的 `config.json`，不会进入本仓库。

**无 Key 体验**：以 `AI_TEACHER_MOCK_LLM=1 pnpm tauri dev` 启动，LLM 走内置 mock，可以完整走通"导入 → 领读 → 做题 → 复习"流程（可用 `fixtures/demo-book.md` 试导）。

## 开发

```bash
cd src-tauri && cargo test   # 48 个离线单测（切分、SM-2、DB、学习闭环）
pnpm build                   # vue-tsc 严格检查 + 前端构建
```

架构与契约约定见 [AGENTS.md](AGENTS.md)。

## 路线图

见 [ROADMAP.md](ROADMAP.md)：迭代 1 打磨日常可用性（流式输出、错题本、统计、打包），迭代 2 深化学习能力（划词解释、论文模式、难度分层出题、错题改编），迭代 3 做数据与扩展（统计图表、导出 Anki、概念图谱、云同步、自动更新）。

详细范围、验收标准与取舍原则见该文件。

## 上架 Apple Store（macOS）

> 本应用面向 **Mac App Store** 发布；Tauri 同一代码也可出 Windows 安装包（NSIS）和 Linux AppImage。

### 需要准备

- **Apple Developer Program** 账号（$99/年），记好你的 **Team ID**
- Xcode 15+（SDK 15+）+ Command Line Tools

### 上架前需要在仓库里替换的占位

| 位置 | 字段 | 标注 |
|------|------|------|
| `src-tauri/tauri.conf.json` | `identifier` | 上架前改成你的域（如 `com.yourteam.aiteacher`）。⚠️ 它是 App Sandbox 容器和应用数据目录的 key，改动会导致老用户数据目录找不到——若已发布过，需要附迁移脚本 |
| `src-tauri/tauri.conf.json` | `bundle.copyright` | 已填真实开发者：`aiteacher` |
| `src-tauri/tauri.conf.json` | `bundle.macOS.signingIdentity` | 开发与分发 `Developer ID Application: 你的名字 (TeamID)`；上架用 `3rd Party Mac Developer Application` |
| `src-tauri/tauri.conf.json` | `bundle.macOS.entitlements` | 你写的 `entitlements.plist`（App Sandbox + 实际用到的权限，如文件读取、外网访问） |
| `src-tauri/tauri.conf.json` | `bundle.macOS.providerShortName` | Team ID（发布前填） |
| `src/views/SettingsView.vue` | 关于卡片的开发者 | 已填真实开发者：`aiteacher` |

### 打包路径

```bash
# 签名发布构建（先配好 signingIdentity）
pnpm tauri build

# DMG 路径：
src-tauri/target/release/bundle/dmg/AI 伴读_<version>_aarch64.dmg

# App Store 上架走的是 .pkg / Product Archive（Tauri v2 打 dmg；上架需要
# xcrun productbuild 调用 3rd Party Mac Developer Application 证书重新打包）*
```

### "上架前自查清单"（App Store 审核重点）

- [ ] 无崩溃：启动 → 导入书 → 领读 → 做题 → 复习，完整链路不停顿
- [ ] 隐私说明已提供（设置页"关于"区）：数据本地保存、LLM 直连
- [ ] 没有跟踪/统计 SDK（本项目没有任何第三方分析代码）
- [ ] NSIS 之外的安装包尺寸不小，DMG 是否正常
- [ ] 应用图标已提供全套（`src-tauri/icons/`32x32 ~ 1024x1024）
- [ ] "AI 伴读" 名称不与其他应用重名（上架前到 App Store Connect 查一下）
- [ ] `bundle.category` = `public.app-category.education`（已配置）
- [ ] `minimumSystemVersion` >= 13.0（已配置）

### 隐私说明（设置页关于区展示文案，已配置）

> 学习数据与个人配置仅保存在本机应用数据目录；LLM 请求直连你配置的接口地址；不经过任何中介服务器；应用不包含任何跟踪或分析代码。
