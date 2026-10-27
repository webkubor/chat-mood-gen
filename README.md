# WeChat Chat Gen

> [English](README.en.md) | 中文


<p align="center">
  <a href="https://github.com/webkubor/chat-mood-gen/blob/main/LICENSE"><img src="https://img.shields.io/github/license/webkubor/chat-mood-gen?style=for-the-badge&color=gold" alt="License"></a>
  <a href="https://github.com/webkubor/chat-mood-gen"><img src="https://img.shields.io/github/stars/webkubor/chat-mood-gen?style=for-the-badge&color=coral" alt="Stars"></a>
  <a href="https://github.com/webkubor/chat-mood-gen"><img src="https://img.shields.io/github/languages/top/webkubor/chat-mood-gen?style=for-the-badge&color=333333" alt="语言"></a>
  <a href="https://github.com/webkubor/chat-mood-gen/forks"><img src="https://img.shields.io/github/forks/webkubor/chat-mood-gen?style=for-the-badge&color=8b949e" alt="forks"></a>
  <a href="https://github.com/webkubor/chat-mood-gen"><img src="https://img.shields.io/badge/Vue%203-333333?style=for-the-badge" alt="Vue 3"></a>
</p>

一个用于生成高质感微信 + 小红书种草氛围图的前端应用，支持对话、拉人、列表、朋友圈、小红书五种模式，支持语料库管理与批量导出截图。

**在线体验 → [wechat.webkubor.online](https://wechat.webkubor.online)**（无需注册，打开即用）

## 界面

五种模式共用左侧手机预览 + 右侧配置面板，改完即时出图，右上角「藏宝库」管语料、昵称与头像。

| 对话模式 | 拉人模式 |
|---|---|
| ![对话模式](docs/screenshots/01-chat.png) | ![拉人模式](docs/screenshots/02-invite.png) |
| 群聊气泡、红包、自定义背景与头像 | 邀请入群的系统提示流，人名自动染微信蓝 |

| 列表模式 | 朋友圈 |
|---|---|
| ![列表模式](docs/screenshots/03-list.png) | ![朋友圈](docs/screenshots/04-moments.png) |
| 批量生成会话列表，含未读红点与九宫格群头像 | 动态配图、话题词、地点与评论 |

> 第五个 tab「小红书」从 v1.2.0 起提供，截图见 [`docs/screenshots/06-xhs.png`](docs/screenshots/06-xhs.png)。
> 笔记复刻小红书 feed：3:4 封面 + 标题浮层 + 作者（小红薯徽标）+ `#话题词` 蓝色高亮 + 三栏互动（点赞/收藏/评论）。模式指示色 `#FF2442`，与微信系 `#7A9D8C` 形成视觉区分。

![藏宝库](docs/screenshots/05-treasure.png)

> 藏宝库：语料 / 昵称 / 头像三个库，**数据只存在本机浏览器 IndexedDB，不上传**。

## 功能亮点

- 对话 / 拉人 / 列表 / 朋友圈 / 小红书五模式一键切换
- 自定义群聊标题、成员数、昵称样式与系统提示样式
- 支持更换聊天背景与"我"的头像
- 语料库管理（新增、删除、清空、导入、导出）
- 一键批量生成并导出高清 PNG，支持 3:4 单卡 / 1:3 长图文 / 完整截图三档比例
- 小红书模式可配博主昵称、小红书号、笔记条数、标题词、话题标签、点赞/收藏/评论区间

## 技术栈

- Vue 3 + TypeScript + Vite
- Pinia
- Tailwind CSS
- html-to-image（截图导出）
- JSZip（批量打包 ZIP）

## 本地开发

```bash
pnpm install
pnpm dev
```

如需打包：

```bash
pnpm build
pnpm preview
```

## 部署

托管在 Cloudflare Pages（项目 `wechat-chat-gen`），域名 `wechat.webkubor.online`
走 CF 橙云代理。**没有 Git 自动部署**，推代码不会上线，发布用：

```bash
CLOUDFLARE_ACCOUNT_ID=916ebb1b9f240bf4c8826021dd161692 pnpm deploy
```

`pnpm deploy` 走 wrangler OAuth 流程。若 OAuth 过期（在非交互 shell 里 refresh 走不通），
改用 kyvault 里存的 CF API token，注入为 `CLOUDFLARE_API_TOKEN` 后再 deploy：

```bash
kyvault run --env CLOUDFLARE_API_TOKEN=secret://cloudflare/api-token -- \
  npx --yes wrangler pages deploy dist --project-name=wechat-chat-gen --branch=main
```

账号是 `Webkubor@gmail.com` 那个（`wrangler whoami` 下有两个，不显式指定会卡在选择交互）。

发布后核对线上版本 —— 读 `version.json` 的 commit，不要靠 assets 文件名的 hash 推断
（不同构建环境 hash 会变，代码可能是同一份）：

```bash
curl -s https://wechat.webkubor.online/version.json
```

站点带 PWA Service Worker，老访客要刷新或等 SW 更新才看到新版；自己验的时候先硬刷新。
`public/_redirects` 是 SPA 深链回退（`vue-router` 用 history 模式），别删。

## 使用说明

1. 在右侧面板调整群聊与样式配置。
2. 选择目标模式后调整配置，点击"仅刷新预览"。
3. 点击"一键批量下载成品图"进行多张导出。
4. 语料库入口在右上角"语料库"。

## 语料占位符

拉人模式支持以下占位符：

- `{name}` 邀请人
- `{invited}` 被邀请人
- `{other}` 其他成员

## 目录结构

```
src/
  components/        # 组件（聊天视图、配置面板、设备框、小红书视图/框 等）
  stores/            # Pinia 状态管理（聊天 / 朋友圈 / 小红书 / 头像 / 语料）
  views/             # 页面（生成器、语料库、更新日志）
  config/            # 静态配置（语料预设等）
  composables/       # 组合式函数（useExport、useSound、useUpload）
  types/             # 数据库 schema 类型
  utils/             # IndexedDB 封装、随机头像、消息提示
  assets/            # 静态资源
```

## 数据与隐私

- 语料库、朋友圈会话、小红书会话均保存在浏览器 IndexedDB 中，仅存本地。
- 随机头像默认走项目自托管图床 [`webkubor/free-imgbed`](https://github.com/webkubor/free-imgbed) 的 `person/` 目录（16 张 JPG），不再使用 DiceBear / randomuser.me 等第三方。
- 仍支持上传自定义头像到本地 IndexedDB；上传上限 50 张，至少保留 10 张。
- 云端同步功能保留但默认关闭，如需启用请在环境变量中设置 `VITE_CLOUD_SYNC_ENABLED=true`。
