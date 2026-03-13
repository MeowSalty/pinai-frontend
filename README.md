# PinAI Frontend

PinAI 前端项目 - AI 服务供应商管理平台

## 📖 项目简介

PinAI Frontend 是一个基于 Vue 3、TypeScript 与 Vite 的现代化前端应用，用于管理、监控与分析 AI 服务供应商。

项目能够统一维护多家 AI 平台、多个 API Key、模型清单与健康状态，也支持对请求统计、调用趋势和日志进行可视化分析。

## 🖼️ 界面预览

![仪表盘总览](docs/screenshots/dashboard-overview.png)

![平台管理网格视图和批量操作栏](docs/screenshots/provider-grid.png)

![批量导入](docs/screenshots/provider-batch-import.png)

![批量更新模型](docs/screenshots/provider-batch-update.png)

![健康监控](docs/screenshots/health-overview.png)

![日志高级筛选](docs/screenshots/logs-filters.png)

![服务器配置](docs/screenshots/server-config.png)

> 更多截图在 [docs/screenshots](docs/screenshots) 中

## ✨ 功能特性

### 📊 仪表盘

- 核心概览指标：总请求数、活跃模型数、活跃平台数、成功率、平均首字时间、输入/输出/总 Token
- 趋势分析：支持按请求量或 Token 用量查看趋势图
- 排行分析：支持按模型 / 平台、调用量 / Token 用量切换排行视图
- 时间范围筛选：支持 `24h`、`7d`、`30d`
- 手动刷新数据，适合监控实时运行情况

### 🏢 平台管理

- 平台的新增、编辑、删除
- API Key 管理、模型管理、自定义请求头与端点配置
- 平台搜索：支持按平台名称或 URL 快速筛选
- 双视图展示：支持列表视图与网格视图切换
- 资源状态可视化：在平台列表中展示密钥数、模型数及健康进度信息
- 批量操作栏：支持多选平台后进行批量更新模型、批量删除、清空选择

### 📥 批量导入

- 入口已收纳到“添加平台”下拉菜单中
- 支持从文本批量解析供应商信息
- 支持根据平台信息自动拉取模型列表
- 支持导入时自动应用模型重命名规则
- 支持快捷端点配置，根据供应商类型自动生成端点

### 🔄 批量更新模型

- 从平台列表中选择多个平台后统一更新
- 自动获取各平台最新模型列表
- 差异对比展示新增、移除、保留及更新结果
- 提供模型新增 / 移除数量统计
- 支持按密钥维度展示处理结果与进度反馈

### 🏷️ 模型自动重命名

- 插入规则：添加前缀、后缀或指定文本
- 替换规则：进行简单文本替换
- 正则规则：执行复杂匹配与替换
- 大小写规则：统一大小写风格
- 拖拽排序：调整规则执行顺序
- 本地持久化：自动保存规则配置

### ❤️ 健康监控

- 概述页：总览平台、密钥、模型的健康分布与问题列表
- 平台维度：分页查看平台健康状态
- 密钥维度：分页查看 API Key 健康状态
- 模型维度：分页查看模型健康状态
- 问题恢复：支持对异常项执行恢复操作
- 可视化进度条：更直观展示平台、密钥、模型健康状态占比

### 📜 使用日志

- 查看请求日志与统计信息
- 高级筛选面板，支持多条件组合过滤
- 支持按成功状态、流式请求、原生标记、模型、平台、时间范围筛选
- 支持快捷时间范围：今天、最近 7 天、最近 30 天
- 即时筛选与筛选标签回显，便于快速定位目标请求

### ⚙️ 系统与全局能力

- API 服务器配置：支持新增、编辑、删除、切换多个后端服务器
- Bearer Token 认证支持
- 主题切换：亮色 / 暗色 / 跟随系统
- 侧边栏系统状态卡片：显示运行状态与连接情况
- 版本检查：支持检测新版本
- 关于页面：展示项目信息

## 🛠️ 技术栈

### 核心框架

- **Vue** `^3.5.29`
- **TypeScript** `~5.9.3`
- **Vite** `^7.3.1`

### 路由与状态管理

- **vue-router** `^5.0.3`
- **unplugin / vite 路由集成**：通过 [`VueRouter()`](vite.config.ts:16) 生成文件路由
- **Pinia** `^3.0.4`

### UI 与交互

- **Naive UI** `^2.43.2`
- **@vicons/ionicons5** `^0.13.0`
- **@vicons/material** `^0.13.0`
- **vue-draggable-plus** `^0.6.0`

### 数据可视化与工具库

- **ECharts** `^6.0.0`
- **vue-echarts** `^8.0.1`
- **@vueuse/core** `^14.1.0`

### 开发工具

- **ESLint** `^10.0.2`
- **OxLint** `~1.50.0`
- **oxfmt** `^0.35.0`
- **unplugin-auto-import** `^21.0.0`
- **unplugin-vue-components** `^31.0.0`
- **@vitejs/plugin-vue-jsx** `^5.1.4`
- **vite-plugin-vue-devtools** `^8.0.6`

依赖来源可参考 [`package.json`](package.json) 与 [`vite.config.ts`](vite.config.ts)。

## 📁 项目结构

```text
src/
├── components/                  # 可复用组件
│   ├── common/                  # 通用组件
│   ├── dashboard/               # 仪表盘图表与排行组件
│   ├── health/                  # 健康监控组件
│   ├── layout/                  # 页面布局与导航
│   ├── provider/                # 平台管理相关组件
│   └── system/                  # 系统配置组件
├── composables/                 # 组合式函数
│   ├── providerBatchImport/     # 批量导入工作流拆分模块
│   ├── useApiServerCheck.ts
│   ├── useHealthActions.ts
│   ├── useHealthState.ts
│   ├── useProviderActions.ts
│   ├── useProviderBatchUpdate.ts
│   ├── useProviderDisplay.ts
│   ├── useProviderForm.ts
│   ├── useProviderModels.ts
│   ├── useProviderState.ts
│   └── useServerValidation.ts
├── pages/                       # 页面组件（文件路由）
│   ├── index.vue                # 默认跳转到仪表盘
│   ├── dashboard.vue            # 仪表盘
│   ├── health.vue               # 健康监控
│   ├── logs.vue                 # 使用日志
│   ├── provider.vue             # 平台管理入口页
│   ├── server_config.vue        # 服务器配置
│   ├── about.vue                # 关于页面
│   └── provider/
│       ├── index.vue            # 平台列表
│       ├── add.vue              # 新增平台
│       ├── [id].edit.vue        # 编辑平台
│       ├── batch-import.vue     # 批量导入
│       └── batch-update.vue     # 批量更新模型
├── services/                    # API 请求封装
├── stores/                      # Pinia stores
├── types/                       # TypeScript 类型定义
└── utils/                       # 工具函数
```

## 🚀 快速开始

### 环境要求

- **Node.js**：`^20.19.0` 或 `>=22.12.0`
- **包管理器**：`npm`

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认访问地址：`http://localhost:5173`

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

### 类型检查

```bash
npm run type-check
```

### 代码检查与格式化

```bash
# 运行全部检查
npm run lint

# 运行 OxLint
npm run lint:oxlint

# 运行 ESLint
npm run lint:eslint

# 代码格式化（仅 src 目录）
npm run format
```

## ⚙️ 配置说明

### 环境变量

可创建 `.env.development` 或 `.env.production` 文件：

```bash
# API 服务器地址（可选，也可在界面中配置）
VITE_API_BASE_URL=http://localhost:3000/api
```

### API 服务器配置

项目支持在界面中维护多个后端服务器，相关页面见 [`src/pages/server_config.vue`](src/pages/server_config.vue)：

- 新增服务器
- 编辑服务器
- 删除服务器
- 验证服务器连接
- 切换当前激活服务器
- 可选配置 Bearer Token

### 路由说明

首页会在 [`src/pages/index.vue`](src/pages/index.vue) 中自动跳转到 [`/dashboard`](src/pages/index.vue:8)。

主要路由如下：

| 页面文件                                                                     | 路由路径                 | 说明               |
| ---------------------------------------------------------------------------- | ------------------------ | ------------------ |
| `[src/pages/index.vue](src/pages/index.vue)`                                 | `/`                      | 进入后跳转到仪表盘 |
| `[src/pages/dashboard.vue](src/pages/dashboard.vue)`                         | `/dashboard`             | 仪表盘             |
| `[src/pages/provider.vue](src/pages/provider.vue)`                           | `/provider`              | 平台管理入口       |
| `[src/pages/provider/index.vue](src/pages/provider/index.vue)`               | `/provider`              | 平台列表页         |
| `[src/pages/provider/add.vue](src/pages/provider/add.vue)`                   | `/provider/add`          | 新增平台           |
| `[src/pages/provider/[id].edit.vue](src/pages/provider/[id].edit.vue)`       | `/provider/:id/edit`     | 编辑平台           |
| `[src/pages/provider/batch-import.vue](src/pages/provider/batch-import.vue)` | `/provider/batch-import` | 批量导入           |
| `[src/pages/provider/batch-update.vue](src/pages/provider/batch-update.vue)` | `/provider/batch-update` | 批量更新           |
| `[src/pages/health.vue](src/pages/health.vue)`                               | `/health`                | 健康监控           |
| `[src/pages/logs.vue](src/pages/logs.vue)`                                   | `/logs`                  | 使用日志           |
| `[src/pages/server_config.vue](src/pages/server_config.vue)`                 | `/server_config`         | 服务器配置         |
| `[src/pages/about.vue](src/pages/about.vue)`                                 | `/about`                 | 关于页面           |

## 📦 自动化能力

### 自动导入

通过 [`AutoImport()`](vite.config.ts:20) 配置，以下内容可自动导入：

- Vue API
- Naive UI 的 `useDialog`、`useMessage`、`useNotification`、`useLoadingBar`
- Vue Router 自动导入能力

### 组件按需注册

通过 [`Components()`](vite.config.ts:33) 与 [`NaiveUiResolver()`](vite.config.ts:34) 实现 Naive UI 组件按需加载。

### 文件路由

通过 [`VueRouter()`](vite.config.ts:16) 启用文件路由，页面文件位于 `[src/pages/](src/pages/)`。

## 🎨 开发约定

- 统一使用 [`<script setup lang="ts">`](src/pages/dashboard.vue:1)
- 组件文件采用 PascalCase
- 页面文件采用 kebab-case 或约定式文件命名
- 与后端交互统一收敛到 [`src/services/`](src/services/)
- 跨页面共享状态优先放在 [`src/stores/`](src/stores/)

## 🔗 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vite.dev/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Naive UI 文档](https://www.naiveui.com/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [VueUse 文档](https://vueuse.org/)
- [ECharts 文档](https://echarts.apache.org/)

## 📄 许可证

本项目为私有项目，仅供内部使用。
