import { EstadoReserva } from '@/types/reserva';
import { cn } from '@/lib/utils';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  estado: EstadoReserva;
  className?: string;
}

const statusConfig: Record<EstadoReserva, { 
  label: string; 
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  PENDIENTE_PAGO: {
    label: 'Pendiente',
    className: 'bg-warning/15 text-warning-foreground border-warning/30',
    icon: Clock,
  },
  CONFIRMADO: {
    label: 'Confirmado',
    className: 'bg-success/15 text-success border-success/30',
    icon: Check,
  },
  COMPLETADO: {
    label: 'Completado',
    className: 'bg-primary/15 text-primary border-primary/30',
    icon: Check,
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: X,
  },
};

export function StatusBadge({ estado, className }: StatusBadgeProps) {
  const config = statusConfig[estado];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
