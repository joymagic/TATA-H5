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

## 腾讯云双环境预览

当前阶段部署 H5 和 Admin 前端预览，尚未接入共享 API 或数据库。H5 客资与抽奖数据保存在访问者浏览器，Admin 使用 mock 数据。

```text
测试 H5:       https://tata-test.cdsparkling.cn/
测试 Admin:    https://tata-admin-test.cdsparkling.cn/
真实 H5:       https://tata.cdsparkling.cn/
真实 Admin:    https://tata-admin.cdsparkling.cn/
```

服务器部署前先安装 Node.js、pnpm、Nginx、rsync 和 Certbot，然后执行：

```bash
sudo bash infra/scripts/deploy-static.sh
```
