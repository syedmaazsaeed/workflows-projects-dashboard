'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Webhook,
  Workflow,
  FileText,
  Download,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

// Mock data generator for demo purposes
function generateMockData() {
  const now = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      workflows: Math.floor(Math.random() * 20) + 10,
      webhooks: Math.floor(Math.random() * 50) + 20,
      events: Math.floor(Math.random() * 200) + 100,
      success: Math.floor(Math.random() * 150) + 80,
      failed: Math.floor(Math.random() * 20) + 5,
    };
  });

  const last7Days = last30Days.slice(-7);

  const webhookStatus = [
    { name: 'Success', value: 85, color: '#10b981' },
    { name: 'Failed', value: 10, color: '#ef4444' },
    { name: 'Pending', value: 5, color: '#f59e0b' },
  ];

  const projectActivity = [
    { name: 'Project A', workflows: 12, webhooks: 8, events: 450 },
    { name: 'Project B', workflows: 8, webhooks: 5, events: 320 },
    { name: 'Project C', workflows: 15, webhooks: 12, events: 680 },
    { name: 'Project D', workflows: 6, webhooks: 4, events: 210 },
  ];

  return {
    last30Days,
    last7Days,
    webhookStatus,
    projectActivity,
    summary: {
      totalEvents: 12450,
      successRate: 87.5,
      avgResponseTime: 245,
      activeWebhooks: 29,
      totalWorkflows: 41,
    },
  };
}

export default function AnalyticsPage() {
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // In a real app, this would come from an analytics API endpoint
  // For now, we use mock data. Replace with:
  // const { data: analyticsData } = useQuery({
  //   queryKey: ['analytics'],
  //   queryFn: () => api.getAnalytics(),
  // });
  const analyticsData = generateMockData();

  if (projectsError) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-destructive mb-4">Failed to load analytics data</p>
            <p className="text-sm text-muted-foreground">
              {projectsError instanceof Error ? projectsError.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trendMetrics = [
    {
      label: 'Total Events',
      value: analyticsData.summary.totalEvents.toLocaleString(),
      change: 12.5,
      trend: 'up',
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      label: 'Success Rate',
      value: `${analyticsData.summary.successRate}%`,
      change: 2.3,
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Avg Response Time',
      value: `${analyticsData.summary.avgResponseTime}ms`,
      change: -5.2,
      trend: 'down',
      icon: Activity,
      color: 'text-purple-500',
    },
    {
      label: 'Active Webhooks',
      value: analyticsData.summary.activeWebhooks,
      change: 3,
      trend: 'up',
      icon: Webhook,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Insights and metrics for your automation hub
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Trend Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {trendMetrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? ArrowUp : metric.trend === 'down' ? ArrowDown : Minus;
          return (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <div className={`flex items-center gap-1 text-xs ${
                    metric.trend === 'up' ? 'text-green-500' : 
                    metric.trend === 'down' ? 'text-red-500' : 
                    'text-muted-foreground'
                  }`}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(metric.change)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Activity Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
              <CardDescription>Last 30 days of activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analyticsData.last30Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(value)}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => formatDate(value)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="events" 
                    stackId="1" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Events"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="webhooks" 
                    stackId="2" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="Webhooks"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="workflows" 
                    stackId="3" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.6}
                    name="Workflows"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Success vs Failed Events */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Success Rate</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.last7Days}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => formatDate(value)}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="success" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Success"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="failed" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Failed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Status Distribution</CardTitle>
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.webhookStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.webhookStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Performance</CardTitle>
              <CardDescription>Event volume and success rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.last30Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(value)}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="success" fill="#10b981" name="Successful" />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Activity</CardTitle>
              <CardDescription>Workflow usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.last30Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(value)}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="workflows" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Active Workflows"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Activity Comparison</CardTitle>
              <CardDescription>Activity breakdown by project</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.projectActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="workflows" fill="#8b5cf6" name="Workflows" />
                  <Bar dataKey="webhooks" fill="#10b981" name="Webhooks" />
                  <Bar dataKey="events" fill="#3b82f6" name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

