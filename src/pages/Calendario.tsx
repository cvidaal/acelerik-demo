import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { ReservaCard } from "@/components/ReservaCard";
import { ReservaDetailModal } from "@/components/ReservaDetailModal";
import { useReservas } from "@/hooks/useReservas";
import { Reserva, EstadoReserva } from "@/types/reserva";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Cake,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Calendario() {
  const { reservas, loading, error, updateReserva } = useReservas();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const reservasPorDia = useMemo(() => {
    const map: Record<string, Reserva[]> = {};
    reservas.forEach((r) => {
      if (!map[r.fecha_reserva]) {
        map[r.fecha_reserva] = [];
      }
      map[r.fecha_reserva].push(r);
    });
    return map;
  }, [reservas]);

  const reservasDelDia = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return (reservasPorDia[dateStr] || [])
      .filter((r) => r.estado !== "CANCELADO")
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [selectedDate, reservasPorDia]);

  const getStatusColor = (reservas: Reserva[]) => {
    const activeReservas = reservas.filter((r) => r.estado !== "CANCELADO");
    if (activeReservas.length === 0) return null;

    const hasConfirmado = activeReservas.some((r) => r.estado === "CONFIRMADO");
    const hasPendiente = activeReservas.some(
      (r) => r.estado === "PENDIENTE_PAGO"
    );

    if (hasConfirmado) return "bg-success";
    if (hasPendiente) return "bg-warning";
    return "bg-primary";
  };

  const handleChangeEstado = async (id: string, estado: EstadoReserva) => {
    try {
      await updateReserva(id, {
        estado,
        pagado: estado === "COMPLETADO",
      });

      setSelectedReserva((prev) =>
        prev?.id === id
          ? { ...prev, estado, pagado: estado === "COMPLETADO" }
          : prev
      );
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleOpenDetail = (reserva: Reserva) => {
    setSelectedReserva(reserva);
    setModalOpen(true);
  };

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Calendario
          </h1>
          <p className="text-muted-foreground mt-1">
            Vista mensual de todas las reservas
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: es })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(new Date());
                    }}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayReservas = reservasPorDia[dateStr] || [];
                  const activeCount = dayReservas.filter(
                    (r) => r.estado !== "CANCELADO"
                  ).length;
                  const statusColor = getStatusColor(dayReservas);
                  const isSelected =
                    selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative aspect-square p-1 rounded-lg text-sm font-medium transition-all duration-200",
                        !isCurrentMonth && "opacity-30",
                        isSelected &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        isTodayDate && !isSelected && "bg-accent/20",
                        "hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center w-full h-full rounded-md",
                          isTodayDate && "font-bold text-accent"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {activeCount > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              statusColor
                            )}
                          />
                          {activeCount > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              {activeCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  Confirmado
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                  Pendiente
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Completado
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected day reservations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cake className="w-5 h-5 text-accent" />
                {selectedDate ? (
                  <span className="capitalize">
                    {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </span>
                ) : (
                  "Selecciona un día"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {reservasDelDia.length > 0 ? (
                reservasDelDia.map((reserva) => (
                  <ReservaCard
                    key={reserva.id}
                    reserva={reserva}
                    onClick={() => handleOpenDetail(reserva)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay cumples este día</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ReservaDetailModal
        reserva={selectedReserva}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onChangeEstado={handleChangeEstado}
      />
    </Layout>
  );
}
