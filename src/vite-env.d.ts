/// <reference types="vite/client" />

interface Window {
  fleetHarness?: import('../shared/types').FleetAPI;
}

interface ImportMetaEnv {
  readonly VITE_HOSTED?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
