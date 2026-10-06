import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Calendario from "./pages/Calendario";
import Reservas from "./pages/Reservas";
import NotFound from "./pages/NotFound";
import Reservar from "./pages/Reservar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="bg-primary/10 px-4 py-2 text-center text-xs text-primary" role="note">Demo Acelerik · Usa datos ficticios. Los pagos son de prueba y no reservan una fiesta real.</div>
        <Routes>
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/reservas" element={<Reservas />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
