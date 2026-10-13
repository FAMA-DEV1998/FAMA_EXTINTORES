import type { CertificadoItem, CertificadoDatos } from "../types";
import { detectarDenominacion, tituloCertificado, construirDenominacionTexto } from "../utils/denominacion";
import { aplicarDenominacionParrafo, sanitizarHtmlBold } from "../utils/parrafo";
import { MESES } from "../../../constants";

interface Props {
  datos: CertificadoDatos;
  id?: string;
}

const FILAS_POR_PAGINA = 14;

const construirPaginasItems = (items: CertificadoItem[]): CertificadoItem[][] => {
  if (items.length === 0) return [[]];
  const paginas: CertificadoItem[][] = [];
  for (let i = 0; i < items.length; i += FILAS_POR_PAGINA) {
    paginas.push(items.slice(i, i + FILAS_POR_PAGINA));
  }
  return paginas;
};

const soloAnio = (valor: string): string => valor?.match(/\d{4}/)?.[0] || valor;

const estanqueidadItem = (it: CertificadoItem): string =>
  (it.condicion || "").trim().toLowerCase() === "de baja" ? "—" : it.estanqueidad;

const LETRAS_LATERALES: { letra: string; color: string }[] = ["HONRADEZ", "GARANTIA", "CUMPLIMIENTO"].flatMap((palabra, idx) => [
  ...(idx > 0 ? [{ letra: "", color: "" }] : []),
  ...palabra.split("").map((letra) => ({ letra, color: idx === 1 ? "text-red-600" : "text-blue-600" })),
]);

export default function CertificadoTemplate({ datos, id }: Props) {
  const esPH = datos.tipoCertificado === "ph";
  const esPlaca = datos.tipoIdentificacion === "placa";
  const soloUnidadPlaca = esPlaca && !datos.dniAdicional && !datos.nombre.trim();
  const esSingular = datos.items.length === 1;
  const labelIdentificacion = datos.tipoIdentificacion === "ruc" ? "RUC N°" : datos.tipoIdentificacion === "dni" ? "DNI N°" : "Placa N°";
  const mesLabel = MESES.find((m) => m.value === datos.mesFecha)?.label.toLowerCase() || "";
  const marcaVisible = datos.columnas.marca || esPH;
  const ubicacionCompleta = `${datos.ubicacion || "—"}${datos.distrito ? ` - ${datos.distrito}` : ""} - Lima`;
  const etiquetasTexto = ["NTP 350.043.1", "833.030", ...datos.etiquetasAdicionales].join("; ");
  const colSpanVacio = 8
    + (datos.columnas.item ? 1 : 0)
    + (datos.columnas.nInterno ? 1 : 0)
    + (marcaVisible ? 1 : 0)
    + (datos.columnas.rating ? 1 : 0)
    + (datos.columnas.tipoServicio ? 1 : 0);

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
                  {datos.parrafoPersonalizado ? (
                    <span dangerouslySetInnerHTML={{ __html: aplicarDenominacionParrafo(sanitizarHtmlBold(datos.parrafoPersonalizado), denominacionTexto) }} />
                  ) : (
                    <>
                      {soloUnidadPlaca ? (
                        <span className="font-bold">UNIDAD PLACA {datos.numeroIdentificacion || "—"}</span>
                      ) : (
                        <>
                          <span className="font-bold">{datos.nombre || "—"}</span> con{" "}
                          <span className="font-bold">
                            {labelIdentificacion} {datos.numeroIdentificacion || "—"}
                            {esPlaca && datos.dniAdicional && <> y DNI N° {datos.dniAdicional}</>}
                          </span>
                        </>
                      )}
                      {!esPlaca && (
                        <>
                          {" "}ubicado en <span className="font-bold">{ubicacionCompleta}</span>
                        </>
                      )}
                      ,{" "}
                      {esPH ? (
                        <>
                          se ha efectuado la Prueba Hidrostática {esSingular ? "al" : "a los"} {denominacionTexto}
                          {datos.agentesTextoCorto ? <> {datos.agentesTextoCorto}</> : null},
                          utilizando la máquina <span className="font-bold"> MARCA KAMEX MAQUINARIAS EIRL</span>, modelo{" "}
                          <span className="font-bold">KPH-02</span>, dicho trabajo se ha realizado conforme lo establece la{" "}
                          <span className="font-bold">{etiquetasTexto} según detalle:</span>
                        </>
                      ) : (
                        <>
                          se ha efectuado {datos.textoAccion} {esSingular ? "del" : "de los"} {denominacionTexto} de {datos.agentesTexto}, dicho trabajo se
                          ha realizado conforme lo establece la{" "}
                          <span className="font-bold">{etiquetasTexto} según detalle:</span>
                        </>
                      )}
                    </>
                  )}
                </p>

                <table className="w-full border-collapse border border-black text-[11px] mb-4 text-center">
                  <thead className="font-bold">
                    <tr>
                      {datos.columnas.item && <th className="border border-black p-1 w-10">Ítem</th>}
                      <th className="border border-black p-1 w-12.5">Serie</th>
                      {datos.columnas.nInterno && <th className="border border-black p-1 leading-tight">N°<br />Interno</th>}
                      {marcaVisible && <th className="border border-black p-1">Marca</th>}
                      <th className="border border-black p-1 leading-tight">Tipo<br />Extintor</th>
                      <th className="border border-black p-1">Cap.</th>
                      {datos.columnas.rating && <th className="border border-black p-1">Rating</th>}
                      {!esPH && <th className="border border-black p-1 leading-tight">Prueba de<br />Estanqueidad<br />y Fuga</th>}
                      {!esPH && <th className="border border-black p-1 leading-tight">Vencimiento<br />Recarga</th>}
                      <th className="border border-black p-1 leading-tight">Año de<br />Fabr.</th>
                      {esPH && <th className="border border-black p-1 leading-tight">Realizado<br />P.H</th>}
                      <th className="border border-black p-1 leading-tight">Vencimiento<br />Prueba<br />Hidrostática</th>
                      {esPH && <th className="border border-black p-1 leading-tight">Presión<br />PSI</th>}
                      {datos.columnas.tipoServicio && <th className="border border-black p-1 leading-tight">Tipo de<br />Servicio</th>}
                      <th className="border border-black p-1 leading-tight">Condición<br />Extintor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsPagina.length === 0 ? (
                      <tr>
                        <td colSpan={colSpanVacio} className="border border-black p-3 text-gray-500">
                          {esPH ? "Ningún extintor de este servicio tiene Prueba Hidrostática registrada" : "Este servicio no tiene extintores asociados"}
                        </td>
                      </tr>
                    ) : (
                      itemsPagina.map((it, i) => (
                        <tr key={i}>
                          {datos.columnas.item && <td className="border border-black p-1 py-1">{it.item}</td>}
                          <td className="border border-black p-1 py-1">{it.serie}</td>
                          {datos.columnas.nInterno && <td className="border border-black p-1 py-1">{it.nInterno}</td>}
                          {marcaVisible && <td className="border border-black p-1 py-1">{it.marca}</td>}
                          <td className="border border-black p-1 py-1">{it.tipo}</td>
                          <td className="border border-black p-1 py-1">{it.capacidad}</td>
                          {datos.columnas.rating && <td className="border border-black p-1 py-1">{it.rating || "—"}</td>}
                          {!esPH && <td className="border border-black p-1 py-1">{estanqueidadItem(it)}</td>}
                          {!esPH && <td className="border border-black p-1 py-1">{it.vencimientoRecarga}</td>}
                          <td className="border border-black p-1 py-1">{soloAnio(it.anioFabricacion)}</td>
                          {esPH && <td className="border border-black p-1 py-1">{it.realizadoPH}</td>}
                          <td className="border border-black p-1 py-1">{soloAnio(it.vencimientoPH)}</td>
                          {esPH && <td className="border border-black p-1 py-1">{it.presionPSI || "—"}</td>}
                          {datos.columnas.tipoServicio && <td className="border border-black p-1 py-1">{it.tipoServicio}</td>}
                          <td className="border border-black p-1 py-1">{it.condicion}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <p className="text-justify mb-4 leading-normal">
                  <span className="font-bold">{esSingular ? "EL EXTINTOR ES ENTREGADO EN CALIDAD DE APROBADO" : "LOS EXTINTORES SON ENTREGADOS EN CALIDAD DE APROBADOS"}</span>, cualquier evento
                  o falla posterior por la mala manipulación, el mal uso (golpes, abolladuras, exposición al calor,
                  soldaduras y/o modificaciones, intemperie, oxido, corrosión, etc.) o uso distinto para el que está
                  destinado es de responsabilidad del cliente, después de haber sido entregado, 1 año de garantía del
                  servicio.
                </p>

                <p className="text-justify mb-4 leading-normal">
                  De acuerdo a la <span className="font-bold">NORMA TECNICA PERUANA 350.043</span> el Propietario debe
                  inspeccionar su extintor una vez al mes por si exista la posibilidad de que lo hayan utilizado.
                </p>

                <p className="mb-1">Lima, {datos.diaFecha} de {mesLabel} del {datos.anioFecha}</p>

                <div className="flex justify-center w-full">
                  <div className="relative w-80 flex flex-col items-center">
                    <img src="/images/firma.jpg" alt="Firma" className="w-72 h-44 object-contain" />
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
        );
      })}
    </>
  );
}
