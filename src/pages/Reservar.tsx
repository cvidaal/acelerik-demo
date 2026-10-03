import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BirthdayChild, Booking, checkout, createBooking, euros, getAvailability, getBooking, updateBookingStatus } from '@/api/bookings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake, CheckCircle, ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function Reservar() {
  const [params, setParams] = useSearchParams();
  const returnedID = params.get('booking');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [kids, setKids] = useState<BirthdayChild[]>([{ name: '' }]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const availability = useQuery({ queryKey: ['availability', date], queryFn: () => getAvailability(date), enabled: !!date, refetchInterval: 10000 });
  const returned = useQuery({ queryKey: ['booking', returnedID], queryFn: () => getBooking(returnedID!), enabled: !!returnedID, refetchInterval: query => query.state.data?.payment_status === 'paid' ? false : 2500 });
  useEffect(() => { setSlot(''); }, [date]);
  const current = returned.data || booking;
  const paid = current?.payment_status === 'paid';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true; setBusy(true); setError('');
    try {
      const created = await createBooking({
        date, start_time: slot, children: Number(data.get('children')), package: availability.data!.package,
        customer_name: String(data.get('customer_name')), customer_email: String(data.get('customer_email')),
        customer_phone: String(data.get('customer_phone')), birthday_children: kids, notes: String(data.get('notes') || ''),
      });
      setBooking(created);
      setParams({ booking: created.id });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo reservar'); await availability.refetch(); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function pay() {
    if (!current || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { const session = await checkout(current.id); window.location.assign(session.url); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el pago'); submitting.current = false; setBusy(false); }
  }
  async function cancel() {
    if (!current || busy) return;
    setBusy(true); setError('');
    try { await updateBookingStatus(current.id, 'cancelled'); window.location.assign('/reservar'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cancelar'); setBusy(false); }
  }
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between"><Link to="/reservar" className="font-bold text-xl flex items-center gap-2"><Cake className="text-primary" /> Jungla Mágica</Link><span className="text-xs text-muted-foreground">Cumpleaños para recordar</span></div></header>
    <main className="max-w-5xl mx-auto px-5 py-10 grid md:grid-cols-[1fr_1.45fr] gap-8">
      <section className="space-y-6"><span className="text-sm font-semibold text-primary">UN DÍA MUY ESPECIAL</span><h1 className="text-4xl md:text-5xl font-bold leading-tight">Su cumpleaños.<br />Una gran aventura.</h1><p className="text-muted-foreground text-lg">Elige vuestro día, encuentra un horario disponible y reserva la fiesta con una señal.</p><div className="rounded-2xl gradient-jungle p-7 text-white space-y-4"><Cake className="w-12 h-12"/><h2 className="font-bold text-2xl">Pack Jungla</h2><p>Dos horas de celebración para compartir con amigos. También podéis celebrar juntos el cumpleaños de varios niños.</p></div><p className="text-sm text-muted-foreground flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0"/> Pago de señal mediante Stripe. La confirmación se realiza cuando recibimos el pago.</p></section>
      <Card><CardHeader><CardTitle>{current ? (paid ? '¡Reserva confirmada!' : 'Tu reserva, a un paso') : 'Reserva vuestra fiesta'}</CardTitle></CardHeader><CardContent>
        {error && <p role="alert" className="mb-4 text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
        {returned.isError && <p role="alert">{returned.error.message}</p>}
        {returnedID && returned.isLoading ? <p>Cargando tu reserva…</p> : current ? <div className="space-y-5">
          {paid && <CheckCircle className="text-success w-12 h-12"/>}
          <p className="text-muted-foreground">{current.birthday_children.map(c => c.name).join(' y ')} · {current.children} niños</p>
          <p className="font-medium">{current.date} · {current.start_time}–{current.end_time}</p>
          <div className="rounded-xl bg-muted p-5 space-y-3"><div className="flex justify-between"><span>Precio total</span><strong>{euros(current.total_price)}</strong></div><div className="flex justify-between"><span>{paid ? 'Señal pagada' : 'Señal para confirmar'}</span><strong>{euros(current.deposit_amount)}</strong></div></div>
          {current.booking_status === 'cancelled' ? <p>Esta reserva está cancelada.{paid ? ' El pago está registrado; contacta con el parque para gestionar su devolución.' : ' Selecciona un nuevo horario.'}</p> : paid ? <p>Pago recibido. Tu fiesta está confirmada y el parque ya puede consultarla.</p> : <><p className="text-sm text-muted-foreground">{params.get('payment') === 'success' ? 'Estamos esperando la confirmación del pago. Esta página se actualizará automáticamente.' : 'Hemos guardado tu reserva pendiente. Completa la señal para confirmar.'}</p><Button className="w-full" disabled={busy || params.get('payment') === 'success'} onClick={pay}>{busy ? 'Abriendo pago…' : 'Reservar y pagar señal'}<ArrowRight className="ml-2 w-4 h-4"/></Button></>}
          {current.booking_status === 'pending' && !paid && <Button type="button" variant="outline" disabled={busy} onClick={cancel}>Cancelar y elegir otro horario</Button>}
          <p className="text-xs text-muted-foreground break-all">Referencia: {current.id}</p><a href="/reservar" className="text-sm text-primary underline">Reservar otra fiesta</a>
        </div> : !returnedID && <form onSubmit={submit} className="space-y-5">
          <div><Label htmlFor="date">Fecha</Label><Input id="date" type="date" required min={format(new Date(), 'yyyy-MM-dd')} value={date} onChange={e => setDate(e.target.value)}/></div>
          {availability.isLoading && date && <p>Consultando horarios…</p>}
          {availability.error && <p role="alert" className="text-destructive">{availability.error.message}</p>}
          {availability.data && <fieldset><legend className="text-sm font-medium mb-2">Horario</legend><div className="grid grid-cols-2 gap-2">{availability.data.slots.map(s => <button key={s.start_time} type="button" disabled={!s.available} onClick={() => setSlot(s.start_time)} className={`p-3 border rounded-lg text-left disabled:opacity-40 ${slot === s.start_time ? 'border-primary bg-primary/10' : ''}`}><span className="block font-medium">{s.start_time}–{s.end_time}</span><span className="text-xs text-muted-foreground">{s.available ? `${s.remaining} plazas para fiestas` : 'Completo'}</span></button>)}</div></fieldset>}
          <div><Label htmlFor="children">Número total de niños, incluidos los cumpleañeros</Label><Input id="children" name="children" type="number" min="1" max={availability.data?.max_children || 25} defaultValue="15" required/></div>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Cumpleañeros</legend>{kids.map((kid, i) => <div key={i} className="flex gap-2"><Input aria-label={`Nombre del cumpleañero ${i + 1}`} placeholder="Nombre" required maxLength={100} value={kid.name} onChange={e => setKids(kids.map((k, j) => j === i ? { ...k, name: e.target.value } : k))}/><Input className="w-24" aria-label={`Edad del cumpleañero ${i + 1}`} placeholder="Edad" type="number" min="1" max="18" value={kid.age ?? ''} onChange={e => setKids(kids.map((k, j) => j === i ? { ...k, age: e.target.value ? Number(e.target.value) : undefined } : k))}/>{kids.length > 1 && <Button type="button" variant="ghost" aria-label="Eliminar cumpleañero" onClick={() => setKids(kids.filter((_, j) => j !== i))}>×</Button>}</div>)}<Button type="button" variant="outline" size="sm" disabled={kids.length >= 25} onClick={() => setKids([...kids, { name: '' }])}><Plus className="w-4 h-4 mr-1"/>Añadir cumpleañero</Button></fieldset>
          <div><Label htmlFor="customer_name">Nombre del padre, madre o tutor</Label><Input id="customer_name" name="customer_name" required autoComplete="name" maxLength={150}/></div>
          <div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="customer_email">Email</Label><Input id="customer_email" name="customer_email" type="email" required autoComplete="email" maxLength={254}/></div><div><Label htmlFor="customer_phone">Teléfono</Label><Input id="customer_phone" name="customer_phone" type="tel" required autoComplete="tel" maxLength={30}/></div></div>
          <div><Label htmlFor="notes">Comentarios o alergias (opcional)</Label><Input id="notes" name="notes" maxLength={1000}/></div>
          {availability.data && <p className="text-sm bg-muted rounded-lg p-3">Pack Jungla · {euros(availability.data.price_per_child)} por niño. Señal de hasta {euros(availability.data.deposit_amount)}. En el siguiente paso verás el total calculado para tu fiesta.</p>}
          <Button className="w-full" type="submit" disabled={busy || !slot || !availability.data?.slots.find(s => s.start_time === slot)?.available}>{busy ? 'Guardando reserva…' : 'Continuar al resumen'}<ArrowRight className="w-4 h-4 ml-2"/></Button>
        </form>}
      </CardContent></Card>
    </main>
  </div>;
}
