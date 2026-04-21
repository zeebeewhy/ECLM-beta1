# ECLM 工业级架构决策文档

## 核心原则

1. **不造轮子**：API调用、流式传输、错误处理等通用能力，用成熟库
2. **聚焦核心**：ECLM的教学逻辑（构式网络、学生模型、对比分析、迭代调度）必须自建
3. **前后端分离**：前端纯静态，后端Vercel Edge Function
4. **一次交付**：不再发多个版本和压缩包

---

## 一、技术选型

### 1.1 前端框架

| 组件 | 选型 | 理由 |
|------|------|------|
| **框架** | React + Vite + TypeScript | 已验证可用，轻量 |
| **UI** | Tailwind CSS + shadcn/ui | 已有组件库，风格好 |
| **路由** | React Router v6 | 多页面应用需要 |
| **状态管理** | Zustand | 比Redux轻量，比useContext好维护 |
| **部署** | Vercel Static | 免费、CDN、自动部署 |

### 1.2 后端（API代理）

| 组件 | 选型 | 理由 |
|------|------|------|
| **运行时** | Vercel Edge Function | 免费、低延迟、自动扩展 |
| **路由** | `api/chat.ts` 单文件 | 只需要一个代理端点 |

### 1.3 LLM客户端（借鉴而非自建）

**决策：不引入任何第三方LLM SDK**

调研发现所有SDK（Vercel AI SDK、unified-llm、llm-sdk）都太重，且主要面向流式聊天场景。ECLM只需要**非流式的chat completion**。

**借鉴对象：NextChat的Provider抽象**

NextChat的provider实现是最简洁的参考——每个provider只需定义：
- baseURL
- apiKey header格式
- 请求体格式

我们自己写一个 **<150行的universalClient**，覆盖OpenAI/Kimi/任意兼容API。

---

## 二、架构图

```
┌─────────────────────────────────────────────────────┐
│                     Vercel                          │
│  ┌─────────────────┐    ┌──────────────────────┐   │
│  │  Static Frontend │    │  Edge Function       │   │
│  │  (React + Vite)  │───→│  POST /api/chat      │   │
│  │                  │    │  - CORS处理           │   │
│  │  Pages:          │    │  - 请求转发           │   │
│  │  - Home          │    │  - 错误包装           │   │
│  │  - Free Expression│   │                      │   │
│  │  - Construction   │    │  Headers:            │   │
│  │    Implant        │    │  x-api-key → Authorization│
│  │  - Progress       │    │  x-base-url → target URL  │
│  │                   │    │  x-model → model name     │
│  └─────────────────┘    └──────────┬───────────┘   │
│                                     │               │
│                                     ↓               │
│                            OpenAI / Kimi / Any      │
└─────────────────────────────────────────────────────┘
```

---

## 三、目录结构（工业级规范）

```
eclm-learn/
├── api/
│   └── chat.ts                 # Vercel Edge Function代理
├── vercel.json                 # Vercel配置（路由重写、CORS）
├── src/
│   ├── main.tsx               # 入口
│   ├── App.tsx                # 路由定义
│   ├── index.css              # 全局样式
│   │
│   ├── types/
│   │   └── index.ts           # ECLM类型定义
│   │
│   ├── engine/                # ECLM核心引擎（必须自建）
│   │   ├── llm.ts            # Universal LLM客户端（<150行）
│   │   ├── analysis.ts       # 对比分析逻辑
│   │   ├── scheduler.ts      # 变体迭代调度器
│   │   └── affect.ts        # 情感状态推断
│   │
│   ├── data/
│   │   ├── constructions.ts  # 构式网络定义
│   │   └── materials.ts      # 学习素材库
│   │
│   ├── store/
│   │   └── student.ts        # Zustand学生状态管理
│   │
│   ├── components/           # 页面组件
│   │   ├── Layout.tsx        # 布局壳
│   │   ├── HomePage.tsx
│   │   ├── FreeExpression.tsx
│   │   ├── ConstructionImplant.tsx
│   │   ├── ProgressPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   └── hooks/
│       └── useStudent.ts     # 学生状态hook
│
├── public/                    # 静态资源
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md                  # 部署文档
```

---

## 四、关键文件规范

### 4.1 Universal LLM Client (`src/engine/llm.ts`)

职责：发送chat completion请求，处理多provider、错误、重试。

**不做的**：流式传输、function calling、embeddings、多模态。

```typescript
// 核心接口
interface ChatRequest {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

// 多provider配置
const PROVIDERS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  kimi:   { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
};

// 核心方法
async function chat(request: ChatRequest): Promise<ChatResponse>
async function testConnection(): Promise<boolean>
```

### 4.2 Edge Function (`api/chat.ts`)

职责：接收前端请求，转发到目标API，返回响应。

**安全设计**：
- 不存储任何API key
- 不记录请求内容
- 只透传，不修改请求体

```typescript
// 请求头
x-api-key:  sk-...          → Authorization: Bearer sk-...
x-base-url: https://...     → 目标API地址
x-model:    model-name      → 覆盖body中的model字段

// 请求体（透传）
{ messages, temperature, max_tokens, stream: false }
```

### 4.3 学生状态管理 (`src/store/student.ts`)

使用Zustand，localStorage持久化。

```typescript
interface StudentStore {
  // 构式掌握度
  mastery: Record<string, Mastery3D>;
  
  // 情感状态
  affect: AffectiveState;
  
  // 操作
  recordEncounter(encounter: EncounterRecord): void;
  updateAffect(affect: AffectiveState): void;
  setFocus(constructionId: string | null): void;
  
  // 派生
  activeConstructions(): Construction[];
  masteredCount(): number;
}
```

---

## 五、前端页面规范

### 5.1 路由定义

| 路径 | 页面 | 功能 |
|------|------|------|
| `/` | HomePage | 三种模式入口 |
| `/free` | FreeExpression | 自由写作+对比分析 |
| `/implant/:id` | ConstructionImplant | 构式植入对话 |
| `/progress` | ProgressPage | 构式网络进度 |
| `/settings` | SettingsPage | API配置 |

### 5.2 每个页面的输入/输出

**FreeExpression**
- 输入：学生的自由写作文本
- 处理：LLM对比分析（用了哪些构式、哪些差距）
- 输出：构式使用列表 + 差距列表 + 升级建议

**ConstructionImplant**
- 输入：目标构式ID
- 处理：多轮LLM对话（解释→示例→让学生试→反馈）
- 输出：学生掌握度更新

**ProgressPage**
- 输入：学生状态（mastery记录）
- 处理：按类别聚合构式掌握度
- 输出：可视化进度

---

## 六、部署规范

### 6.1 Vercel配置（`vercel.json`）

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/chat", "destination": "/api/chat" },
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, x-api-key, x-base-url, x-model" }
      ]
    }
  ]
}
```

### 6.2 部署步骤

1. Fork仓库到GitHub
2. Vercel.com → Add New Project → Import GitHub Repo
3. Framework Preset选 `Vite`
4. Deploy

### 6.3 环境变量（不需要）

所有配置（API key、base URL、model）都通过前端设置页面存储在localStorage，通过header传给proxy。**零环境变量配置**。

---

## 七、版本管理

### 7.1 Git分支策略

```
main        # 生产分支，随时可部署
develop     # 开发分支，功能集成
topic/*     # 功能分支，如 topic/construction-network
topic/*     # 功能分支，如 topic/free-expression
topic/*     # 功能分支，如 topic/student-model
```

### 7.2 提交规范

```
feat: 新增构式网络定义
feat: 实现对比分析引擎
feat: 实现构式植入对话
fix: 修复Kimi API认证头格式
refactor: 重构LLM客户端为多provider模式
docs: 更新部署文档
```

---

## 八、下一步（按优先级）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **P0** | 初始化项目 | 用init脚本创建基础项目 |
| **P0** | 实现API代理 | `api/chat.ts` + `vercel.json` |
| **P0** | 实现Universal LLM Client | 多provider支持，错误处理 |
| **P0** | 实现设置页面 | API key配置、连接测试 |
| **P1** | 构式网络数据 | 50个学术构式定义 |
| **P1** | 对比分析引擎 | LLM分析学生写作 |
| **P1** | 自由表达页面 | 写作+分析+差距展示 |
| **P2** | 构式植入对话 | 多轮对话教学 |
| **P2** | 学生状态管理 | Zustand + localStorage |
| **P2** | 进度页面 | 构式网络可视化 |
| **P3** | 变体迭代调度 | 多语境练习序列 |
| **P3** | 情感状态管理 | confusion→breakthrough |
| **P3** | 语音合成 | TTS集成 |
