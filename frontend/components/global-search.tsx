'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Search,
  Workflow,
  Webhook,
  FileText,
  FolderKanban,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'project' | 'workflow' | 'webhook' | 'document';
  title: string;
  description?: string;
  projectKey: string;
  url: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
    enabled: open,
  });

  // Mock search results - in real app, this would be a dedicated search API
  const searchResults: SearchResult[] = query
    ? [
        ...(projects || [])
          .filter((p: any) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.projectKey.toLowerCase().includes(query.toLowerCase())
          )
          .map((p: any) => ({
            id: p.id,
            type: 'project' as const,
            title: p.name,
            description: p.description,
            projectKey: p.projectKey,
            url: `/projects/${p.projectKey}`,
          })),
        // Add more results from workflows, webhooks, documents
      ].slice(0, 10)
    : [];

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
        e.preventDefault();
        router.push(searchResults[selectedIndex].url);
        onOpenChange(false);
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchResults, selectedIndex, router, onOpenChange]);

  const typeIcons = {
    project: FolderKanban,
    workflow: Workflow,
    webhook: Webhook,
    document: FileText,
  };

  const typeColors = {
    project: 'bg-blue-500/10 text-blue-500',
    workflow: 'bg-purple-500/10 text-purple-500',
    webhook: 'bg-green-500/10 text-green-500',
    document: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            ref={inputRef}
            placeholder="Search projects, workflows, webhooks..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        <DialogDescription className="sr-only">
          Search across all projects, workflows, webhooks, and documents
        </DialogDescription>

        <ScrollArea className="max-h-[400px]">
          {query ? (
            searchResults.length > 0 ? (
              <div className="p-2">
                {searchResults.map((result, index) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <button
                      key={result.id}
                      onClick={() => {
                        router.push(result.url);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                        selectedIndex === index
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                      )}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        typeColors[result.type]
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.projectKey}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )
          ) : (
            <div className="p-8 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Start typing to search...
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">Projects</Badge>
                <Badge variant="outline">Workflows</Badge>
                <Badge variant="outline">Webhooks</Badge>
                <Badge variant="outline">Documents</Badge>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

