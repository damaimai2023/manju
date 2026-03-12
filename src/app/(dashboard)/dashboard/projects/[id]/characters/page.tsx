"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Users, 
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@/types";

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/characters`);
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.map((c: any) => ({
          ...c,
          appearance: c.appearance ? JSON.parse(c.appearance) : null,
          features: c.features ? JSON.parse(c.features) : null,
        })));
      }
    } catch (error) {
      toast({
        title: "获取角色失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCharacter = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCharacters(characters.filter((c) => c.id !== id));
        toast({ title: "角色已删除" });
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">角色管理</h1>
            <p className="text-muted-foreground">管理项目中的角色</p>
          </div>
        </div>
        <Link href={`/dashboard/projects/${projectId}/characters/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建角色
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索角色..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Characters Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCharacters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery ? "未找到匹配的角色" : "还没有角色"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? "尝试其他搜索词" : "创建您的第一个角色"}
            </p>
            {!searchQuery && (
              <Link href={`/dashboard/projects/${projectId}/characters/new`} className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  创建角色
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCharacters.map((character) => (
            <Card key={character.id} className="group overflow-hidden">
              <CardContent className="p-0">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {character.frontView ? (
                    <img
                      src={character.frontView}
                      alt={character.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Users className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center space-x-2">
                    <Link href={`/dashboard/projects/${projectId}/characters/${character.id}`}>
                      <Button size="sm" variant="secondary">
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Delete Button */}
                  <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/projects/${projectId}/characters/${character.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteCharacter(character.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold truncate">{character.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {character.description || "暂无描述"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {character.gender && (
                      <Badge variant="secondary" className="text-xs">
                        {character.gender}
                      </Badge>
                    )}
                    {character.age && (
                      <Badge variant="secondary" className="text-xs">
                        {character.age}岁
                      </Badge>
                    )}
                    {character.appearance?.hair?.color && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: character.appearance.hair.color,
                          color: '#fff'
                        }}
                      >
                        发色
                      </Badge>
                    )}
                  </div>
                  
                  {/* View Indicators */}
                  <div className="mt-3 flex items-center space-x-2 text-xs text-muted-foreground">
                    {character.frontView && (
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                        正面
                      </span>
                    )}
                    {character.sideView && (
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                        侧面
                      </span>
                    )}
                    {character.backView && (
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                        背面
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}