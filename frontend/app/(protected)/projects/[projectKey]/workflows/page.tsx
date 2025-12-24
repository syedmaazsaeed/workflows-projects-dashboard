'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatRelativeTime, slugify } from '@/lib/utils';
import { Workflow, Plus, Search, Upload, ArrowRight, Tag } from 'lucide-react';

export default function WorkflowsPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    workflowKey: '',
    tags: '',
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', projectKey],
    queryFn: () => api.getWorkflows(projectKey),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; workflowKey: string; tags?: string[] }) =>
      api.createWorkflow(projectKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', projectKey] });
      setDialogOpen(false);
      setNewWorkflow({ name: '', workflowKey: '', tags: '' });
    },
    onError: (error: Error) => {
      alert(`❌ Failed to create workflow: ${error.message}`);
    },
  });

  const filteredWorkflows = workflows?.filter((wf: any) =>
    wf.name.toLowerCase().includes(search.toLowerCase()) ||
    wf.workflowKey.toLowerCase().includes(search.toLowerCase()) ||
    wf.tags?.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleNameChange = (name: string) => {
    setNewWorkflow({
      ...newWorkflow,
      name,
      workflowKey: slugify(name),
    });
  };

  const handleCreate = () => {
    const tags = newWorkflow.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    createMutation.mutate({
      name: newWorkflow.name,
      workflowKey: newWorkflow.workflowKey,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

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
            <span>Workflows</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage n8n workflow JSON files with versioning
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>
                Add a new workflow to this project. You can upload JSON after creating.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  placeholder="Email Notification Workflow"
                  value={newWorkflow.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Workflow Key</Label>
                <Input
                  id="key"
                  placeholder="email-notification"
                  value={newWorkflow.workflowKey}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, workflowKey: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="email, automation, notifications"
                  value={newWorkflow.tags}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, tags: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newWorkflow.name || !newWorkflow.workflowKey || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, key, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workflows List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
        <div className="space-y-4">
          {filteredWorkflows.map((workflow: any) => (
            <Link
              key={workflow.id}
              href={`/projects/${projectKey}/workflows/${workflow.workflowKey}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Workflow className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{workflow.name}</p>
                          <Badge variant={workflow.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {workflow.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {workflow.workflowKey}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {workflow.tags && workflow.tags.length > 0 && (
                        <div className="hidden md:flex items-center gap-1">
                          {workflow.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {workflow.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{workflow.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {formatRelativeTime(workflow.updatedAt)}
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
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium mb-2">
              {search ? 'No workflows found' : 'No workflows yet'}
            </p>
            <p className="text-muted-foreground mb-6">
              {search
                ? 'Try adjusting your search'
                : 'Create a workflow to start uploading JSON files'}
            </p>
            {!search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

