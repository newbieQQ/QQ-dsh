# QQ-dsh

个人 DSH 插件全家桶：把四个自有插件打成**一个**可安装的捆绑包，装一次全到齐。

| 组件 | 版本 | 干什么 |
|---|---|---|
| dsh-sansheng-liubu | 0.12.1 | 三省六部工作台：每项目十个独立部门会话、三层记忆、朝堂面板 |
| dsh-brain | 0.5.1 | LongMemory 云端记忆桥：活动上报、memory 工具、Mnemon provider、技能双向同步与管理页 |
| workspace-groups-remote | 1.0.0 | 工作区分组 + 远程 SSH（合并包，含 shell 覆盖） |
| dsh-better-chat | 0.1.0 | 审批卡回车同意 / Esc 拒绝（自动聚焦 + 全局兜底） |

## 安装

```bash
git clone <本仓库> qq-dsh
dsh plugin --profile desktop add qq-dsh
```

完全重启 DSH 生效。行配置（profile 的 bundles 行）可嵌套各组件配置：

```yaml
config:
  dshBrain: { enabled: true, baseUrl: https://<你的 LongMemory 地址>/api/longmemory, clientId: dsh-desktop, skillsSyncEnabled: true }
  workspaceGroupsRemote: { remoteSsh: {} }
```

**从四个独立包迁移**：先在 profile 里移除四个独立 bundle（三省六部含 panel 行），再加 qq-dsh。各组件的数据原地保留——侧车文件、设置命名空间、工作台台账都不动。详见《QQ-dsh Wiki》空间的「安装与迁移」页。

## 文档（Wiki）

详细文档在 Muse 的《QQ-dsh Wiki》空间里：首页、捆绑包构成、安装与迁移、冲突与兼容、自推送、各组件详解、故障排查、版本史。

## 维护

```bash
npm run build     # 从四个源仓库重新 vendoring 并生成 patch/清单
npm run verify    # 20 项捆绑校验（来源、组合、客户端、patch 形状）
npm run self-push # 把本仓库（--components 时连四个组件仓库）同步到 Gitea + GitHub
```

组件出处与版本锁定在 [components.json](components.json)。自推送的凭据只走环境变量，见《QQ-dsh Wiki》的「自推送」页。
