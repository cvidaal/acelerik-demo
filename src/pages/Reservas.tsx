import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { ReservaDetailModal } from "@/components/ReservaDetailModal";
import { useReservas } from "@/hooks/useReservas";
import { Reserva, EstadoReserva, ReservaFilters } from "@/types/reserva";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  List,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Phone,
  Download,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

export default function Reservas() {
  const { reservas, loading, error, updateReserva } = useReservas();
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [filters, setFilters] = useState<ReservaFilters>({
    estado: "TODOS",
    busqueda: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filteredReservas = useMemo(() => {
    let result = [...reservas];

    // Filter by estado
    if (filters.estado && filters.estado !== "TODOS") {
      result = result.filter((r) => r.estado === filters.estado);
    }

    // Filter by search
    if (filters.busqueda) {
      const search = filters.busqueda.toLowerCase();
      result = result.filter(
        (r) =>
          r.nombre_cumpleanero.toLowerCase().includes(search) ||
          r.nombre_reserva.toLowerCase().includes(search) ||
          r.telefono.includes(search)
      );
    }

    // Filter by date range
    if (filters.fechaDesde) {
      result = result.filter((r) => r.fecha_reserva >= filters.fechaDesde!);
    }
    if (filters.fechaHasta) {
      result = result.filter((r) => r.fecha_reserva <= filters.fechaHasta!);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.fecha_reserva).getTime();
      const dateB = new Date(b.fecha_reserva).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [reservas, filters, sortOrder]);

  const paginatedReservas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReservas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReservas, currentPage]);

  const totalPages = Math.ceil(filteredReservas.length / ITEMS_PER_PAGE);

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

  const clearFilters = () => {
    setFilters({
      estado: "TODOS",
      busqueda: "",
      fechaDesde: "",
      fechaHasta: "",
    });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = [
      "Fecha",
      "Hora",
      "Cumpleañero",
      "Edad",
      "Niños",
      "Contacto",
      "Teléfono",
      "Estado",
      "Total",
      "Pendiente",
    ];
    const rows = filteredReservas.map((r) => [
      r.fecha_reserva,
      r.hora,
      r.nombre_cumpleanero,
      r.edad,
      r.num_ninos,
      r.nombre_reserva,
      r.telefono,
      r.estado,
      r.precio_total.toFixed(2),
      (r.precio_total - r.senal_pagada).toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const hasActiveFilters =
    filters.estado !== "TODOS" ||
    filters.busqueda ||
    filters.fechaDesde ||
    filters.fechaHasta;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <List className="w-8 h-8 text-primary" />
              Reservas
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredReservas.length} reservas encontradas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(hasActiveFilters && "border-primary text-primary")}
            >
              <Filter className="w-4 h-4 mr-1.5" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="animate-slide-up">
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <Label
                    htmlFor="busqueda"
                    className="text-xs text-muted-foreground"
                  >
                    Buscar
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="busqueda"
                      placeholder="Nombre o teléfono..."
                      value={filters.busqueda}
                      onChange={(e) => {
                        setFilters((prev) => ({
                          ...prev,
                          busqueda: e.target.value,
                        }));
                        setCurrentPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="estado"
                    className="text-xs text-muted-foreground"
                  >
                    Estado
                  </Label>
                  <Select
                    value={filters.estado || "TODOS"}
                    onValueChange={(value) => {
                      setFilters((prev) => ({
                        ...prev,
                        estado: value as EstadoReserva | "TODOS",
                      }));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      <SelectItem value="PENDIENTE_PAGO">Pendiente</SelectItem>
                      <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                      <SelectItem value="COMPLETADO">Completado</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="fechaDesde"
                    className="text-xs text-muted-foreground"
                  >
                    Desde
                  </Label>
                  <Input
                    id="fechaDesde"
                    type="date"
                    value={filters.fechaDesde}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        fechaDesde: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="fechaHasta"
                    className="text-xs text-muted-foreground"
                  >
                    Hasta
                  </Label>
                  <Input
                    id="fechaHasta"
                    type="date"
                    value={filters.fechaHasta}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        fechaHasta: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4 text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Limpiar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc"
                        )
                      }
                    >
                      <div className="flex items-center gap-1">
                        Fecha
                        {sortOrder === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cumpleañero</TableHead>
                    <TableHead className="hidden md:table-cell">Edad</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Niños
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Contacto
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReservas.map((reserva) => {
                    const pendiente =
                      reserva.precio_total - reserva.senal_pagada;
                    return (
                      <TableRow
                        key={reserva.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenDetail(reserva)}
                      >
                        <TableCell className="font-medium">
                          {format(
                            parseISO(reserva.fecha_reserva),
                            "dd/MM/yyyy"
                          )}
                        </TableCell>
                        <TableCell>{reserva.hora}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {reserva.nombre_cumpleanero}
                            </span>
                            <p className="text-xs text-muted-foreground lg:hidden">
                              {reserva.nombre_reserva}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {reserva.edad} años
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {reserva.num_ninos}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <span>{reserva.nombre_reserva}</span>
                            <a
                              href={`tel:${reserva.telefono}`}
                              className="text-primary hover:text-primary/80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge estado={reserva.estado} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-medium",
                              pendiente > 0 && reserva.estado !== "CANCELADO"
                                ? "text-warning"
                                : "text-muted-foreground"
                            )}
                          >
                            {pendiente > 0 && reserva.estado !== "CANCELADO"
                              ? `${pendiente.toFixed(2)}€`
                              : "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
