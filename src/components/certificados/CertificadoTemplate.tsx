import { MESES } from "../../constants";

export type TipoCertificado = "garantia" | "ph";
export type TipoIdentificacion = "ruc" | "dni" | "placa";

export interface CertificadoItem {
  item: string;
  serie: string;
  tipo: string;
  capacidad: string;
  estanqueidad: string;
  vencimientoRecarga: string;
  anioFabricacion: string;
  vencimientoPH: string;
  presionPSI: string;
  condicion: string;
}

export interface CertificadoDatos {
  tipoCertificado: TipoCertificado;
  tipoIdentificacion: TipoIdentificacion;
  nombre: string;
  numeroIdentificacion: string;
  dniAdicional: string;
  ubicacion: string;
  diaFecha: string;
  mesFecha: string;
  anioFecha: string;
  agentesTexto: string;
  items: CertificadoItem[];
}

interface Props {
  datos: CertificadoDatos;
}

const TITULOS: Record<TipoCertificado, string> = {
  garantia:
    "CERTIFICADO DE GARANTIA Y OPERATIVIDAD DE EXTINTORES PORTATILES DE LUCHA CONTRA INCENDIOS Y VIGENCIA DE PRUEBA HIDROSTATICA",
  ph: "CERTIFICADO DE PRUEBA HIDROSTATICA DE EXTINTORES PORTATILES",
};

export default function CertificadoTemplate({ datos }: Props) {
  const esPH = datos.tipoCertificado === "ph";
  const esPlaca = datos.tipoIdentificacion === "placa";
  const labelIdentificacion = datos.tipoIdentificacion === "ruc" ? "RUC N°" : datos.tipoIdentificacion === "dni" ? "DNI N°" : "Placa N°";
  const mesLabel = MESES.find((m) => m.value === datos.mesFecha)?.label.toLowerCase() || "";

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="bg-white text-black">
      <div className="w-[210mm] min-h-[297mm] px-10 py-10 relative text-[14px]">
        <header className="grid grid-cols-[110px_1fr_110px] items-center gap-4 mb-6">
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
          <aside className="w-7.5 flex flex-col items-center justify-start pt-2 font-bold text-[17px] leading-[1.1] select-none">
            <div className="text-blue-600 flex flex-col items-center mb-8">
              {"HONRADEZ".split("").map((c, i) => <span key={i}>{c}</span>)}
            </div>
            <div className="text-red-600 flex flex-col items-center mb-8">
              {"GARANTIA".split("").map((c, i) => <span key={i}>{c}</span>)}
            </div>
            <div className="text-blue-600 flex flex-col items-center">
              {"CUMPLIMIENTO".split("").map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </aside>

          <section className="flex-1 flex flex-col pl-2">
            <h3 className="text-red-600 font-bold text-center text-[16px] mb-5 leading-tight px-6">
              {TITULOS[datos.tipoCertificado]}
            </h3>

            <p className="text-justify mb-5 leading-[1.6]">
              <span className="font-bold">{datos.nombre || "—"}</span> con{" "}
              <span className="font-bold">
                {labelIdentificacion} {datos.numeroIdentificacion || "—"}
                {esPlaca && datos.dniAdicional && <> y DNI N° {datos.dniAdicional}</>}
              </span>
              {!esPlaca && (
                <>
                  {" "}ubicado en <span className="font-bold">{datos.ubicacion || "—"}</span>
                </>
              )}
              ,{" "}
              {esPH ? (
                <>
                  se ha efectuado la Prueba Hidrostática a los extintores portátiles de {datos.agentesTexto},
                  utilizando la máquina <span className="font-bold">CAMEX Maquinaria EIRL</span>, modelo{" "}
                  <span className="font-bold">KPH-02</span>, dicho trabajo se ha realizado conforme lo establece la{" "}
                  <span className="font-bold">NTP 350.043.1-2011; 833.030 según detalle:</span>
                </>
              ) : (
                <>
                  se ha efectuado la recarga de los extintores portátiles de {datos.agentesTexto}, dicho trabajo se
                  ha realizado conforme lo establece la{" "}
                  <span className="font-bold">NTP 350.043.1-2011; 833.030 según detalle:</span>
                </>
              )}
            </p>

            <table className="w-full border-collapse border border-black text-[12px] mb-6 text-center">
              <thead className="font-bold">
                <tr>
                  <th className="border border-black p-1 w-10">Ítem</th>
                  <th className="border border-black p-1 w-12.5">Serie</th>
                  <th className="border border-black p-1 leading-tight">Tipo<br />Extintor</th>
                  <th className="border border-black p-1">Cap.</th>
                  <th className="border border-black p-1 leading-tight">Prueba de<br />Estanqueidad<br />y Fuga</th>
                  <th className="border border-black p-1 leading-tight">Vencimiento<br />Recarga</th>
                  <th className="border border-black p-1 leading-tight">Año de<br />Fabr.</th>
                  <th className="border border-black p-1 leading-tight">Vencimiento<br />Prueba<br />Hidrostática</th>
                  {esPH && <th className="border border-black p-1 leading-tight">Presión<br />PSI</th>}
                  <th className="border border-black p-1 leading-tight">Condición<br />Extintor</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.length === 0 ? (
                  <tr>
                    <td colSpan={esPH ? 10 : 9} className="border border-black p-3 text-gray-500">
                      {esPH ? "Ningún extintor de este servicio tiene Prueba Hidrostática registrada" : "Este servicio no tiene extintores asociados"}
                    </td>
                  </tr>
                ) : (
                  datos.items.map((it, i) => (
                    <tr key={i}>
                      <td className="border border-black p-1 py-2">{it.item}</td>
                      <td className="border border-black p-1 py-2">{it.serie}</td>
                      <td className="border border-black p-1 py-2">{it.tipo}</td>
                      <td className="border border-black p-1 py-2">{it.capacidad}</td>
                      <td className="border border-black p-1 py-2">{it.estanqueidad}</td>
                      <td className="border border-black p-1 py-2">{it.vencimientoRecarga}</td>
                      <td className="border border-black p-1 py-2">{it.anioFabricacion}</td>
                      <td className="border border-black p-1 py-2">{it.vencimientoPH}</td>
                      {esPH && <td className="border border-black p-1 py-2">{it.presionPSI || "—"}</td>}
                      <td className="border border-black p-1 py-2">{it.condicion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <p className="text-justify mb-5 leading-[1.6]">
              <span className="font-bold">LOS EXTINTORES ENTREGADOS EN CALIDAD DE APROBADOS</span>, cualquier evento
              o falla posterior por la mala manipulación, el mal uso (golpes, abolladuras, exposición al calor,
              soldaduras y/o modificaciones, intemperie, oxido, corrosión, etc.) o uso distinto para el que está
              destinado es de responsabilidad del cliente, después de haber sido entregado, 1 año de garantía del
              servicio.
            </p>

            <p className="text-justify mb-8 leading-[1.6]">
              De acuerdo a la <span className="font-bold">NORMA TECNICA PERUANA 350.043</span> el Propietario debe
              inspeccionar su extintor una vez al mes por si exista la posibilidad de que lo hayan utilizado.
            </p>

            <p className="mb-8">{datos.diaFecha} de {mesLabel} del {datos.anioFecha}</p>

            <div className="flex justify-center w-full mt-6">
              <div className="relative w-80 flex flex-col items-center">
                <img src="/images/firma.png" alt="Firma" className="w-72 h-44 object-contain -mb-3" />
                <div className="w-full border-t-[1.5px] border-black border-dashed"></div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}