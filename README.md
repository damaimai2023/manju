# Manju Creator - AI漫剧创作平台

一个专业的 AI 驱动的漫剧（漫画+短剧）创作与管理平台，参考 manju.work 设计。

## 功能特性

### 核心模块
- **用户系统** - 注册、登录、个人资料管理
- **项目管理** - 创建、编辑、删除漫剧项目
- **角色管理** - 
  - 三视图上传（正面、侧面、背面）
  - 特征锚点设定（发色、瞳色、体型等）
  - 角色卡管理
- **场景管理** - 
  - 多视角场景图
  - 时间、氛围、风格设定
- **道具管理** - 道具库管理
- **分镜系统** - 
  - 故事板编辑器（网格/时间线视图）
  - 专业电影参数（景别、机位、镜头运动）
  - 角色/场景关联
  - 台词/动作描述

### 技术栈
- **前端**: Next.js 14 + React + TypeScript + Tailwind CSS
- **UI组件**: shadcn/ui + Radix UI
- **认证**: NextAuth.js v5
- **数据库**: SQLite (Prisma ORM)
- **状态管理**: Zustand + React Query
- **表单**: React Hook Form + Zod

## 快速开始

### 1. 安装依赖
```bash
cd manju-creator
npm install
```

### 2. 配置环境变量
```bash
# .env.local
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"
```

### 3. 初始化数据库
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
manju-creator/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 认证相关页面
│   │   ├── login/           # 登录
│   │   └── register/        # 注册
│   ├── (dashboard)/         # 仪表板（需登录）
│   │   ├── dashboard/       # 工作台首页
│   │   └── dashboard/projects/[id]/
│   │       ├── characters/  # 角色管理
│   │       ├── scenes/      # 场景管理
│   │       ├── props/       # 道具管理
│   │       └── storyboards/ # 分镜管理
│   ├── (public)/            # 公开页面
│   │   └── page.tsx         # 首页
│   └── api/                 # API 路由
├── components/              # React 组件
│   └── ui/                 # shadcn/ui 组件
├── lib/                    # 工具函数
│   ├── auth.ts            # 认证配置
│   ├── prisma.ts          # Prisma 客户端
│   └── utils.ts           # 通用工具
├── prisma/
│   └── schema.prisma      # 数据库模型
├── types/
│   └── index.ts           # TypeScript 类型
└── middleware.ts          # 路由中间件
```

## 数据库模型

### 核心实体
- **User** - 用户
- **Project** - 项目
- **Character** - 角色（含三视图、特征 JSON）
- **Scene** - 场景（含多视角图）
- **Prop** - 道具
- **Storyboard** - 分镜
- **Shot** - 镜头（含景别、机位、运动等）

## 页面路由

| 路径 | 描述 |
|------|------|
| `/` | 首页（Landing Page） |
| `/login` | 登录 |
| `/register` | 注册 |
| `/dashboard` | 工作台 |
| `/dashboard/projects` | 项目列表 |
| `/dashboard/projects/new` | 新建项目 |
| `/dashboard/projects/[id]` | 项目详情 |
| `/dashboard/projects/[id]/characters` | 角色列表 |
| `/dashboard/projects/[id]/characters/new` | 新建角色 |
| `/dashboard/projects/[id]/characters/[charId]` | 角色编辑 |
| `/dashboard/projects/[id]/scenes` | 场景列表 |
| `/dashboard/projects/[id]/storyboards` | 分镜列表 |
| `/dashboard/projects/[id]/storyboards/[sbId]` | 分镜编辑器 |

## 特色功能

### 1. 角色一致性系统
- 三视图锚点机制确保跨场景角色一致性
- 特征锚点（发色、瞳色等）颜色选择器
- 角色卡文件夹管理

### 2. 专业分镜编辑器
- 网格视图和时间线视图双模式
- 专业电影参数：
  - 景别：大远景、远景、全景、中景、近景、特写
  - 机位：平视、仰视、俯视、斜角、过肩
  - 镜头运动：固定、摇、俯仰、推拉、横移、升降
- 角色/场景快速关联

### 3. AI 集成预留
- 提示词构建器接口预留
- AI 生成状态管理
- 多模型支持预留

## 开发计划

- [x] 项目初始化与基础架构
- [x] 用户认证系统
- [x] 项目管理工作台
- [x] 角色管理（含三视图）
- [x] 场景管理
- [x] 分镜编辑器
- [ ] AI 服务集成
- [ ] 作品展示模块
- [ ] 团队协作功能

## License

MIT