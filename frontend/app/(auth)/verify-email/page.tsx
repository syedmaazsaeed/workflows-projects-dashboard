'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertCircle, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/lib/use-toast';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { toast } = useToast();
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      await api.verifyEmail(email, code);
      setIsSuccess(true);
      toast({
        title: 'Email verified!',
        description: 'Your email has been verified. Your account is pending admin approval.',
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?verified=true');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      toast({
        title: 'Verification failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    setIsResending(true);
    setError('');

    try {
      await api.resendVerificationCode(email);
      toast({
        title: 'Code sent!',
        description: 'A new verification code has been sent to your email.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code';
      setError(errorMessage);
      toast({
        title: 'Failed to resend',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been verified successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Your account is now pending admin approval. You will be notified once your account is approved.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Link href="/login" className="w-full">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            Enter the verification code sent to {email || 'your email'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                required
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to your email
              </p>
            </div>
            {email && (
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-sm"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend code
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline text-center">
              Back to login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

