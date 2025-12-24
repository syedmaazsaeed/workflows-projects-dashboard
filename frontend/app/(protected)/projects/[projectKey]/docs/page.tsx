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
import { formatRelativeTime } from '@/lib/utils';
import { FileText, Plus, Search, ArrowRight, BookOpen, FileCode, StickyNote, Link as LinkIcon } from 'lucide-react';

const docTypeIcons: Record<string, any> = {
  README: BookOpen,
  SPEC: FileCode,
  NOTES: StickyNote,
  INTEGRATION: LinkIcon,
  OTHER: FileText,
};

const docTypeLabels: Record<string, string> = {
  README: 'Readme',
  SPEC: 'Specification',
  NOTES: 'Notes',
  INTEGRATION: 'Integration',
  OTHER: 'Other',
};

export default function DocsPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    docType: 'NOTES',
    contentMd: '',
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectKey],
    queryFn: () => api.getDocuments(projectKey),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newDoc) => api.createDocument(projectKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectKey] });
      setDialogOpen(false);
      setNewDoc({ title: '', docType: 'NOTES', contentMd: '' });
    },
  });

  const filteredDocs = documents?.filter((doc: any) =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.contentMd?.toLowerCase().includes(search.toLowerCase())
  );

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
            <span>Documents</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Project documentation and notes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
              <DialogDescription>
                Add a new markdown document to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Document Title"
                    value={newDoc.title}
                    onChange={(e) =>
                      setNewDoc({ ...newDoc, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docType">Type</Label>
                  <Select
                    value={newDoc.docType}
                    onValueChange={(value) =>
                      setNewDoc({ ...newDoc, docType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(docTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  placeholder="# Getting Started&#10;&#10;Write your documentation here..."
                  value={newDoc.contentMd}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, contentMd: e.target.value })
                  }
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newDoc)}
                disabled={!newDoc.title || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredDocs && filteredDocs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc: any) => {
            const Icon = docTypeIcons[doc.docType] || FileText;
            return (
              <Card
                key={doc.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-500" />
                    </div>
                    <Badge variant="outline">{docTypeLabels[doc.docType]}</Badge>
                  </div>
                  <h3 className="font-medium mb-1 line-clamp-1">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {doc.contentMd?.substring(0, 100) || 'No content'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatRelativeTime(doc.updatedAt)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium mb-2">
              {search ? 'No documents found' : 'No documents yet'}
            </p>
            <p className="text-muted-foreground mb-6">
              {search
                ? 'Try adjusting your search'
                : 'Create a document to add project documentation'}
            </p>
            {!search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

