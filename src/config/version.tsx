import toast from "react-hot-toast";

const REVISION_MS = 10 * 60 * 1000;
const SCRIPT = /<script[^>]+src="(\/assets\/[^"]+\.js)"/;

const scriptActual = () => Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))
  .map((s) => s.getAttribute("src") || "")
  .find((src) => src.startsWith("/assets/")) || null;

async function hayVersionNueva() {
  const actual = scriptActual();
  if (!actual || !navigator.onLine) return false;
  try {
    const html = await (await fetch(`/?v=${Date.now()}`, { cache: "no-store" })).text();
    const publicado = html.match(SCRIPT)?.[1];
    return !!publicado && publicado !== actual;
  } catch {
    return false;
  }
}

let avisado = false;

async function revisar() {
  if (avisado || !(await hayVersionNueva())) return;
  if (document.visibilityState === "hidden") {
    window.location.reload();
    return;
  }
  avisado = true;
  toast((t) => (
    <span className="flex items-center gap-3 text-sm font-bold">
      Hay una versión nueva del sistema
      <button
        onClick={() => { toast.dismiss(t.id); window.location.reload(); }}
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-black"
      >
        Actualizar
      </button>
    </span>
  ), { id: "version-nueva", duration: Infinity });
}

export function vigilarVersion() {
  setTimeout(revisar, 30000);
  setInterval(revisar, REVISION_MS);
  window.addEventListener("online", () => void revisar());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void revisar();
    else if (avisado) window.location.reload();
  });
}
