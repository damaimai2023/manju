"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Film, LayoutDashboard, FolderOpen, Users, Image, Box, Sparkles, Mic } from "lucide-react";

const navItems = [
  {
    title: "工作台",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "项目",
    href: "/dashboard/projects",
    icon: FolderOpen,
  },
  {
    title: "角色库",
    href: "/dashboard/characters",
    icon: Users,
  },
  {
    title: "场景库",
    href: "/dashboard/scenes",
    icon: Image,
  },
  {
    title: "道具库",
    href: "/dashboard/props",
    icon: Box,
  },
  {
    title: "音色库",
    href: "/dashboard/voices",
    icon: Mic,
  },
  {
    title: "AI创作",
    href: "/dashboard/ai-studio",
    icon: Sparkles,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6">
      <Link href="/dashboard" className="flex items-center space-x-2">
        <Film className="h-6 w-6" />
        <span className="font-bold hidden sm:inline-block">Manju Creator</span>
      </Link>
      <nav className="flex items-center space-x-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary",
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline-block">{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}