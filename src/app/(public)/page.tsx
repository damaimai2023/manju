import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film, Users, Wand2, Sparkles, ChevronRight, Play } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Film className="h-6 w-6" />
            <span className="font-bold">Manju Creator</span>
          </Link>
          <nav className="flex flex-1 items-center justify-end space-x-4">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary">
              功能
            </Link>
            <Link href="#works" className="text-sm font-medium text-muted-foreground hover:text-primary">
              作品
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">登录</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">开始创作</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="container relative z-10">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium">
              <Sparkles className="mr-2 h-4 w-4" />
              AI 驱动的漫剧创作平台
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              让每一帧
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                都充满想象
              </span>
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              专业的 AI 漫剧创作平台，从角色设定到分镜生成，一站式解决创作难题。
              保持角色一致性，快速生成高质量漫剧内容。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8">
                  免费开始创作
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-12 px-8">
                <Play className="mr-2 h-4 w-4" />
                观看演示
              </Button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/50 py-24">
        <div className="container">
          <div className="mx-auto mb-16 max-w-[800px] text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              全链路创作工具
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              从角色设计到分镜生成，覆盖漫剧创作的每个环节
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="角色管理"
              description="三视图设定、特征锚点锁定，确保角色跨场景一致性"
            />
            <FeatureCard
              icon={<Film className="h-8 w-8" />}
              title="场景管理"
              description="多视角场景图管理，氛围、时间、风格一键切换"
            />
            <FeatureCard
              icon={<Wand2 className="h-8 w-8" />}
              title="分镜系统"
              description="专业电影级分镜工具，景别、机位、运动全程可控"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="AI 生成"
              description="智能提示词构建，多模型支持，一键生成高质量画面"
            />
            <FeatureCard
              icon={<Play className="h-8 w-8" />}
              title="作品管理"
              description="剧集管理、版本控制、导出分享，全流程追踪"
            />
            <FeatureCard
              icon={<ChevronRight className="h-8 w-8" />}
              title="创作向导"
              description="新手引导、模板选择，让创作从零开始也轻松上手"
            />
          </div>
        </div>
      </section>

      {/* Works Section */}
      <section id="works" className="py-24">
        <div className="container">
          <div className="mx-auto mb-16 max-w-[800px] text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              优秀作品展示
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              来自创作者社区的精彩漫剧作品
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Film className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <h3 className="font-semibold">作品标题 {i}</h3>
                  <p className="text-sm text-white/80">创作者名称</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg">
              查看更多作品
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container">
          <div className="mx-auto max-w-[800px] text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              开始你的创作之旅
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              免费注册，立即体验 AI 漫剧创作的乐趣
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8">
                  免费注册
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8">
                  已有账号？登录
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center space-x-2">
            <Film className="h-5 w-5" />
            <span className="font-semibold">Manju Creator</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Manju Creator. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
              关于我们
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
              使用条款
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
              隐私政策
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background p-6 transition-all hover:shadow-lg">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}