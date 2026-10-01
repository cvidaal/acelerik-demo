import { Reserva } from '@/types/reserva';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, MessageCircle, Calendar, Clock, Users, Cake, Euro } from 'lucide-react';

interface ReservaCardProps {
  reserva: Reserva;
  onClick?: () => void;
}

export function ReservaCard({ reserva, onClick }: ReservaCardProps) {
  const pendiente = reserva.precio_total - reserva.senal_pagada;
  const fechaFormateada = format(parseISO(reserva.fecha_reserva), "d 'de' MMMM", { locale: es });

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5 border-border/50 overflow-hidden"
      onClick={onClick}
    >
      <div className="h-1 gradient-jungle" />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center">
              <Cake className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Cumple de {reserva.nombre_cumpleanero}
              </h3>
              <p className="text-sm text-muted-foreground">{reserva.nombre_reserva}</p>
            </div>
          </div>
          <StatusBadge estado={reserva.estado} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{fechaFormateada}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{reserva.hora}h</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{reserva.num_ninos} niños ({reserva.edad} años)</span>
          </div>
        </div>

        {pendiente > 0 && reserva.estado !== 'CANCELADO' && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-warning font-medium">
              <Euro className="w-4 h-4" />
              <span>Pendiente: {pendiente.toFixed(2)}€</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${reserva.telefono}`, '_self');
            }}
          >
            <Phone className="w-4 h-4 mr-1.5" />
            Llamar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://wa.me/34${reserva.telefono}`, '_blank');
            }}
          >
            <MessageCircle className="w-4 h-4 mr-1.5" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
