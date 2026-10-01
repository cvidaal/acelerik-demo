import { Reserva, EstadoReserva } from '@/types/reserva';
import { StatusBadge } from './StatusBadge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Phone, 
  MessageCircle, 
  Mail, 
  Calendar, 
  Clock, 
  Users, 
  Cake,
  Euro,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface ReservaDetailModalProps {
  reserva: Reserva | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeEstado?: (id: string, estado: EstadoReserva) => void;
}

export function ReservaDetailModal({ 
  reserva, 
  open, 
  onOpenChange,
  onChangeEstado 
}: ReservaDetailModalProps) {
  if (!reserva) return null;

  const fechaFormateada = format(parseISO(reserva.fecha_reserva), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const pendiente = reserva.precio_total - reserva.senal_pagada;

  const handleEstadoChange = (estado: EstadoReserva) => {
    onChangeEstado?.(reserva.id, estado);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center">
              <Cake className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Cumple de {reserva.nombre_cumpleanero}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Reserva por {reserva.nombre_reserva}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado actual</span>
            <StatusBadge estado={reserva.estado} />
          </div>

          <Separator />

          {/* Detalles del evento */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Detalles del evento
            </h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm capitalize">{fechaFormateada}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{reserva.hora}h {reserva.es_matinal && '(Matinal)'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{reserva.num_ninos} niños</span>
              </div>
              <div className="flex items-center gap-3">
                <Cake className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{reserva.edad} años</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contacto */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Contacto
            </h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{reserva.nombre_reserva}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={`tel:${reserva.telefono}`}
                  className="text-sm text-primary hover:underline"
                >
                  {reserva.telefono}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={`mailto:${reserva.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {reserva.email}
                </a>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pago */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Información de pago
            </h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Precio por niño</span>
                <span>{reserva.precio_por_nino.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total ({reserva.num_ninos} niños)</span>
                <span>{reserva.precio_total.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Señal pagada</span>
                <span className="text-success">{reserva.senal_pagada.toFixed(2)}€</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Pendiente de cobro</span>
                <span className={pendiente > 0 ? 'text-warning' : 'text-success'}>
                  {pendiente.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          {/* Acciones de contacto */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`tel:${reserva.telefono}`, '_self')}
            >
              <Phone className="w-4 h-4 mr-2" />
              Llamar
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`https://wa.me/34${reserva.telefono}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          {/* Cambiar estado */}
          {reserva.estado !== 'COMPLETADO' && reserva.estado !== 'CANCELADO' && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Cambiar estado
                </h4>
                <div className="flex flex-wrap gap-2">
                  {reserva.estado === 'PENDIENTE_PAGO' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-success border-success/30 hover:bg-success/10"
                      onClick={() => handleEstadoChange('CONFIRMADO')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Confirmar
                    </Button>
                  )}
                  {reserva.estado === 'CONFIRMADO' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => handleEstadoChange('COMPLETADO')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Marcar completado
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleEstadoChange('CANCELADO')}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
