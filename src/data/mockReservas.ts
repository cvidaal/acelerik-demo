import { Reserva } from '@/types/reserva';
import { addDays, format, subDays } from 'date-fns';

const nombres = ['Pablo', 'Lucía', 'Martín', 'Sofía', 'Hugo', 'Valentina', 'Leo', 'Emma', 'Mateo', 'Olivia'];
const apellidos = ['García', 'Martínez', 'López', 'Rodríguez', 'Fernández', 'Gómez', 'Sánchez', 'Díaz'];

const generatePhone = () => `6${Math.floor(10000000 + Math.random() * 90000000)}`;

const estados: Reserva['estado'][] = ['PENDIENTE_PAGO', 'CONFIRMADO', 'COMPLETADO', 'CANCELADO'];
const horas = ['11:00', '12:00', '16:00', '17:00', '17:30', '18:00'];

export const generateMockReservas = (): Reserva[] => {
  const reservas: Reserva[] = [];
  const today = new Date();

  // Generate reservations for past 30 days and next 30 days
  for (let i = -30; i <= 30; i++) {
    const date = i < 0 ? subDays(today, Math.abs(i)) : addDays(today, i);
    const numReservas = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0;

    for (let j = 0; j < numReservas; j++) {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
      const numNinos = Math.floor(Math.random() * 15) + 8;
      const precioPorNino = 13.50;
      const precioTotal = numNinos * precioPorNino;
      const isPast = i < 0;
      const isToday = i === 0;
      
      let estado: Reserva['estado'];
      if (isPast) {
        estado = Math.random() > 0.1 ? 'COMPLETADO' : 'CANCELADO';
      } else if (isToday) {
        estado = 'CONFIRMADO';
      } else {
        estado = Math.random() > 0.3 ? 'CONFIRMADO' : 'PENDIENTE_PAGO';
      }

      const senalPagada = estado !== 'PENDIENTE_PAGO' ? 50 : 0;

      reservas.push({
        id: crypto.randomUUID(),
        created_at: subDays(date, Math.floor(Math.random() * 14) + 1).toISOString(),
        nombre_cumpleanero: nombre,
        nombre_reserva: `${nombre} ${apellido}`,
        edad: Math.floor(Math.random() * 8) + 3,
        fecha_reserva: format(date, 'yyyy-MM-dd'),
        hora: horas[Math.floor(Math.random() * horas.length)],
        num_ninos: numNinos,
        telefono: generatePhone(),
        email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@email.com`,
        es_matinal: Math.random() > 0.7,
        estado,
        pagado: estado === 'COMPLETADO',
        precio_total: precioTotal,
        precio_por_nino: precioPorNino,
        senal_pagada: senalPagada,
      });
    }
  }

  return reservas.sort((a, b) => 
    new Date(b.fecha_reserva).getTime() - new Date(a.fecha_reserva).getTime()
  );
};

export const mockReservas = generateMockReservas();
