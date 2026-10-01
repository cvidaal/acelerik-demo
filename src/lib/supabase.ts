import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // utiliza url de supabase
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // utiliza la clave anonima de supabase

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase"); // si no hay variables de entorno, lanza un error
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); // exporta la instancia de supabase
