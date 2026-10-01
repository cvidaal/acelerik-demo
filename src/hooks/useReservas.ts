import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Reserva } from "@/types/reserva";

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReservas();
  }, []);

  async function fetchReservas() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("reservas").select("*");

      if (error) {
        throw error;
      }

      if (data) {
        const reservasFormateadas = data.map((reserva) => ({
          ...reserva,
          precio_total: Number(reserva.precio_total) || 0,
          precio_por_nino: Number(reserva.precio_por_nino) || 0,
          senal_pagada: Number(reserva.senal_pagada) || 0,
          num_ninos: Number(reserva.num_ninos) || 0,
          edad: Number(reserva.edad) || 0,
        }));
        setReservas(reservasFormateadas as Reserva[]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar reservas"
      );
      console.error("Error fetching reservas:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateReserva(id: string, updates: Partial<Reserva>) {
    try {
      const { error } = await supabase
        .from("reservas")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setReservas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    } catch (err) {
      console.error("Error updating reserva:", err);
      // Revert or show error
      throw err;
    }
  }

  return { reservas, loading, error, refetch: fetchReservas, updateReserva };
}
