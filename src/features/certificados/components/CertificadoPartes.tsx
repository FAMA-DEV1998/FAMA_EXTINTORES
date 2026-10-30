import type { CertificadoItem, CertificadoDatos } from "../types";
import { aplicarDenominacionParrafo, sanitizarHtmlBold } from "../utils/parrafo";
import { MESES } from "../../../constants";

export const FILAS_POR_PAGINA = 14;

export const construirPaginasItems = (items: CertificadoItem[]): CertificadoItem[][] => {
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

export const datosCertificado = (datos: CertificadoDatos) => {
  const esPH = datos.tipoCertificado === "ph";
  const esPlaca = datos.tipoIdentificacion === "placa";
  return {
    esPH,
    esPlaca,
    soloUnidadPlaca: esPlaca && !datos.dniAdicional && !datos.nombre.trim(),
    esSingular: datos.items.length === 1,
    labelIdentificacion: datos.tipoIdentificacion === "ruc" ? "RUC N°" : datos.tipoIdentificacion === "dni" ? "DNI N°" : "Placa N°",
    mesLabel: MESES.find((m) => m.value === datos.mesFecha)?.label.toLowerCase() || "",
    ubicacionCompleta: `${datos.ubicacion || "—"}${datos.distrito ? ` - ${datos.distrito}` : ""} - Lima`,
    etiquetasTexto: ["NTP 350.043.1", "833.030", ...datos.etiquetasAdicionales].join("; "),
  };
};

export const columnasVisibles = (datos: CertificadoDatos): number =>
  8
  + (datos.columnas.item ? 1 : 0)
  + (datos.columnas.nInterno ? 1 : 0)
  + (datos.columnas.marca || datos.tipoCertificado === "ph" ? 1 : 0)
  + (datos.columnas.rating ? 1 : 0)
  + (datos.columnas.tipoServicio ? 1 : 0);

export function ParrafoCertificado({ datos, denominacionTexto }: { datos: CertificadoDatos; denominacionTexto: string }) {
  const { esPH, esPlaca, soloUnidadPlaca, esSingular, labelIdentificacion, ubicacionCompleta, etiquetasTexto } = datosCertificado(datos);
  if (datos.parrafoPersonalizado) {
    return <span dangerouslySetInnerHTML={{ __html: aplicarDenominacionParrafo(sanitizarHtmlBold(datos.parrafoPersonalizado), denominacionTexto) }} />;
  }
  return (
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
  );
}

export interface EstiloTabla {
  tabla: string;
  thead: string;
  th: string;
  td: string;
  tdTexto?: string;
  vacio: string;
  fila?: string;
}

export function TablaItems({ datos, items, estilo }: { datos: CertificadoDatos; items: CertificadoItem[]; estilo: EstiloTabla }) {
  const { esPH } = datosCertificado(datos);
  const marcaVisible = datos.columnas.marca || esPH;
  const colSpanVacio = columnasVisibles(datos);
  const th = estilo.th;
  const td = estilo.td;
  const tdTexto = estilo.tdTexto ?? estilo.td;

  return (
    <table className={estilo.tabla}>
      <thead className={estilo.thead}>
        <tr>
          {datos.columnas.item && <th className={`${th} w-10`}>Ítem</th>}
          <th className={`${th} w-12.5`}>Serie</th>
          {datos.columnas.nInterno && <th className={`${th} leading-tight`}>N°<br />Interno</th>}
          {marcaVisible && <th className={th}>Marca</th>}
          <th className={`${th} leading-tight`}>Tipo<br />Extintor</th>
          <th className={th}>Cap.</th>
          {datos.columnas.rating && <th className={th}>Rating</th>}
          {!esPH && <th className={`${th} leading-tight`}>Prueba de<br />Estanqueidad<br />y Fuga</th>}
          {!esPH && <th className={`${th} leading-tight`}>Vencimiento<br />Recarga</th>}
          <th className={`${th} leading-tight`}>Año de<br />Fabr.</th>
          {esPH && <th className={`${th} leading-tight`}>Realizado<br />P.H</th>}
          <th className={`${th} leading-tight`}>Vencimiento<br />Prueba<br />Hidrostática</th>
          {esPH && <th className={`${th} leading-tight`}>Presión<br />PSI</th>}
          {datos.columnas.tipoServicio && <th className={`${th} leading-tight`}>Tipo de<br />Servicio</th>}
          <th className={`${th} leading-tight`}>Condición<br />Extintor</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={colSpanVacio} className={estilo.vacio}>
              {esPH ? "Ningún extintor de este servicio tiene Prueba Hidrostática registrada" : "Este servicio no tiene extintores asociados"}
            </td>
          </tr>
        ) : (
          items.map((it, i) => (
            <tr key={i} className={estilo.fila}>
              {datos.columnas.item && <td className={td}>{it.item}</td>}
              <td className={td}>{it.serie}</td>
              {datos.columnas.nInterno && <td className={td}>{it.nInterno}</td>}
              {marcaVisible && <td className={tdTexto}>{it.marca}</td>}
              <td className={tdTexto}>{it.tipo}</td>
              <td className={td}>{it.capacidad}</td>
              {datos.columnas.rating && <td className={td}>{it.rating || "—"}</td>}
              {!esPH && <td className={td}>{estanqueidadItem(it)}</td>}
              {!esPH && <td className={td}>{it.vencimientoRecarga}</td>}
              <td className={td}>{soloAnio(it.anioFabricacion)}</td>
              {esPH && <td className={td}>{it.realizadoPH}</td>}
              <td className={td}>{soloAnio(it.vencimientoPH)}</td>
              {esPH && <td className={td}>{it.presionPSI || "—"}</td>}
              {datos.columnas.tipoServicio && <td className={tdTexto}>{it.tipoServicio}</td>}
              <td className={tdTexto}>{it.condicion}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function TextoGarantia({ esSingular }: { esSingular: boolean }) {
  return (
    <>
      <span className="font-bold">{esSingular ? "EL EXTINTOR ES ENTREGADO EN CALIDAD DE APROBADO" : "LOS EXTINTORES SON ENTREGADOS EN CALIDAD DE APROBADOS"}</span>, cualquier evento
      o falla posterior por la mala manipulación, el mal uso (golpes, abolladuras, exposición al calor,
      soldaduras y/o modificaciones, intemperie, oxido, corrosión, etc.) o uso distinto para el que está
      destinado es de responsabilidad del cliente, después de haber sido entregado, 1 año de garantía del
      servicio.
    </>
  );
}

export function TextoInspeccion() {
  return (
    <>
      De acuerdo a la <span className="font-bold">NORMA TECNICA PERUANA 350.043</span> el Propietario debe
      inspeccionar su extintor una vez al mes por si exista la posibilidad de que lo hayan utilizado.
    </>
  );
}
