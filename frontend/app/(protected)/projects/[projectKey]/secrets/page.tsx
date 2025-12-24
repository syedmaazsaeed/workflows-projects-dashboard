'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatRelativeTime } from '@/lib/utils';
import { Key, Plus, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function SecretsPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState({ key: '', value: '' });

  const { data: secrets, isLoading } = useQuery({
    queryKey: ['secrets', projectKey],
    queryFn: () => api.getSecrets(projectKey),
  });

  const createMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      api.createSecret(projectKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', projectKey] });
      setDialogOpen(false);
      setNewSecret({ key: '', value: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (secretId: string) => api.deleteSecret(projectKey, secretId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', projectKey] });
    },
  });

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
            <span>Secrets</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Secrets</h1>
          <p className="text-muted-foreground mt-1">
            Securely store API keys and credentials
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Secret
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Secret</DialogTitle>
              <DialogDescription>
                Add a new encrypted secret to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key">Secret Key</Label>
                <Input
                  id="key"
                  placeholder="API_KEY"
                  value={newSecret.key}
                  onChange={(e) =>
                    setNewSecret({ ...newSecret, key: e.target.value.toUpperCase() })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use uppercase letters, numbers, and underscores
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Secret Value</Label>
                <Input
                  id="value"
                  type="password"
                  placeholder="sk-..."
                  value={newSecret.value}
                  onChange={(e) =>
                    setNewSecret({ ...newSecret, value: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newSecret)}
                disabled={!newSecret.key || !newSecret.value || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Secret'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warning */}
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="text-sm">
              <p className="font-medium">Secrets are encrypted</p>
              <p className="text-muted-foreground">
                Only admins can view decrypted secret values. All access is logged.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secrets List */}
      <Card>
        <CardHeader>
          <CardTitle>Project Secrets</CardTitle>
          <CardDescription>
            API keys, tokens, and other sensitive credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : secrets && secrets.length > 0 ? (
            <div className="space-y-3">
              {secrets.map((secret: any) => (
                <div
                  key={secret.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Key className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-mono font-medium">{secret.key}</p>
                      <p className="text-sm text-muted-foreground">
                        Updated {formatRelativeTime(secret.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm text-muted-foreground">
                      ••••••••••••
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Secret</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the secret "{secret.key}"?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(secret.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-2">No secrets yet</p>
              <p className="text-muted-foreground mb-4">
                Add secrets to store API keys and credentials securely
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Secret
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

