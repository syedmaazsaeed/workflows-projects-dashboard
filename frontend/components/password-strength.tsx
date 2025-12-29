'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', checks: [] };

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      // Backend requires specific special characters: @$!%*?&
      special: /[@$!%*?&]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const label = labels[Math.min(score, labels.length - 1)];

    return {
      score,
      label,
      checks: [
        { label: 'At least 8 characters', met: checks.length },
        { label: 'One uppercase letter', met: checks.uppercase },
        { label: 'One lowercase letter', met: checks.lowercase },
        { label: 'One number', met: checks.number },
        { label: 'One special character (@$!%*?&)', met: checks.special },
      ],
    };
  }, [password]);

  if (!password) return null;

  const getColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={cn('font-medium', strength.score >= 4 ? 'text-green-600' : strength.score >= 3 ? 'text-yellow-600' : 'text-red-600')}>
          {strength.label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', getColor(strength.score))}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
      <div className="space-y-1.5 text-xs">
        {strength.checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2">
            {check.met ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn(check.met ? 'text-green-600' : 'text-muted-foreground')}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

