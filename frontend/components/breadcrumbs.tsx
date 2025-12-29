'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const allItems = [{ label: 'Dashboard', href: '/dashboard' }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}>
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {index === 0 ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Link>
              ) : (
                <span className={cn(isLast && 'text-foreground font-medium')}>
                  {index === 0 ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

