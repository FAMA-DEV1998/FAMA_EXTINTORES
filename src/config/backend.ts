export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : "");
