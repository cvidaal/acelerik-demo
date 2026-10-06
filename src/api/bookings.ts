export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export interface BirthdayChild { name: string; age?: number }
export interface Booking {
  id: string; customer_name: string; customer_email: string; customer_phone: string;
  date: string; start_time: string; end_time: string; children: number; package: string;
  total_price: number; deposit_amount: number; payment_status: 'pending' | 'paid' | 'failed';
  booking_status: BookingStatus; birthday_children: BirthdayChild[]; notes?: string;
  created_at: string; updated_at: string;
}
export interface Availability {
  date: string;
  slots: { start_time: string; end_time: string; available: boolean; remaining: number }[];
  package: string; price_per_child: number; deposit_amount: number; max_children: number;
}
export type CreateBooking = Pick<Booking, 'customer_name' | 'customer_email' | 'customer_phone' | 'date' | 'start_time' | 'children' | 'package' | 'birthday_children' | 'notes'>;
const base = (import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8081')).replace(/\/$/, '');
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'No se pudo completar la solicitud');
  return data;
}
export const getBookings = () => request<Booking[]>('/api/bookings');
export const getBooking = (id: string) => request<Booking>(`/api/bookings/${encodeURIComponent(id)}`);
export const getAvailability = (date: string) => request<Availability>(`/api/availability?date=${encodeURIComponent(date)}`);
export const createBooking = (data: CreateBooking) => request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
export const updateBookingStatus = (id: string, booking_status: BookingStatus) => request<Booking>(`/api/bookings/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ booking_status }) });
export const checkout = (booking_id: string) => request<{ url: string }>('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ booking_id }) });
export const euros = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
