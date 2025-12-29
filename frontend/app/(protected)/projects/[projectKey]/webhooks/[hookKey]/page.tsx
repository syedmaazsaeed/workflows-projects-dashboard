'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { WebhookTester } from '@/components/webhook-tester';
import { formatRelativeTime, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/lib/use-toast';
import { useState } from 'react';
import {
  Webhook,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Activity,
} from 'lucide-react';

export default function WebhookDetailPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const hookKey = params.hookKey as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const { data: webhook, isLoading } = useQuery({
    queryKey: ['webhook', projectKey, hookKey],
    queryFn: () => api.getWebhook(projectKey, hookKey),
  });

  const { data: events } = useQuery({
    queryKey: ['webhookEvents', projectKey, hookKey],
    queryFn: () => api.getWebhookEvents(projectKey, hookKey, { limit: 10 }),
  });

  const webhookUrl = webhook
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/webhooks/${projectKey}/${hookKey}`
    : '';

  const handleCopy = (text: string, type: 'url' | 'secret') => {
    copyToClipboard(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
    toast({
      title: 'Copied to clipboard',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Webhook not found</h2>
        <p className="text-muted-foreground mb-4">The webhook you're looking for doesn't exist.</p>
        <Link href={`/projects/${projectKey}/webhooks`}>
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Webhooks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: projectKey, href: `/projects/${projectKey}` },
          { label: 'Webhooks', href: `/projects/${projectKey}/webhooks` },
          { label: hookKey },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectKey}/webhooks`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{webhook.hookKey}</h1>
              <Badge variant={webhook.isEnabled ? 'default' : 'secondary'}>
                {webhook.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            {webhook.description && (
              <p className="text-muted-foreground mt-1">{webhook.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Webhook Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Details</CardTitle>
              <CardDescription>Configuration and endpoint information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono break-all">
                    {webhookUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(webhookUrl, 'url')}
                  >
                    {copiedUrl ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Routing Type</label>
                <Badge variant="outline">{webhook.routingType.replace(/_/g, ' ')}</Badge>
              </div>

              {webhook.targetUrl && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Target URL</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono break-all">
                      {webhook.targetUrl}
                    </code>
                    <Button variant="outline" size="icon" asChild>
                      <a href={webhook.targetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{formatRelativeTime(webhook.createdAt)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{formatRelativeTime(webhook.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest webhook invocations</CardDescription>
            </CardHeader>
            <CardContent>
              {events?.events && events.events.length > 0 ? (
                <div className="space-y-3">
                  {events.events.slice(0, 5).map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            event.status === 'SUCCESS'
                              ? 'bg-green-500'
                              : event.status === 'FAILED'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">{event.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(event.createdAt)}
                          </p>
                        </div>
                      </div>
                      {event.responseTime && (
                        <span className="text-xs text-muted-foreground">
                          {event.responseTime}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">No events yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Webhook Tester */}
        <div>
          <WebhookTester
            webhookUrl={webhookUrl}
            webhookSecret={webhook.secret}
          />
        </div>
      </div>
    </div>
  );
}

