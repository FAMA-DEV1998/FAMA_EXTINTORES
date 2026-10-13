import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import toast, { Toaster } from "react-hot-toast";
import { TriangleAlert, CircleHelp } from "lucide-react";

type OpcionesConfirmacion = {
  titulo: string;
  mensaje?: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean;
};

type Pendiente = OpcionesConfirmacion & { resolver: (ok: boolean) => void };

let pendiente: Pendiente | null = null;
const suscriptores = new Set<() => void>();
const avisar = () => suscriptores.forEach((fn) => fn());

export const toastAviso = (mensaje: string) =>
  toast(mensaje, { icon: <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0" />, duration: 6000 });

export const confirmar = (opciones: OpcionesConfirmacion): Promise<boolean> =>
  new Promise((resolver) => {
    pendiente?.resolver(false);
    pendiente = { ...opciones, resolver };
    avisar();
  });

const responder = (ok: boolean) => {
  const actual = pendiente;
  pendiente = null;
  avisar();
  actual?.resolver(ok);
};

const suscribir = (fn: () => void) => {
  suscriptores.add(fn);
  return () => { suscriptores.delete(fn); };
};

type Tema = "oscuro" | "claro";

const ESTILOS: Record<Tema, { panel: string; titulo: string; texto: string; cancelar: string; icono: string }> = {
  oscuro: {
    panel: "bg-zinc-900 border-zinc-800",
    titulo: "text-white",
    texto: "text-zinc-400",
    cancelar: "border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white",
    icono: "bg-zinc-800",
  },
  claro: {
    panel: "bg-white border-zinc-200",
    titulo: "text-zinc-900",
    texto: "text-zinc-500",
    cancelar: "border-zinc-300 text-zinc-600 hover:bg-zinc-100",
    icono: "bg-zinc-100",
  },
};

function ConfirmacionHost({ tema }: { tema: Tema }) {
  const actual = useSyncExternalStore(suscribir, () => pendiente);
  const botonConfirmar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!actual) return;
    botonConfirmar.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      responder(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [actual]);

  if (!actual) return null;
  const est = ESTILOS[tema];
  const Icono = actual.peligro ? TriangleAlert : CircleHelp;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => responder(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        className={`w-full max-w-sm rounded-2xl border shadow-2xl p-6 flex flex-col gap-5 ${est.panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${actual.peligro ? "bg-red-500/15 text-red-500" : `${est.icono} text-sky-500`}`}>
            <Icono className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 id="confirmacion-titulo" className={`text-base font-black leading-snug ${est.titulo}`}>{actual.titulo}</h3>
            {actual.mensaje && <div className={`text-sm leading-relaxed ${est.texto}`}>{actual.mensaje}</div>}
          </div>
        </div>
        <div className="flex gap-2.5 justify-end">
          <button onClick={() => responder(false)} className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${est.cancelar}`}>
            {actual.textoCancelar || "Cancelar"}
          </button>
          <button
            ref={botonConfirmar}
            onClick={() => responder(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${actual.peligro || tema === "oscuro" ? "bg-red-600 hover:bg-red-500" : "bg-red-700 hover:bg-red-600"}`}
          >
            {actual.textoConfirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notificaciones({ tema }: { tema: Tema }) {
  const oscuro = tema === "oscuro";
  return (
    <>
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: oscuro ? 76 : 88 }}
        toastOptions={{
          duration: 3500,
          style: {
            background: oscuro ? "#18181b" : "#ffffff",
            color: oscuro ? "#f4f4f5" : "#18181b",
            border: `1px solid ${oscuro ? "#3f3f46" : "#e4e4e7"}`,
            borderRadius: "14px",
            padding: "10px 14px",
            fontSize: "14px",
            fontWeight: 700,
            boxShadow: "0 12px 30px -10px rgba(0,0,0,0.35)",
            maxWidth: "460px",
          },
          success: { iconTheme: { primary: "#10b981", secondary: oscuro ? "#18181b" : "#ffffff" } },
          error: { duration: 5000, iconTheme: { primary: "#ef4444", secondary: oscuro ? "#18181b" : "#ffffff" } },
        }}
      />
      <ConfirmacionHost tema={tema} />
    </>
  );
}
