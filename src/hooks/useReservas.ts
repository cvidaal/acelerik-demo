import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Booking, BookingStatus, getBookings, updateBookingStatus } from '@/api/bookings';
import { Reserva, EstadoReserva } from '@/types/reserva';
const states: Record<BookingStatus, EstadoReserva> = { pending: 'PENDIENTE_PAGO', confirmed: 'CONFIRMADO', cancelled: 'CANCELADO', completed: 'COMPLETADO' };
function toReserva(b: Booking): Reserva {
  return {
    id: b.id, created_at: b.created_at,
    nombre_cumpleanero: (b.birthday_children || []).map(c => c.name).join(' y ') || 'Cumpleaños',
    nombre_reserva: b.customer_name, edad: b.birthday_children?.[0]?.age || 0,
    fecha_reserva: b.date, hora: `${b.start_time}–${b.end_time}`, num_ninos: b.children,
    telefono: b.customer_phone, email: b.customer_email, es_matinal: b.start_time < '15:00',
    estado: states[b.booking_status], pagado: b.payment_status === 'paid',
    precio_total: b.total_price / 100, precio_por_nino: b.total_price / b.children / 100,
    senal_pagada: b.payment_status === 'paid' ? b.deposit_amount / 100 : 0,
    payment_status: b.payment_status, pack: b.package, birthday_children: b.birthday_children || [], notes: b.notes,
  };
}
export function useReservas() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['bookings'], queryFn: getBookings, refetchInterval: 5000 });
  async function updateReserva(id: string, updates: Partial<Reserva>) {
    const status = Object.entries(states).find(([, value]) => value === updates.estado)?.[0] as BookingStatus | undefined;
    if (!status) throw new Error('Selecciona un estado válido');
    const updated = await updateBookingStatus(id, status);
    await client.invalidateQueries({ queryKey: ['bookings'] });
    return toReserva(updated);
  }
  return { reservas: (query.data || []).map(toReserva), loading: query.isLoading, error: query.error?.message || null, refetch: query.refetch, updateReserva };
}
