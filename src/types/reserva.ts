export type EstadoReserva = 'PENDIENTE_PAGO' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO';

export interface Reserva {
  id: string;
  created_at: string;
  nombre_cumpleanero: string;
  nombre_reserva: string;
  edad: number;
  fecha_reserva: string;
  hora: string;
  num_ninos: number;
  telefono: string;
  email: string;
  es_matinal: boolean;
  estado: EstadoReserva;
  pagado: boolean;
  precio_total: number;
  precio_por_nino: number;
  senal_pagada: number;
}

export interface ReservaFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: EstadoReserva | 'TODOS';
  busqueda?: string;
}

export interface DashboardStats {
  cumplesHoy: number;
  cumplesSemana: number;
  cumplesMes: number;
  ingresosMes: number;
}
