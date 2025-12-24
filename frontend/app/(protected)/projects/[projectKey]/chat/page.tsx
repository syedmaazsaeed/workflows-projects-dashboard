'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  Plus,
  User,
  Bot,
  Loader2,
  FileText,
  Workflow,
  Webhook,
} from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chatSessions', projectKey],
    queryFn: () => api.getChatSessions(projectKey),
  });

  const { data: sessionData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chatSession', projectKey, selectedSession],
    queryFn: () => api.getChatSession(projectKey, selectedSession!),
    enabled: !!selectedSession,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => api.createChatSession(projectKey),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions', projectKey] });
      setSelectedSession(session.id);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) =>
      api.sendChatMessage(projectKey, selectedSession!, msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSession', projectKey, selectedSession] });
    },
  });

  const handleSend = async () => {
    if (!message.trim() || !selectedSession || isTyping) return;

    const userMessage = message;
    setMessage('');
    setIsTyping(true);

    // Optimistically add user message
    queryClient.setQueryData(
      ['chatSession', projectKey, selectedSession],
      (old: any) => ({
        ...old,
        messages: [
          ...(old?.messages || []),
          { id: 'temp', role: 'USER', content: userMessage, createdAt: new Date() },
        ],
      })
    );

    try {
      await sendMessageMutation.mutateAsync(userMessage);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionData?.messages, isTyping]);

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'WORKFLOW_VERSION':
        return <Workflow className="h-3 w-3" />;
      case 'DOCUMENT':
        return <FileText className="h-3 w-3" />;
      case 'WEBHOOK_EVENT':
        return <Webhook className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Link href="/projects" className="hover:text-foreground">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${projectKey}`} className="hover:text-foreground">
            {projectKey}
          </Link>
          <span>/</span>
          <span>Chat</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about your workflows, documents, and webhooks
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100%-6rem)]">
        {/* Sessions Sidebar */}
        <Card className="w-64 hidden md:flex flex-col">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Sessions</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => createSessionMutation.mutate()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessionsLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session: any) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedSession === session.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="truncate">{session.title || 'New Chat'}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No sessions yet
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sessionData?.messages && sessionData.messages.length > 0 ? (
                  <div className="space-y-4">
                    {sessionData.messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-3',
                          msg.role === 'USER' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role !== 'USER' && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-4 py-2',
                            msg.role === 'USER'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-medium mb-2 opacity-70">Sources:</p>
                              <div className="space-y-1">
                                {msg.citations.map((citation: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 text-xs opacity-70"
                                  >
                                    {getSourceIcon(citation.sourceType)}
                                    <span className="truncate">
                                      {citation.title || citation.sourceType}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {msg.role === 'USER' && (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.2s]" />
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium mb-2">Start a conversation</p>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      Ask questions about your workflows, documentation, or webhook configurations.
                    </p>
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isTyping}
                  />
                  <Button type="submit" disabled={!message.trim() || isTyping}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-medium mb-2">AI Assistant</p>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Ask questions about your workflows, documents, and webhook configurations.
                The AI will search your project data to provide relevant answers.
              </p>
              <Button onClick={() => createSessionMutation.mutate()}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

