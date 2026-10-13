import { TriangleAlert } from "lucide-react";
import { TEXTO_MOTIVO_DUPLICADO, type PosibleDuplicado } from "../../utils/duplicados";

export default function AvisoEmpresasParecidas({ parecidas, tema = "oscuro" }: { parecidas: PosibleDuplicado[]; tema?: "oscuro" | "claro" }) {
  if (parecidas.length === 0) return null;
  const estilos = tema === "oscuro"
    ? "bg-amber-950/30 border-amber-800/50 text-amber-300"
    : "bg-amber-50 border-amber-300 text-amber-800";
  return (
    <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-xs font-bold ${estilos}`}>
      <TriangleAlert className="w-4 h-4 shrink-0 mt-px" />
      <div className="flex flex-col gap-1 min-w-0">
        <span>¿Ya existe? Encontramos {parecidas.length === 1 ? "una empresa parecida" : `${parecidas.length} empresas parecidas`}:</span>
        <ul className="flex flex-col gap-0.5 font-semibold">
          {parecidas.slice(0, 3).map((p) => (
            <li key={p.id} className="truncate">• {p.razonSocial} <span className="opacity-70">({TEXTO_MOTIVO_DUPLICADO[p.motivo]})</span></li>
          ))}
        </ul>
        <span className="font-medium opacity-80">Puedes guardar igual si de verdad es otra empresa.</span>
      </div>
    </div>
  );
}
