'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';

export interface ActionButton {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  className?: string;
  disabled?: boolean;
}

interface ActionButtonsProps {
  actions: ActionButton[];
  align?: 'start' | 'center' | 'end';
  gap?: 'sm' | 'md' | 'lg';
}

export function ActionButtons({
  actions,
  align = 'end',
  gap = 'md',
}: ActionButtonsProps) {
  const gapClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  };

  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', gapClasses[gap], alignClasses[align])}>
        {actions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={action.variant || 'outline'}
                onClick={(e) => {
                  if (!e) return;
                  action.onClick(e as React.MouseEvent<HTMLButtonElement>);
                  e.stopPropagation();
                }}
                disabled={action.disabled}
                className={cn(
                  'h-8 gap-1.5',
                  action.variant === 'destructive' &&
                    'text-destructive hover:text-destructive hover:bg-destructive/10',
                  action.className
                )}
              >
                {action.icon}
                {action.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.tooltip}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
