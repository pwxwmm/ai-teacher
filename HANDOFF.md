# 会话交接文档（2026-10-28，iOS 链路已攻穿）

> 新会话请从头读完本文档再动手。本文档记录当前项目状态、已完成工作、走过的弯路和明确的待办事项。

---

## 一、项目概况

- **项目**：AI 伴读（桌面学习应用：导入书 → AI 领读 → 做题 → SM-2 间隔复习）
- **路径**：`C:\dev\projects/kimicodes/ai-teacher`
- **技术栈**：Tauri v2（Rust 后端）+ Vue 3 + TypeScript + Vite + Pinia + Naive UI，**用 pnpm**
- **机器环境**：macOS 27（Apple Silicon arm64）、Node 22（nvm）、pnpm 11.7、Rust 1.99 + **llvm-tools 组件已装**（iOS 必需）、Xcode 27.1（含 iPhoneOS 27.1 SDK）
- **xcodegen**：已手动装到 `~/.local/bin/xcodegen`（brew 装不了，见「弯路」）

## 二、Git 仓库关系

| remote | 地址 | 权限 |
|--------|------|------|
| `origin` | `pwxwmm/ai-teacher`（fork） | **有写权限**，push/开 PR 都走它 |
| `upstream` | `tobykyzy001/ai-teacher`（原项目） | 只读，用于 `git pull upstream main` 同步 |

- push 时用的 GitHub token 与账号 `pwxwmm` 关联（用户提供）。**注意历史里用户曾明文贴过 token，不要重复引用或写进文档**
- fork 的 `main` 与上游 `main` 已同步；上游 main 曾被 rebase 改写历史过一次（我们用 `git reset --hard origin/main` 对齐过）

## 三、本次重大突破：iOS 链路攻穿（模拟器端到端 ✅）

卡在两周的 iOS 部署问题**根因已定位并修复**，模拟器上 AI 伴读已完整运行（截图验证：今日学习页正常渲染，Rust+SQLite+Vue 全链路通）。

### 根因（不是搜索路径问题！）

Xcode 27 的 swiftc 会把 swift-rs 静态库（libTauri.a、tauri-plugin-dialog 等）里 `@_cdecl` 符号编成**局部符号**（nm 显示小写 `t`），于是链接报 `_run_plugin_command` / `_on_webview_created` / `_register_plugin` / `_log_stdout` / `_init_plugin_dialog` undefined——即使 .a 明明在搜索路径上。swift-rs 靠 rustup llvm-tools 的 `llvm-objcopy` 把符号重新全局化，而本机没装这个组件。

### 修复步骤（已验证）

```bash
rustup component add llvm-tools
# cargo clean -p tauri 清不掉 build 脚本的 OUT_DIR（warning 会被缓存回放），必须按目录删：
rm -rf src-tauri/target/<triple>/<profile>/build/{tauri,tauri-plugin-*}-*/out/swift-rs
cd src-tauri && cargo build --lib --release --target aarch64-apple-ios
# 验证：nm -gU <libTauri.a> | grep _run_plugin_command → 大写 T 即成功
```

### 工程生成（brew 失效的绕行法）

`tauri ios init` 会死卡在 brew 装 libimobiledevice（macOS 27 brew 报 `unknown or unsupported macOS version: :dunno`）。解法：stub 版 `brew`（`list` 回显包名+假版本号、`install/reinstall` 返回 0）和 `pod`（空操作）已入库在 `scripts/ios-init-stubs/`，`PATH="$PWD/scripts/ios-init-stubs:$PATH" pnpm tauri ios init --ci` 一次通过，xcodegen 生成 `src-tauri/gen/apple/ai-teacher.xcodeproj`（gen/ 目录 gitignored 不入库）。

### 运行与经验

```bash
pnpm tauri ios dev "iPhone Duo"   # vite dev + cargo 构建 + simctl 部署启动一条龙
```

- **GUI 启动的 Xcode 没有 nvm/cargo 的 PATH**，Build Rust Code 阶段会找不到 pnpm：已在 `gen/apple/project.yml` 的脚本前补 `export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$HOME/.cargo/bin:$PATH"` 并重跑 xcodegen（注意 node 版本号变要同步；`tauri ios init` 重跑会覆盖该补丁）
- iOS 27.1 simulator runtime 只兼容 **iPhone Duo** 机型（双屏折叠），建不了普通 iPhone 模拟器
- Duo 截图：`xcrun simctl io booted screenshot --display 1 out.png`（默认截 LCD-1 是黑屏，主屏是 display 1）
- 上次手写在 build.rs 里的 `link_swift_bridge_libs_if_ios()` 是误诊产物，**已删除**（tauri 自己的 build 脚本发出的链接指令本来就对）
- `pnpm tauri build`/`cargo test`(91)/dev 均不受影响

## 四、已完成的交付（PR）

### PR #1（已合并）—— logo 改名
- `src/App.vue` 左上角「AI 老师」→「AI 伴读」，已合入上游 main

### PR #2（open）—— PDF 导入稳健性 + GBK 兜底
分支 `feat/pdf-import-robustness`，2 个 commit：catch_unwind 隔离 pdf-extract 崩溃、扫描件提示、页眉页脚剔除、软换行/连字符清理、康熙部首 NFKC 映射、切章规则 + GBK-EUC-H 经 lopdf 兜底、逐字绘制 merge_glyph_runs 合并、页码剔除。**验证**：35 个真实 PDF 中 32 成功导入、3 正确拒绝；`cargo test` **105 passed**（该分支计数）、`pnpm build` 绿

### PR #3（open）—— 端设备自适应
分支 `feat/responsive-mobile-tablet`：三档断点（≤820px 底部 Tab 栏 / 821–1100px 图标侧栏 / >1100px 完整侧栏）；真机体验 iOS 主要依赖此 PR

### PR #4（open）—— Apple HIG 视觉重做
分支 `feat/liquid-glass-visual`：`src/theme.ts` 设计令牌、style.css 重写、Overlay 标题栏、阅读页四主题 + 字号（`ai-teacher:reading-prefs`）、上架准备（productName「AI 伴读」、category=education、README 上架指南）

## 五、关键弯路记录（避免重蹈）

### Liquid Glass 原生方案 → 失败已清理
原生 NSGlassEffectView 尝试两次失败（磨掉正文文字 + objc2 断言崩溃），用户拍板彻底放弃，回退 CSS 设计。**结论：Liquid Glass 不要模拟，Apple 感靠结构+间距+文字层级+导航信号。**

### iOS 误诊弯路（已澄清，勿再走）
- ❌ 手焊 build.rs 加 `rustc-link-search`/`rustc-link-lib` 指 swift-rs 产物目录——tauri 自身已发正确指令，白忙
- ❌ 以为 `cargo clean -p tauri` 会重跑 swift-rs 构建——不清 OUT_DIR，旧 warning 被缓存回放，需按目录手删
- ✅ 正解：llvm-tools + 删 `out/swift-rs` 目录重建（见「三」）

## 六、LLM 配置（用户已配好）

- **供应商**：dsh，base_url `http://10.0.0.1:8000/v1`，model `deepseek-v4-pro`
- **配置文件**：`~/Library/Application Support/com.example.aiteacher/config.json`（不入库；iOS 端沙盒是独立 config，首次跑需在设备上重新设置）

## 七、用户数据位置

`~/Library/Application Support/com.example.aiteacher/`：`ai_teacher.db`、`books/`、`config.json`

## 八、当前分支状态

- `feat/ios-deploy`（当前）：基于 main，iOS 链路文档（ROADMAP/AGENTS）更新；代码零改动（llvm-tools 为机器级配置，gen/apple 为生成物不入库）
- `main` = 上游 main
- 其他工作分支：feat/pdf-import-robustness / feat/responsive-mobile-tablet / feat/liquid-glass-visual（均对应 open PR）

## 九、待办事项（按优先级）

### 1. iOS 真机部署（✅ 已装上，待最终验收）

全链路已打通，release IPA 已装进用户的 iPhone 16 Pro：

- **签名三连坑全趟平**（细节见 AGENTS 已知坑 9）：Xcode 登录免费 Apple ID → GUI 选 Team 生成证书（Team `REDACTED_TEAM_ID`）→ bundle id `com.example.aiteacher` 被苹果拒收（"not available"，太泛被占）→ 改 **`com.aiteacher.dev`**，写进 `src-tauri/tauri.ios.conf.json`（平台专用覆盖文件，桌面 identifier 不动）→ `xcodebuild -allowProvisioningUpdates` 自动建描述文件 → 手机上「VPN与设备管理」信任开发者
- **`tauri ios dev` 每次会按 tauri.conf 重新同步 gen 工程**——手改 pbxproj 无效，教训
- `vite.config.ts` 已支持 `TAURI_DEV_HOST`（真机 dev 从局域网加载必需，官方模板标配）；`src-tauri/Info.ios.plist`（自动 merge，加 NSLocalNetworkUsageDescription）
- **DeepSeek 官方配置已预置进设备容器**（`devicectl copy to --domain-type appDataContainer`）：base_url `https://api.deepseek.com`、model `deepseek-chat`、key 取自用户 Kimi Code 配置
- 日常使用 = `pnpm tauri ios build` 出 `gen/apple/build/arm64/ai-teacher.ipa` → `devicectl install/launch`（内嵌 dist 离线可跑）；`ios dev`（局域网 dev server + 热重载）仅开发迭代用，要求手机开「本地网络」权限
- **剩余**：用户直接点开 App 验收（设置页应显示 DeepSeek 配置、测试连接应通）；如闪退，重连后 `--console` 拉日志；免费证书 7 天有效，到期重跑 build+install；真机 UI 体验建议本地合 PR #3（自适应分支）

### 2. 上架 Mac App Store / DMG 直分发

README「上架 Apple Store」章节占位就绪，用户需要时填：identifier 迁移（`com.example.aiteacher`）、`signingIdentity`、entitlements、providerShortName

### 3. 三个开着的 PR 等 review/合并

#2/#3/#4 在 tobykyzy001/ai-teacher，合并后重新 `pnpm tauri build` 出新 DMG

## 十、注意事项

- **pnpm 11**：依赖安装脚本白名单键名是 `allowBuilds`（已配 `pnpm-workspace.yaml`）
- **cargo**：shell 没 PATH 时先 `export PATH="$HOME/.cargo/bin:$PATH"`
- **vue-tsc 严格**：提交前 `pnpm build` 必须绿；**cargo test**：main 分支 91 个、PR#2 分支 105 个，全绿
- **GitHub token**：用户曾明文发过一次，不要再索要或引用
- **macOS 27**：brew 不可用（见已知坑 8 的 stub 绕法）；Xcode 27 需 llvm-tools（见已知坑 7）
