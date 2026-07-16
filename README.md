# TATA木门静音人格测试 H5

移动端 H5 原型实现，当前聚焦完整用户链路：

- Loading
- Home 首页
- 5 道静音人格测试题
- 结果计算 Loading
- 人格结果页
- 客资填写页
- 转盘抽奖页
- 抽奖结果页

正式文案集中在 `packages/shared-config/src/`，页面不重复手写活动文案。

## 本地运行

```bash
pnpm install
pnpm dev
```

## 验证

```bash
pnpm typecheck
pnpm test
pnpm build
```

## GitHub Pages

仓库推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会构建 `apps/h5` 并发布到 GitHub Pages。

预期地址：

```text
https://joymagic.github.io/TATA-H5/
```

需要在 GitHub 仓库 Settings → Pages 中选择 GitHub Actions 作为发布来源。

## 腾讯云 FAT 1.0 测试环境

当前先发布独立 FAT 1.0 测试版，正式代码仓和正式目录不参与本次部署。H5 与 Admin 共用独立 FAT API 和 SQLite 测试数据库，正式数据不参与本次联调。

```text
FAT H5:        https://fat-tata.cdbzzy.cn/
FAT Admin:     https://fat-tata-admin.cdbzzy.cn/
正式 H5（待验收后）：https://tata.cdsparkling.cn/
正式 Admin（待验收后）：https://tata-admin.cdsparkling.cn/
```

FAT 代码快照目录为 `/srv/tata-h5/fat/repo`，FAT 静态目录为 `/srv/tata-h5/fat`，测试数据库为 `/srv/tata-h5/fat/data/tata-fat.sqlite`；正式代码预留在 `/srv/tata-h5/prod/repo`，本次不触碰。

服务器部署前先安装 Node.js、pnpm、Nginx、rsync 和 Certbot，然后执行：

```bash
sudo bash infra/scripts/deploy-fat.sh
```

## tcfzyq.online 测试环境

H5 与 Admin 使用同源 API，并部署到独立目录 `/srv/tata-h5/tcfzyq`：

```text
H5:    https://tcfzyq.online/
Admin: https://admin.tcfzyq.online/
```

本地生成上传包：

```bash
pnpm package:tcfzyq
```

将压缩包上传到服务器并解压后，以 root 执行包内的 `deploy.sh`。脚本会安装运行依赖、配置 Nginx 与 systemd，并在两个域名都解析到目标服务器后申请 HTTPS 证书。

如临时回退到其他服务器，可传入目标 IP；DNS 尚未生效时可先完成 HTTP/API 部署：

```bash
sudo EXPECTED_IP=139.155.151.236 ALLOW_PENDING_DNS=1 ./deploy.sh
```
