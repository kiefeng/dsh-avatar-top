# dsh-avatar-top

[English](README.md) | 中文

把左栏左下角的「头像 + 账号名」入口（它同时是设置入口）移出底部，放到左栏上部，
让会话列表多出 28–44px 的可滚动高度；**内嵌到品牌行时纵向占用为 0**。
位置、高度、间距都可在**左栏「插件」页**里调。

> 实测版本：DSH 桌面 0.2.2-rc.1 / Windows（macOS 桌面按设计不动；浏览器形态也可用）。

## 设置项（插件页 → dsh-avatar-top → 内嵌表单）

| 设置 | 取值 | 默认 | 作用 |
|---|---|---|---|
| 启用 | 开 / 关 | 开 | 关掉即恢复 DSH 默认布局，不必卸载插件 |
| 位置 | 最顶部 / 品牌行下 / 新会话下 / 内嵌品牌行 | 最顶部 | 账号行插在侧栏哪一行，或叠进品牌行右端 |
| 占用高度 | 完整 44 / 紧凑 32 / 仅头像 28 | 完整 44 | 行高与账号名是否显示（仅头像 = 20px 头像、无文字） |
| 与下方间距 | 0–24（px） | 4 | 账号行与下一块内容的距离 |
| 恢复默认 | 按钮 | — | 清掉四项覆盖，回到组合默认 |

省空间的三条路，按幅度排：

1. **内嵌品牌行**（Windows 桌面）：账号按钮叠到品牌行右端的空白处，`position: absolute`，
   纵向占用 **0px**，只剩一个 28px 的圆形头像；宽带/鼠标悬停展开菜单不变。
2. **仅头像 28**：仍然单独一行，但高度 44 → 28px，并藏起账号名。
3. **紧凑 32**：保留账号名，只压高度。

改动**即时生效**（浏览器半侧订阅设置并重写 `<style>`），不需要重启、不需要保存按钮。
设置在 profile 的 `cordis.patch.yml` 里持久化，跨会话保留。

> 0.3.1：桌面端「下载/更新」按钮（`_indicator`）和账号按钮共用一行。它一出现，
> **内嵌品牌行会临时退回「品牌行下」的 28px 常规行**——绝对定位的那一行没有宽度分给它，
> 否则按钮会被画到头像底下。更新结束后它自己回到角落，状态不用改。

> 0.3.2：修两条只在真机上才看得见的坑。① Windows 标题栏那一条是
> `-webkit-app-region: drag` 的拖拽区（DSH 用 `.frame:before` 铺满整条），
> 内嵌的头像以前落在里面，点击会被当成拖窗口，现在容器和按钮都加了 `no-drag`。
> ② 桌面端把注入表当启动快照，关掉「启用」时旧的 `<style>` 删不掉，开关看起来失灵；
> 现在所有选择器都挂 `:not([data-avatar-top-off])` 门控，浏览器半侧一关属性，整张表立即失效。

## 实现方式

### 一条 boot 注入行（首屏不闪）

Host 半侧向 Web 服务器贡献一条结构化 `style` 行：

```js
ctx.on('webserver/index-inject', (table) => {
  table.push({ kind: 'style', text: cssFor(readOptions(config)) })
})
```

两种壳都会渲染这一行：

| 形态 | 页面从哪来 | 注入怎么到页面 |
|---|---|---|
| 浏览器 / `dsh web` | `dsh-host-frontend-static` 经 HTTP 发 index | `renderIndex()` 把行渲染进 HTML |
| 桌面 App | Electron 主进程持有 `dsh-app://` scheme，直接发 `dsh-web-frontend/dist/index.html` | 主进程在 Host 启动后把行表经 IPC 交给页面，页面侧解释器逐行应用（`style` 行 → `document.head.append`） |

不要用 `ctx.webServer.tapIndex()`：它只在 `WebServer.renderIndex()` 里跑，桌面 App 不走那条路。

### 浏览器半侧的实时样式

桌面 App 的注入表是 Host 启动时的**快照**，所以改设置后靠客户端补一次：浏览器半侧
`ctx.configForms.get('avatar-top')` 订阅设置文档，把生成的 CSS 写进
`<style id="dsh-avatar-top-live">`（排在 boot 行之后，天然覆盖）。停用插件时这个
style 元素随 effect 释放被移除。

关掉「启用」是个例外：boot 行删不掉，写空样式也盖不住它。所以每条规则都挂着
`:not([data-avatar-top-off])`，浏览器半侧按当前设置给 `<html>` 加/去这个属性——**
一份选择器同时管住 boot 行和实时样式**，关掉开关当场恢复默认布局，不用重启。

### 布局规则

侧栏是 flex 列。账号行（`_settingsArea`）在 footer（`_footArea`）里、`_footerActions`
下面（footer 自己是纵向列）；而 `_footerActions` 正是 `dsh-cost-meter` 这类插件挂侧栏小组件的位置。
整块 footer 上移会把它们的显示框一起带走，所以这里把 footer 变成布局透传，只挪账号那一格：

```css
html:not([data-platform='darwin']):not([data-avatar-top-off]) [class*='_root']:not([class*='_collapsed']) > [class*='_footArea'] {
  display: contents;          /* footer 不再产生盒子，两个子项成为列的 flex 项 */
}
… > [class*='_footArea'] > [class*='_settingsArea'] {
  order: -1;                  /* 只挪账号行；_footerActions 保持默认顺序，仍贴底 */
  margin-bottom: 4px;
}
```

- 另两个位置同样只给 `_settingsArea` 排名：`logoRow -4 / settingsArea -3 / newSession -2 / panelList -1`
  （`beforePanels` 则把 `newSession` 与 `settingsArea` 的顺序对调）。
- 「占用高度」只改账号按钮自身：`compact` → `height: 32px`；`icon` → `height: 28px`、
  `_label { display: none }`、`_avatar` 缩到 20px。`_label` / `_avatar` / `_trigger` 是
  settings-account 那半的模块后缀（`AccountMenu` 渲染的按钮、名字、头像圈），不是 ui-sidebar 的。
  按钮选择器是
  `[class*='_trigger']:not([class*='_triggerRow']):not([class*='_triggerLabel'])`——裸的
  `[class*='_trigger']` 会顺带命中 `_triggerRow`（账号按钮、连接指示器、桌面更新胶囊共用的那一行），
  把行宽压成 28px、更新胶囊被画到头像底下（0.3.0 的实际故障）。
- `_triggerRow` 只加 `flex-wrap: wrap`，行放不下时更新胶囊换行，而不是被挤出侧栏。
- 「内嵌品牌行」把账号按钮从列流里摘出去：`position: absolute; top: 8px; right: 12px`，以
  `_root` 为定位上下文（Windows 桌面展开态，折叠开关在原生标题栏里，品牌行右端是空的）。
  按钮固定 28px、只留头像；非 Windows 壳自动退回「最顶部」，不会把按钮叠到别处。
  那条顶部横带是 `titleBarOverlay` 的拖拽区（DSH 用 `[data-windows-titlebar] .frame:before`
  铺满整条并设 `-webkit-app-region: drag`），所以内嵌的那一行和按钮都显式 `no-drag`，
  否则点头像会变成拖窗口。
  一旦 `:has([class*='_indicator'])` 命中（桌面正在下载/待更新），这一行退回
  `position: static; order: -3`，重新排在品牌行下面 28px；胶囊消失后自动回到角落。
- 选择器用 CSS Modules **类名后缀**（`_root` / `_footArea` / `_settingsArea` /
  `_label` / `_avatar` / `_trigger` / `_logoRow` / `_newSession` / `_panelList`），不是每次构建
  都变的哈希前缀。
- 收起态（`_collapsed`）不参与重排：Windows 桌面收起时 footer 本来就 `display:none`，其他平台的
  收起轨道保持 DSH 原样。
- `:not([data-platform='darwin'])` 让 macOS 桌面保留红绿灯顶栏的排布（那里顶部行是拖拽区）。
- Windows 桌面 `data-platform=win32`、普通浏览器没有该属性，都会命中规则。

### 设置从哪来

Host 的 `Config` 用 schemastery 声明四个 `volatile()` 字段。volatile = 用户设置（而不是部署配置），
Host 因此以 loader 行 id `avatar-top` 为命名空间把它暴露给设置文档；浏览器半侧通过
`ctx.configForms` 读写，写入走 `remote.settings.mutate`，落在 profile 的 `cordis.patch.yml`。

`@deepseek-ai/schemastery` 现在声明成真正的 `dependencies`（不是 optional peer）：干净的 profile 里
没人替它装这个包，Host 一 import 就是 `ERR_MODULE_NOT_FOUND`。改成依赖后，`npm`/`pnpm` 会从公共
registry 拉下来（连同 `cosmokit`、`@standard-schema/spec`）。仓库里另外放了一份
`node_modules/`，供 `link:` 安装（pnpm 不为软链包装依赖）时解析。

## 生效时机

- **新装 / 升级后**：必须重启 DSH。客户端 bundle 与包元数据在 Host 启动时快照。
- **改设置**：即时生效，无需重启（包括关掉「启用」——靠 `data-avatar-top-off` 门控）。
- **浏览器形态**：index 每次请求重新收集注入行，刷新页面即最新。

## 安装

包还没发到 npm，先从 GitHub 装：

```sh
dsh plugin add git+https://github.com/kiefeng/dsh-avatar-top
```

装完**重启一次 DSH**（客户端 bundle 与包元数据在 Host 启动时读取），然后打开「插件」页 →
`dsh-avatar-top` 调设置。

`dsh-avatar-top` 这个 npm 名预留好了，发布后 `dsh plugin add dsh-avatar-top` 同样可用。

自检：插件在 `/dsh-avatar-top.css` 暴露当前生效的 CSS（公开、只读），没登录态也能看：

```
http://127.0.0.1:<端口>/dsh-avatar-top.css
```

## 卸载

「插件」页 → 卸载 → 重启 DSH，恢复默认布局。

## 开发 / 自检

```powershell
npm install      # @deepseek-ai/schemastery 是真依赖（Host 半侧 import 它）
node --check lib/index.js
node --check lib/client.js
npm test
```

测试覆盖：schema 默认值与越界拒绝、volatile ref / 普通值两种输入、四种位置 × 三档高度 × 间距的
CSS 矩阵、注入行去重、诊断端点、**`_footerActions` 不被重排的回归断言**（防 cost-meter 之类的
侧栏小组件被一起搬走）、**每条规则都带关闭门控**、**内嵌按钮带 `no-drag`**，以及**两半 CSS
生成器在 120 组组合上逐字节一致**（防止浏览器半侧与 Host 半侧漂移）。

## 已知限制

- 只移动 `_settingsArea`（账号入口）；`sidebar.footer.action` 的占用者（如 `dsh-cost-meter`
  的显示框）保持原位贴底。若某个插件把小组件挂在 `sidebar.settings` 而不用账号入口，它会被
  一起移动——目前官方组合里没有这样的占用者。
- 布局依赖 ui-sidebar 的 flex 列结构；若上游把 footer 改成 absolute 定位或移出该列，规则会变成
  无操作（不报错，也不错位）。
- **macOS 桌面不动**：那里顶栏是红绿灯 + 拖拽区，本插件按设计跳过（`data-platform=darwin`）。
  但在 macOS 的浏览器里用 `dsh web` 时没有这个属性，规则会生效——两种壳行为不一致，按「Windows
  桌面 + 浏览器」理解即可。
- 「内嵌品牌行」只在 Windows 桌面成立（需要 `data-windows-titlebar`）；Web 形态自动退回「最顶部」。
- 诊断端点 `/dsh-avatar-top.css` 是公开只读路由，只回本插件的 CSS 文本，不含用户数据。
