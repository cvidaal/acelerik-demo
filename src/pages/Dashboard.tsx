import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { ReservaCard } from "@/components/ReservaCard";
import { ReservaDetailModal } from "@/components/ReservaDetailModal";
import { useReservas } from "@/hooks/useReservas";
import { Reserva, EstadoReserva } from "@/types/reserva";
import {
  Cake,
  CalendarDays,
  TrendingUp,
  Euro,
  PartyPopper,
  CalendarClock,
} from "lucide-react";
import {
  format,
  isToday,
  isFuture,
  addDays,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { reservas, loading, error, updateReserva } = useReservas();
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const stats = useMemo(() => {
    const cumplesHoy = reservas.filter(
      (r) => r.fecha_reserva === todayStr && r.estado !== "CANCELADO"
    );

    const next7Days = reservas.filter((r) => {
      const fecha = parseISO(r.fecha_reserva);
      return (
        isFuture(fecha) &&
        isWithinInterval(fecha, { start: today, end: addDays(today, 7) }) &&
        r.estado !== "CANCELADO"
      );
    });

    const thisMonth = reservas.filter((r) => {
      const fecha = parseISO(r.fecha_reserva);
      return (
        isWithinInterval(fecha, {
          start: startOfMonth(today),
          end: endOfMonth(today),
        }) && r.estado !== "CANCELADO"
      );
    });

    const ingresosMes = thisMonth
      .filter((r) => r.estado === "COMPLETADO")
      .reduce((acc, r) => acc + r.precio_total, 0);

    return {
      cumplesHoy: cumplesHoy.length,
      cumplesSemana: next7Days.length,
      cumplesMes: thisMonth.length,
      ingresosMes,
      listaCumplesHoy: cumplesHoy.sort((a, b) => a.hora.localeCompare(b.hora)),
      listaProximos: next7Days
        .sort((a, b) => {
          const dateCompare = a.fecha_reserva.localeCompare(b.fecha_reserva);
          if (dateCompare !== 0) return dateCompare;
          return a.hora.localeCompare(b.hora);
        })
        .slice(0, 5),
    };
  }, [reservas, todayStr]);

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

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            ¡Buenos días! 🌿
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(today, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>

        {/* Alert si hay cumples hoy */}
        {stats.cumplesHoy > 0 && (
          <Alert className="border-accent bg-accent/10 animate-slide-up">
            <PartyPopper className="h-5 w-5 text-accent" />
            <AlertTitle className="text-accent-foreground font-semibold">
              ¡Hoy hay {stats.cumplesHoy} cumple
              {stats.cumplesHoy > 1 ? "s" : ""}!
            </AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              Revisa los detalles abajo para tenerlo todo preparado.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Cumples hoy"
            value={stats.cumplesHoy}
            icon={Cake}
            variant="accent"
          />
          <StatsCard
            title="Próximos 7 días"
            value={stats.cumplesSemana}
            icon={CalendarClock}
            variant="primary"
          />
          <StatsCard
            title="Este mes"
            value={stats.cumplesMes}
            subtitle={format(today, "MMMM", { locale: es })}
            icon={CalendarDays}
          />
          <StatsCard
            title="Ingresos mes"
            value={`${stats.ingresosMes.toFixed(0)}€`}
            icon={Euro}
            trend={{ value: 12, isPositive: true }}
          />
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Cumples de hoy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cake className="w-5 h-5 text-accent" />
                Cumples de hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.listaCumplesHoy.length > 0 ? (
                stats.listaCumplesHoy.map((reserva) => (
                  <ReservaCard
                    key={reserva.id}
                    reserva={reserva}
                    onClick={() => handleOpenDetail(reserva)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cake className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay cumples programados para hoy</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos cumples */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                Próximos cumples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.listaProximos.length > 0 ? (
                stats.listaProximos.map((reserva) => (
                  <ReservaCard
                    key={reserva.id}
                    reserva={reserva}
                    onClick={() => handleOpenDetail(reserva)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay cumples próximos</p>
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
