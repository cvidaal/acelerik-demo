import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'accent';
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default',
  className 
}: StatsCardProps) {
  return (
    <Card className={cn(
      'transition-all duration-300 hover:shadow-elevated overflow-hidden',
      className
    )}>
      {variant !== 'default' && (
        <div className={cn(
          'h-1',
          variant === 'primary' && 'gradient-jungle',
          variant === 'accent' && 'gradient-accent'
        )} />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}% vs mes anterior
              </p>
            )}
          </div>
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center',
            variant === 'default' && 'bg-muted',
            variant === 'primary' && 'gradient-jungle',
            variant === 'accent' && 'gradient-accent'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              variant === 'default' && 'text-muted-foreground',
              variant === 'primary' && 'text-primary-foreground',
              variant === 'accent' && 'text-accent-foreground'
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
