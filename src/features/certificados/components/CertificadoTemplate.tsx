import type { CertificadoDatos } from "../types";
import { detectarDenominacion, tituloCertificado, construirDenominacionTexto } from "../utils/denominacion";
import { construirPaginasItems, datosCertificado, ParrafoCertificado, TablaItems, TextoGarantia, TextoInspeccion, type EstiloTabla } from "./CertificadoPartes";
import CertificadoTemplateModerno from "./CertificadoTemplateModerno";

interface Props {
  datos: CertificadoDatos;
  id?: string;
  codigoWeb?: string | null;
}

const LETRAS_LATERALES: { letra: string; color: string }[] = ["HONRADEZ", "GARANTIA", "CUMPLIMIENTO"].flatMap((palabra, idx) => [
  ...(idx > 0 ? [{ letra: "", color: "" }] : []),
  ...palabra.split("").map((letra) => ({ letra, color: idx === 1 ? "text-red-600" : "text-blue-600" })),
]);

const ESTILO_TABLA: EstiloTabla = {
  tabla: "w-full border-collapse border border-black text-[11px] mb-4 text-center",
  thead: "font-bold",
  th: "border border-black p-1",
  td: "border border-black p-1 py-1",
  vacio: "border border-black p-3 text-gray-500",
};

export default function CertificadoTemplate({ datos, id, codigoWeb }: Props) {
  if (datos.diseno === "moderno") return <CertificadoTemplateModerno datos={datos} id={id} codigoWeb={codigoWeb} />;
  const { esSingular, mesLabel } = datosCertificado(datos);

  const paginasItems = construirPaginasItems(datos.items);

  return (
    <>
      {paginasItems.map((itemsPagina, pageIdx) => {
        const denominacionPagina = detectarDenominacion(itemsPagina);
        const denominacionTexto = construirDenominacionTexto(denominacionPagina, esSingular);
        return (
        <div key={pageIdx} style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="bg-white text-black certificado-print-page mb-6 print:mb-0">
          <div id={pageIdx === 0 ? id : undefined} className="w-[210mm] min-h-[297mm] px-10 pt-10 pb-10 relative text-[14px]">
            <header className="grid grid-cols-[110px_1fr_110px] items-center gap-4 mb-4">
              <div className="h-28 flex items-center justify-center">
                <img src="/images/logo-extintor.png" alt="Extintor" className="max-h-full max-w-full object-contain" />
              </div>

              <div className="text-center leading-tight px-2">
                <h1 className="text-red-600 font-bold text-[22px] mb-1">LA FAMA DEL EXTINGUIDOR E.I.R.L</h1>
                <h2 className="font-bold text-[14px] mb-1">
                  VENTA, SERVICIO DE TODO TIPO DE EXTINGUIDORES Y MATERIAL CONTRA INCENDIO
                </h2>
                <p className="text-[14px]">Jr. M. Aranguri 924 – Urb. Santa Luzmila - Lima 7</p>
                <p className="text-red-600 font-bold text-[15px]">Teléfono 536 – 4958 / Celular 999916061 – 941982970</p>
                <p className="text-red-600 font-bold text-[15px]">R.U.C N° 20213431022</p>
                <a href="http://www.extintoresfama.com" className="text-blue-700 font-bold text-[15px] underline tracking-wide">
                  www.extintoresfama.com
                </a>
              </div>

              <div className="h-28 flex items-center justify-center">
                <img src="/images/logo-sgs.png" alt="SGS" className="max-h-full max-w-full object-contain" />
              </div>
            </header>

            <main className="flex gap-4 mt-2">
              <aside className="w-7.5 flex flex-col items-center justify-between pt-2 pb-2 font-bold text-[17px] leading-[1.1] select-none">
                {LETRAS_LATERALES.map((l, i) => (
                  <span key={i} className={l.color}>{l.letra || "\u00A0"}</span>
                ))}
              </aside>

              <section className="flex-1 flex flex-col pl-2">
                <h3 className="text-red-600 font-bold text-center text-[16px] mb-3 leading-tight px-6">
                  {tituloCertificado(datos.tipoCertificado, denominacionPagina)}
                </h3>

                <p className="text-justify mb-4 leading-normal whitespace-pre-line">
                  <ParrafoCertificado datos={datos} denominacionTexto={denominacionTexto} />
                </p>

                <TablaItems datos={datos} items={itemsPagina} estilo={ESTILO_TABLA} />

                <p className="text-justify mb-4 leading-normal">
                  <TextoGarantia esSingular={esSingular} />
                </p>

                <p className="text-justify mb-4 leading-normal">
                  <TextoInspeccion />
                </p>

                <p className="mb-1">Lima, {datos.diaFecha} de {mesLabel} del {datos.anioFecha}</p>

                <div className="flex justify-center w-full">
                  <div className="relative w-80 flex flex-col items-center">
                    <img src="/images/firma.jpg" alt="Firma" className="w-72 h-44 object-contain" />
                  </div>
                </div>
              </section>
            </main>
            {codigoWeb && (
              <p className="absolute bottom-4 left-10 right-10 text-center text-[10.5px] leading-tight text-gray-700">
                Código de verificación: <span className="font-bold text-black tracking-wide">{codigoWeb}</span>
                {" "}· Consulte y descargue este certificado en <span className="font-bold text-blue-700">www.extintoresfama.com/certificados</span>
              </p>
            )}
          </div>
        </div>
        );
      })}
    </>
  );
}
