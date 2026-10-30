import type { CertificadoDatos } from "../types";
import { detectarDenominacion, tituloCertificado, construirDenominacionTexto } from "../utils/denominacion";
import { qrPngDataUrl, URL_RESENAS } from "../utils/qr";
import { columnasVisibles, construirPaginasItems, datosCertificado, ParrafoCertificado, TablaItems, TextoGarantia, TextoInspeccion, type EstiloTabla } from "./CertificadoPartes";

interface Props {
  datos: CertificadoDatos;
  id?: string;
  codigoWeb?: string | null;
}

const ROJO = "#C8102E";
const TINTA = "#111827";

const estiloTabla = (columnas: number): EstiloTabla => ({
  tabla: `w-full border-collapse text-center ${columnas > 11 ? "text-[9px]" : columnas > 9 ? "text-[9.5px]" : "text-[10.5px]"}`,
  thead: "font-bold text-[#111827] bg-[#f3f4f6]",
  th: "border border-[#d1d5db] border-b-2 border-b-[#C8102E] px-[0.8mm] py-[1.1mm] align-middle leading-tight",
  td: "border border-[#e5e7eb] px-[0.8mm] py-[0.6mm] whitespace-nowrap",
  tdTexto: "border border-[#e5e7eb] px-[0.8mm] py-[0.6mm] leading-tight",
  vacio: "border border-[#e5e7eb] p-3 text-gray-500",
  fila: "even:bg-[#fafafa]",
});

const etiqueta = "text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#6b7280]";

export default function CertificadoTemplateModerno({ datos, id, codigoWeb }: Props) {
  const { esPlaca, soloUnidadPlaca, esSingular, labelIdentificacion, mesLabel, ubicacionCompleta } = datosCertificado(datos);
  const paginasItems = construirPaginasItems(datos.items);
  const fecha = `Lima, ${datos.diaFecha} de ${mesLabel} del ${datos.anioFecha}`;
  const qr = qrPngDataUrl(URL_RESENAS);
  const cliente = soloUnidadPlaca ? `UNIDAD PLACA ${datos.numeroIdentificacion || "—"}` : datos.nombre || "—";
  const estilo = estiloTabla(columnasVisibles(datos));
  const fechaCorta = `${datos.diaFecha.padStart(2, "0")}/${datos.mesFecha.padStart(2, "0")}/${datos.anioFecha}`;
  const documento = `${labelIdentificacion} ${datos.numeroIdentificacion || "—"}${esPlaca && datos.dniAdicional ? ` · DNI N° ${datos.dniAdicional}` : ""}`;

  return (
    <>
      {paginasItems.map((itemsPagina, pageIdx) => {
        const denominacionPagina = detectarDenominacion(itemsPagina);
        const denominacionTexto = construirDenominacionTexto(denominacionPagina, esSingular);
        return (
          <div key={pageIdx} style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="bg-white text-black certificado-print-page mb-6 print:mb-0">
            <div id={pageIdx === 0 ? id : undefined} className="w-[210mm] min-h-[297mm] relative flex flex-col text-[12px] text-[#1f2937]">
              <div className="h-[1.5mm] shrink-0" style={{ background: ROJO }} />

              <header className="grid grid-cols-[auto_1fr_auto] items-center gap-[5mm] px-[14mm] pt-[5mm]">
                <img src="/images/fama-logo.png" alt="Fama Extintores" className="h-[14mm] w-auto object-contain" />
                <div className="leading-[1.4] border-l-2 border-[#e5e7eb] pl-[4mm]">
                  <p className="text-[15px] font-bold tracking-wide" style={{ color: TINTA }}>LA FAMA DEL EXTINGUIDOR E.I.R.L.</p>
                  <p className="text-[10px] text-[#4b5563]">Venta, recarga y mantenimiento de extintores y material contra incendio</p>
                  <p className="text-[10px] text-[#4b5563]">
                    <span className="font-bold" style={{ color: ROJO }}>R.U.C. N° 20213431022</span> · Jr. Martín Aranguri 924, Urb. Santa Luzmila, Comas
                  </p>
                  <p className="text-[10px] text-[#4b5563]">Tel. 536-4958 · Cel. 999 916 061 / 941 982 970</p>
                  <p className="text-[10px] font-bold text-[#374151]">Proveedor homologado por SGS · Miembro de ASNEEX</p>
                </div>
                <img src="/images/logo-sgs.png" alt="Proveedor homologado por SGS" className="h-[19mm] w-auto object-contain" />
              </header>

              <section className="mx-[14mm] mt-[4mm] flex items-stretch overflow-hidden rounded-[2.5mm] border border-[#d1d5db]" style={{ borderLeft: `2mm solid ${ROJO}` }}>
                <div className="flex-1 px-[5mm] py-[2.8mm]">
                  <h1 className="text-[13px] font-bold leading-tight uppercase" style={{ color: TINTA }}>{tituloCertificado(datos.tipoCertificado, denominacionPagina)}</h1>
                  <p className="mt-[1.2mm] text-[9.5px] font-bold tracking-[0.25em]" style={{ color: ROJO }}>HONRADEZ · GARANTÍA · CUMPLIMIENTO</p>
                </div>
                <dl className="flex min-w-[48mm] flex-col justify-center gap-[1.6mm] border-l border-[#e5e7eb] px-[5mm] py-[2.5mm] text-right">
                  {codigoWeb && (
                    <div>
                      <dt className={etiqueta}>Código del certificado</dt>
                      <dd className="mt-[0.5mm] text-[12px] font-bold tracking-wide" style={{ color: ROJO }}>{codigoWeb}</dd>
                    </div>
                  )}
                  <div>
                    <dt className={etiqueta}>Fecha de emisión</dt>
                    <dd className="mt-[0.5mm] text-[12px] font-bold" style={{ color: TINTA }}>{fechaCorta}</dd>
                  </div>
                </dl>
              </section>

              <section className="mx-[14mm] mt-[3mm] grid grid-cols-[1.7fr_1fr] overflow-hidden rounded-[2.5mm] border border-[#e5e7eb]">
                <div className={`px-[4mm] py-[1.8mm] ${soloUnidadPlaca ? "col-span-2" : ""}`}>
                  <p className={etiqueta}>{soloUnidadPlaca ? "Vehículo" : datos.tipoIdentificacion === "ruc" ? "Razón social" : "Cliente"}</p>
                  <p className="mt-[0.6mm] text-[12.5px] font-bold leading-snug" style={{ color: TINTA }}>{cliente}</p>
                </div>
                {!soloUnidadPlaca && (
                  <div className="border-l border-[#e5e7eb] px-[4mm] py-[1.8mm]">
                    <p className={etiqueta}>Documento</p>
                    <p className="mt-[0.6mm] text-[12.5px] font-bold" style={{ color: TINTA }}>{documento}</p>
                  </div>
                )}
                {!esPlaca && (
                  <div className="col-span-2 border-t border-[#e5e7eb] bg-[#f8fafc] px-[4mm] py-[1.6mm]">
                    <p className={etiqueta}>Dirección del servicio</p>
                    <p className="mt-[0.6mm] text-[11.5px]">{ubicacionCompleta}</p>
                  </div>
                )}
              </section>

              <p className="mx-[14mm] mt-[3mm] text-justify leading-[1.5] whitespace-pre-line">
                <ParrafoCertificado datos={datos} denominacionTexto={denominacionTexto} />
              </p>

              <div className="mx-[14mm] mt-[3mm] overflow-hidden rounded-[2mm]">
                <TablaItems datos={datos} items={itemsPagina} estilo={estilo} />
              </div>

              <section className="mx-[14mm] mt-[3mm] mb-[3mm] grid grid-cols-[1fr_58mm] items-end gap-[6mm]">
                <div className="rounded-[2mm] bg-[#f8fafc] px-[4mm] py-[2.5mm] text-[10px] leading-[1.45] text-justify" style={{ borderLeft: `1.2mm solid ${ROJO}` }}>
                  <p className="mb-[1.2mm] text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: TINTA }}>Condiciones de la garantía</p>
                  <p><TextoGarantia esSingular={esSingular} /></p>
                  <p className="mt-[1.5mm]"><TextoInspeccion /></p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="text-[11px]">{fecha}</p>
                  <img src="/images/firma.png" alt="Firma del Gerente General" className="mt-[1mm] h-[26mm] w-full object-contain" />
                </div>
              </section>

              <footer className="mt-auto grid grid-cols-[auto_1fr_auto] items-center gap-[5mm] border-t border-[#e5e7eb] px-[14mm] py-[2.5mm]">
                <img src={qr} alt="Código QR para dejar su opinión en Google" className="h-[20mm] w-[20mm] rounded-[1.5mm] border border-[#e5e7eb] bg-white p-[1mm]" />
                <div className="leading-[1.45]">
                  <p className="text-[12px] font-bold" style={{ color: ROJO }}>¿Cómo fue nuestro servicio?</p>
                  <p className="text-[10.5px] text-[#374151]">Escanee el código con la cámara de su celular y déjenos su opinión en Google. Su comentario nos ayuda a seguir mejorando.</p>
                  {codigoWeb && (
                    <p className="mt-[1.5mm] text-[9.5px] text-[#6b7280]">
                      Verifique y descargue este certificado en <span className="font-bold text-[#1d4ed8]">www.extintoresfama.com/certificados</span> con el código <span className="font-bold text-[#111827]">{codigoWeb}</span>.
                    </p>
                  )}
                </div>
                <div className="text-right text-[9.5px] leading-[1.5] text-[#6b7280]">
                  <p className="font-bold text-[#111827]">www.extintoresfama.com</p>
                  <p>ventas@extintoresfama.com</p>
                  {paginasItems.length > 1 && <p className="mt-[1mm] font-bold">Hoja {pageIdx + 1} de {paginasItems.length}</p>}
                </div>
              </footer>
              <div className="h-[1mm] shrink-0" style={{ background: ROJO }} />
            </div>
          </div>
        );
      })}
    </>
  );
}
