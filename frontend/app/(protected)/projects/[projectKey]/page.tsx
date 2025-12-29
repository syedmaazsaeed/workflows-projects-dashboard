'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import {
  Workflow,
  Webhook,
  FileText,
  Key,
  MessageSquare,
  Activity,
  ArrowRight,
  Plus,
  Settings,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function ProjectPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectKey],
    queryFn: () => api.getProject(projectKey),
  });

  const { data: workflows } = useQuery({
    queryKey: ['workflows', projectKey],
    queryFn: () => api.getWorkflows(projectKey),
  });

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks', projectKey],
    queryFn: () => api.getWebhooks(projectKey),
  });

  const { data: documents } = useQuery({
    queryKey: ['documents', projectKey],
    queryFn: () => api.getDocuments(projectKey),
  });

  if (projectLoading) {
    return (
      <div className="space-y-8">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
      </div>
    );
  }

  const quickLinks = [
    {
      label: 'Workflows',
      href: `/projects/${projectKey}/workflows`,
      count: workflows?.length || 0,
      icon: Workflow,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Webhooks',
      href: `/projects/${projectKey}/webhooks`,
      count: webhooks?.length || 0,
      icon: Webhook,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Documents',
      href: `/projects/${projectKey}/docs`,
      count: documents?.length || 0,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Chat',
      href: `/projects/${projectKey}/chat`,
      count: null,
      icon: MessageSquare,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.name || projectKey },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${projectKey}/chat`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask AI
            </Button>
          </Link>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.label} href={link.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${link.bgColor}`}>
                        <Icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-medium">{link.label}</p>
                        {link.count !== null && (
                          <p className="text-sm text-muted-foreground">
                            {link.count} item{link.count !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Workflows */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Workflows</CardTitle>
                  <Link href={`/projects/${projectKey}/workflows`}>
                    <Button variant="ghost" size="sm">
                      View all
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {workflows && workflows.length > 0 ? (
                  <div className="space-y-3">
                    {workflows.slice(0, 3).map((workflow: any) => (
                      <Link
                        key={workflow.id}
                        href={`/projects/${projectKey}/workflows/${workflow.workflowKey}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Workflow className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="font-medium">{workflow.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {workflow.workflowKey}
                            </p>
                          </div>
                        </div>
                        <Badge variant={workflow.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {workflow.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Workflow className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No workflows yet</p>
                    <Link href={`/projects/${projectKey}/workflows`}>
                      <Button size="sm" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Workflow
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Webhooks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Webhooks</CardTitle>
                  <Link href={`/projects/${projectKey}/webhooks`}>
                    <Button variant="ghost" size="sm">
                      View all
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {webhooks && webhooks.length > 0 ? (
                  <div className="space-y-3">
                    {webhooks.slice(0, 3).map((webhook: any) => (
                      <Link
                        key={webhook.id}
                        href={`/projects/${projectKey}/webhooks/${webhook.hookKey}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Webhook className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="font-medium">{webhook.hookKey}</p>
                            <p className="text-xs text-muted-foreground">
                              {webhook.routingType}
                            </p>
                          </div>
                        </div>
                        <Badge variant={webhook.isEnabled ? 'success' : 'secondary'}>
                          {webhook.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Webhook className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No webhooks yet</p>
                    <Link href={`/projects/${projectKey}/webhooks`}>
                      <Button size="sm" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Webhook
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Project Key</dt>
                  <dd className="font-mono text-sm mt-1">{project.projectKey}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="text-sm mt-1">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Last Updated</dt>
                  <dd className="text-sm mt-1">{formatRelativeTime(project.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created By</dt>
                  <dd className="text-sm mt-1">{project.createdBy?.name || 'Unknown'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Audit log of actions in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Activity feed coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

