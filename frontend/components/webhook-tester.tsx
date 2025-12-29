'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import { cn } from '@/lib/utils';

interface WebhookTesterProps {
  webhookUrl: string;
  webhookSecret?: string;
  className?: string;
}

export function WebhookTester({ webhookUrl, webhookSecret, className }: WebhookTesterProps) {
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState('{\n  "test": "data"\n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (webhookSecret) {
        requestHeaders['x-webhook-secret'] = webhookSecret;
      }

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (method !== 'GET' && body) {
        try {
          JSON.parse(body);
          fetchOptions.body = body;
        } catch {
          toast({
            title: 'Invalid JSON',
            description: 'Please provide valid JSON in the request body',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      const startTime = Date.now();
      const res = await fetch(webhookUrl, fetchOptions);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const responseText = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseData,
        responseTime,
      });

      toast({
        title: 'Request sent',
        description: `Received ${res.status} ${res.statusText} in ${responseTime}ms`,
      });
    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : 'Request failed',
      });
      toast({
        title: 'Request failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Test Webhook</CardTitle>
        <CardDescription>Send a test request to your webhook endpoint</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Request Body (JSON)</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="font-mono text-sm"
            rows={6}
          />
        </div>

        <Button onClick={handleTest} disabled={loading} className="w-full">
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Sending...' : 'Send Test Request'}
        </Button>

        {response && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Response</Label>
              <Badge
                variant={response.status >= 200 && response.status < 300 ? 'default' : 'destructive'}
              >
                {response.status || 'Error'}
              </Badge>
            </div>

            {response.error ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{response.error}</span>
              </div>
            ) : (
              <Tabs defaultValue="body" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>
                <TabsContent value="body" className="space-y-2">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(JSON.stringify(response.body, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-64">
                      {JSON.stringify(response.body, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="headers" className="space-y-2">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(JSON.stringify(response.headers, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-64">
                      {JSON.stringify(response.headers, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="info" className="space-y-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{response.status} {response.statusText}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Response Time:</span>
                      <span className="font-medium">{response.responseTime}ms</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

