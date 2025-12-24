'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime } from '@/lib/utils';
import {
  Workflow,
  Webhook,
  FileText,
  Key,
  User,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'workflow' | 'webhook' | 'document' | 'secret' | 'project';
  action: 'created' | 'updated' | 'deleted' | 'executed' | 'failed';
  actor: string;
  timestamp: string;
  details?: string;
  projectKey?: string;
}

// Mock data - in real app, this would come from audit logs API
const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'workflow',
    action: 'created',
    actor: 'John Doe',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    details: 'Created workflow "Email Automation"',
    projectKey: 'project-a',
  },
  {
    id: '2',
    type: 'webhook',
    action: 'executed',
    actor: 'System',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    details: 'Webhook "payment-webhook" received event',
    projectKey: 'project-b',
  },
  {
    id: '3',
    type: 'workflow',
    action: 'updated',
    actor: 'Jane Smith',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    details: 'Updated workflow "Data Sync"',
    projectKey: 'project-a',
  },
  {
    id: '4',
    type: 'webhook',
    action: 'failed',
    actor: 'System',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    details: 'Webhook "api-callback" failed to route',
    projectKey: 'project-c',
  },
  {
    id: '5',
    type: 'document',
    action: 'created',
    actor: 'John Doe',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    details: 'Created document "API Integration Guide"',
    projectKey: 'project-b',
  },
  {
    id: '6',
    type: 'secret',
    action: 'created',
    actor: 'Jane Smith',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    details: 'Created secret "API_KEY"',
    projectKey: 'project-a',
  },
  {
    id: '7',
    type: 'project',
    action: 'created',
    actor: 'Admin',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    details: 'Created project "E-commerce Automation"',
  },
];

const activityIcons = {
  workflow: Workflow,
  webhook: Webhook,
  document: FileText,
  secret: Key,
  project: Activity,
};

const actionIcons = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  executed: CheckCircle,
  failed: XCircle,
};

const actionColors = {
  created: 'bg-green-500/10 text-green-500 border-green-500/20',
  updated: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  deleted: 'bg-red-500/10 text-red-500 border-red-500/20',
  executed: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

interface ActivityFeedProps {
  projectKey?: string;
  limit?: number;
  compact?: boolean;
}

export function ActivityFeed({ projectKey, limit = 10, compact = false }: ActivityFeedProps) {
  // In a real app, fetch from audit logs API
  // const { data: activities } = useQuery({
  //   queryKey: ['activities', projectKey],
  //   queryFn: () => api.getActivities(projectKey, { limit }),
  // });

  const activities = projectKey
    ? mockActivities.filter((a) => a.projectKey === projectKey)
    : mockActivities;

  const displayedActivities = activities.slice(0, limit);

  if (compact) {
    return (
      <div className="space-y-3">
        {displayedActivities.map((activity) => {
          const TypeIcon = activityIcons[activity.type];
          const ActionIcon = actionIcons[activity.action];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border',
                actionColors[activity.action]
              )}>
                <ActionIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.details}</p>
                <div className="flex items-center gap-2 mt-1">
                  <TypeIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {activity.actor} • {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Recent activity across your projects</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {displayedActivities.map((activity) => {
              const TypeIcon = activityIcons[activity.type];
              const ActionIcon = actionIcons[activity.action];
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg border',
                    actionColors[activity.action]
                  )}>
                    <ActionIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs', actionColors[activity.action])}>
                        {activity.action}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{activity.details}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{activity.actor}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

