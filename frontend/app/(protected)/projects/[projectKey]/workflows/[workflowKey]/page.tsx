'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
  Workflow,
  Upload,
  Download,
  GitCompare,
  Play,
  Clock,
  Hash,
  Boxes,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { UploadProgress } from '@/components/upload-progress';
import { useToast } from '@/lib/use-toast';

export default function WorkflowDetailPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const workflowKey = params.workflowKey as string;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: workflow, isLoading: workflowLoading } = useQuery({
    queryKey: ['workflow', projectKey, workflowKey],
    queryFn: () => api.getWorkflow(projectKey, workflowKey),
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['workflowVersions', projectKey, workflowKey],
    queryFn: () => api.getWorkflowVersions(projectKey, workflowKey),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadFileName(file.name);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await api.uploadWorkflowJson(projectKey, workflowKey, file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      queryClient.invalidateQueries({ queryKey: ['workflowVersions', projectKey, workflowKey] });
      queryClient.invalidateQueries({ queryKey: ['workflow', projectKey, workflowKey] });
      
      toast({
        title: 'Upload successful',
        description: 'Workflow JSON uploaded successfully!',
      });

      setTimeout(() => {
        setUploadProgress(0);
        setUploadFileName(null);
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (version: number) => {
    const json = await api.downloadWorkflowVersion(projectKey, workflowKey, version);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowKey}-v${version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latestVersion = versions?.[0];

  if (workflowLoading) {
    return (
      <div className="space-y-8">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Workflow not found</h2>
        <p className="text-muted-foreground">The workflow you're looking for doesn't exist.</p>
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
          { label: 'Workflows', href: `/projects/${projectKey}/workflows` },
          { label: workflow.name || workflowKey },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{workflow.name}</h1>
            <Badge variant={workflow.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {workflow.status}
            </Badge>
          </div>
          {workflow.tags && workflow.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {workflow.tags.map((tag: string) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload JSON'}
            </Button>
          </div>
          {(uploading || uploadProgress > 0 || uploadError) && (
            <UploadProgress
              progress={uploadProgress}
              fileName={uploadFileName || undefined}
              error={uploadError || undefined}
            />
          )}
        </div>
      </div>

      {/* Metadata from latest version */}
      {latestVersion?.metadata && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Boxes className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestVersion.metadata.nodeCount}</p>
                  <p className="text-sm text-muted-foreground">Nodes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestVersion.metadata.triggers?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Triggers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Hash className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{versions?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Versions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate">
                    {formatRelativeTime(workflow.updatedAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                All uploaded versions of this workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : versions && versions.length > 0 ? (
                <div className="space-y-3">
                  {versions.map((version: any, index: number) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-mono font-bold">
                          v{version.version}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Version {version.version}</p>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">Latest</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(version.createdAt)} by {version.createdBy?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(version.version)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium mb-2">No versions yet</p>
                  <p className="text-muted-foreground mb-4">
                    Upload your first workflow JSON file
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload JSON
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Metadata</CardTitle>
              <CardDescription>
                Extracted information from the latest version
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestVersion?.metadata ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Node Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {latestVersion.metadata.nodeTypes?.map((type: string) => (
                        <Badge key={type} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Triggers</h4>
                    <div className="flex flex-wrap gap-2">
                      {latestVersion.metadata.triggers?.length > 0 ? (
                        latestVersion.metadata.triggers.map((trigger: string) => (
                          <Badge key={trigger} variant="secondary">{trigger}</Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No triggers</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Services Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {latestVersion.metadata.servicesUsed?.map((service: string) => (
                        <Badge key={service} variant="outline">{service}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No metadata available. Upload a version first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

