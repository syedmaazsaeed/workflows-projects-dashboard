'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatRelativeTime, slugify, copyToClipboard } from '@/lib/utils';
import { Webhook, Plus, Search, ArrowRight, Copy, Check } from 'lucide-react';

export default function WebhooksPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    hookKey: '',
    description: '',
    routingType: 'FORWARD_URL',
    targetUrl: '',
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks', projectKey],
    queryFn: () => api.getWebhooks(projectKey),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newWebhook) => api.createWebhook(projectKey, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', projectKey] });
      setCreatedSecret(result.secret);
    },
    onError: (error: Error) => {
      alert(`❌ Failed to create webhook: ${error.message}`);
    },
  });

  const filteredWebhooks = webhooks?.filter((wh: any) =>
    wh.hookKey.toLowerCase().includes(search.toLowerCase()) ||
    wh.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createMutation.mutate(newWebhook);
  };

  const handleCopySecret = async (secret: string) => {
    await copyToClipboard(secret);
    setCopiedSecret(secret);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Link href="/projects" className="hover:text-foreground">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectKey}`} className="hover:text-foreground">
              {projectKey}
            </Link>
            <span>/</span>
            <span>Webhooks</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage webhook endpoints
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setCreatedSecret(null);
            setNewWebhook({ hookKey: '', description: '', routingType: 'FORWARD_URL', targetUrl: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {createdSecret ? 'Webhook Created!' : 'Create Webhook'}
              </DialogTitle>
              <DialogDescription>
                {createdSecret
                  ? 'Save your webhook secret. It will only be shown once.'
                  : 'Create a new webhook endpoint for this project.'}
              </DialogDescription>
            </DialogHeader>
            {createdSecret ? (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <Label className="text-success">Webhook Secret</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 p-2 rounded bg-background font-mono text-sm break-all">
                      {createdSecret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopySecret(createdSecret)}
                    >
                      {copiedSecret === createdSecret ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Endpoint URL</Label>
                  <code className="block mt-2 p-2 rounded bg-muted font-mono text-sm break-all">
                    POST {apiUrl}/api/webhooks/{projectKey}/{newWebhook.hookKey}
                  </code>
                </div>
                <div>
                  <Label>Required Header</Label>
                  <code className="block mt-2 p-2 rounded bg-muted font-mono text-sm">
                    x-webhook-secret: [your-secret]
                  </code>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="hookKey">Webhook Key</Label>
                  <Input
                    id="hookKey"
                    placeholder="github-events"
                    value={newWebhook.hookKey}
                    onChange={(e) =>
                      setNewWebhook({ ...newWebhook, hookKey: slugify(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Receives GitHub webhook events..."
                    value={newWebhook.description}
                    onChange={(e) =>
                      setNewWebhook({ ...newWebhook, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routingType">Routing Type</Label>
                  <Select
                    value={newWebhook.routingType}
                    onValueChange={(value) =>
                      setNewWebhook({ ...newWebhook, routingType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FORWARD_URL">Forward to URL</SelectItem>
                      <SelectItem value="TRIGGER_N8N_WORKFLOW">Trigger n8n Workflow</SelectItem>
                      <SelectItem value="TRIGGER_INTERNAL_WORKFLOW">Trigger Internal Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newWebhook.routingType === 'FORWARD_URL' && (
                  <div className="space-y-2">
                    <Label htmlFor="targetUrl">Target URL</Label>
                    <Input
                      id="targetUrl"
                      placeholder="https://api.example.com/webhook"
                      value={newWebhook.targetUrl}
                      onChange={(e) =>
                        setNewWebhook({ ...newWebhook, targetUrl: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {createdSecret ? (
                <Button onClick={() => setDialogOpen(false)}>Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newWebhook.hookKey || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search webhooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredWebhooks && filteredWebhooks.length > 0 ? (
        <div className="space-y-4">
          {filteredWebhooks.map((webhook: any) => (
            <Link
              key={webhook.id}
              href={`/projects/${projectKey}/webhooks/${webhook.hookKey}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Webhook className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{webhook.hookKey}</p>
                          <Badge variant={webhook.isEnabled ? 'success' : 'secondary'}>
                            {webhook.isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {webhook.routingType.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {formatRelativeTime(webhook.updatedAt)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium mb-2">
              {search ? 'No webhooks found' : 'No webhooks yet'}
            </p>
            <p className="text-muted-foreground mb-6">
              {search
                ? 'Try adjusting your search'
                : 'Create a webhook to receive external events'}
            </p>
            {!search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

