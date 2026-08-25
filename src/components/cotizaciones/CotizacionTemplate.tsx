import type { Cotizacion } from "../../types";
import { montoALetras } from "../../utils/numeroALetras";

const IGV_RATE = 0.18;

interface Props {
    cotizacion: Cotizacion;
}

export default function CotizacionTemplate({ cotizacion }: Props) {
    const items = cotizacion.items.map((it) => {
        const totalItem = (it.precioUnit || 0) * (it.cantidad || 0);
        const baseUnit = (it.precioUnit || 0) / (1 + IGV_RATE);
        const igvUnit = (it.precioUnit || 0) - baseUnit;
        const baseItem = baseUnit * (it.cantidad || 0);
        const igvItem = igvUnit * (it.cantidad || 0);
        return { ...it, totalItem, baseUnit, igvUnit, baseItem, igvItem };
    });
    const subtotal = items.reduce((s, it) => s + it.baseItem, 0);
    const igv = items.reduce((s, it) => s + it.igvItem, 0);
    const total = items.reduce((s, it) => s + it.totalItem, 0);
    const fmt = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fechaFmt = cotizacion.fecha ? cotizacion.fecha.split("-").reverse().join("/") : "";

    return (
        <div
            className="w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] text-slate-800 border-2 border-slate-200 flex flex-col"
            style={{ fontFamily: "'Quicksand', 'Baloo 2', sans-serif" }}
        >
            <header className="flex justify-between items-start mb-6">
                <div className="w-3/5 pr-4">
                    <img src="/images/fama-logo.png" alt="Fama Extintores E.I.R.L." className="h-16 mb-1 object-contain object-left" />
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-1 border-b border-slate-200 pb-1 inline-block">
                        Venta, Recarga y Mantenimiento de Extintores
                    </p>
                    <p className="text-xs text-slate-700 mt-1">
                        Jr. Martin Aranguri Nro. 924 - Santa Luzmila, Comas, Lima
                    </p>
                    <p className="text-xs text-slate-700 font-medium">
                        Celulares: 941 982 970 | 947 326 316
                    </p>
                </div>

                <div className="w-2/5 border-2 border-[#EB0021] rounded-lg text-center overflow-hidden flex flex-col">
                    <div className="bg-[#EB0021] text-white py-1.5 font-bold text-sm tracking-widest">
                        R.U.C. 20213431022
                    </div>
                    <div className="py-2 text-slate-900 bg-white">
                        <p className="font-bold text-lg tracking-wide uppercase">
                            Proforma
                        </p>
                        <p className="font-semibold text-base mt-0.5">N° {cotizacion.numero || "COT-0000-000"}</p>
                        <div className="mt-2 pt-1 border-t border-slate-200 mx-4">
                            <p className="text-xs text-slate-600 font-medium">
                                Fecha de Emisión: {fechaFmt}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <section className="border border-slate-400 rounded-md p-4 mb-6 text-sm bg-slate-50">
                <table className="text-left w-full border-collapse">
                    <tbody>
                        <tr>
                            <th className="w-28 font-bold text-slate-900 pb-1.5 align-top">
                                Empresa:
                            </th>
                            <td className="text-slate-800 uppercase pb-1.5 align-top">
                                {cotizacion.cliente}
                            </td>
                        </tr>
                        <tr>
                            <th className="font-bold text-slate-900 pb-1.5 align-top">
                                R.U.C.:
                            </th>
                            <td className="text-slate-800 pb-1.5 align-top">{cotizacion.ruc}</td>
                        </tr>
                        <tr>
                            <th className="font-bold text-slate-900 pb-1.5 align-top">
                                Dirección:
                            </th>
                            <td className="text-slate-800 uppercase pb-1.5 align-top">
                                {cotizacion.direccion}
                            </td>
                        </tr>
                        {cotizacion.atencion && (
                            <tr>
                                <th className="font-bold text-slate-900 align-top">Atención:</th>
                                <td className="text-slate-800 align-top">
                                    {cotizacion.atencion}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            <table className="w-full mb-4 text-sm border-collapse border border-slate-400">
                <thead>
                    <tr className="bg-[#EB0021] text-white text-xs uppercase text-center">
                        <th className="py-2 border border-slate-400 w-10">Nro</th>
                        <th className="py-2 border border-slate-400 w-24">Código</th>
                        <th className="py-2 border border-slate-400">Descripción</th>
                        <th className="py-2 border border-slate-400 w-12">U.M.</th>
                        <th className="py-2 border border-slate-400 w-12">Cant</th>
                        <th className="py-2 border border-slate-400 w-24">P. Unit</th>
                        <th className="py-2 border border-slate-400 w-24">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((it, i) => (
                        <tr key={i} className="text-slate-800">
                            <td className="py-3 px-2 border border-slate-300 text-center align-top font-medium">
                                {i + 1}
                            </td>
                            <td className="py-3 px-2 border border-slate-300 text-center align-top text-slate-500 font-mono text-xs">
                                {it.codigo}
                            </td>
                            <td className="py-3 px-3 border border-slate-300 align-top">
                                <p className="font-bold text-slate-900">{it.descripcion}</p>
                                {it.detalle && <p className="text-xs text-slate-600 mt-1">{it.detalle}</p>}
                            </td>
                            <td className="py-3 px-2 border border-slate-300 text-center align-top">
                                {it.um}
                            </td>
                            <td className="py-3 px-2 border border-slate-300 text-center align-top">
                                {it.cantidad}
                            </td>
                            <td className="py-3 px-2 border border-slate-300 text-right align-top">
                                <p className="font-semibold">{fmt(it.precioUnit)}</p>
                                <p className="text-[10px] text-slate-400 mt-1 leading-none text-right">
                                    Base: {fmt(it.baseUnit)}
                                    <br />
                                    IGV: {fmt(it.igvUnit)}
                                </p>
                            </td>
                            <td className="py-3 px-2 border border-slate-300 text-right align-top bg-slate-50">
                                <p className="font-bold">{fmt(it.totalItem)}</p>
                                <p className="text-[10px] text-slate-400 mt-1 leading-none text-right">
                                    Base: {fmt(it.baseItem)}
                                    <br />
                                    IGV: {fmt(it.igvItem)}
                                </p>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-start gap-4 mb-8 mt-4">
                <div className="w-3/5 pt-1">
                    <div className="border border-slate-400 rounded-md p-3 text-sm bg-slate-50 inline-block w-full">
                        <p className="text-slate-800">
                            <span className="font-bold text-slate-900 mr-2">SON:</span>
                            {montoALetras(total)}.
                        </p>
                    </div>
                </div>

                <div className="w-2/5 text-sm">
                    <table className="w-full border-collapse border border-slate-400 bg-white">
                        <tbody>
                            <tr>
                                <td className="py-2.5 px-3 border border-slate-300 font-bold text-slate-700 w-1/2">
                                    SUB-TOTAL
                                </td>
                                <td className="py-2.5 px-3 border border-slate-300 text-right text-slate-900 font-medium">
                                    {fmt(subtotal)}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2.5 px-3 border border-slate-300 font-bold text-slate-700">
                                    IGV (18%)
                                </td>
                                <td className="py-2.5 px-3 border border-slate-300 text-right text-slate-900 font-medium">
                                    {fmt(igv)}
                                </td>
                            </tr>
                            <tr className="bg-[#EB0021] text-white">
                                <td className="py-3 px-3 border border-[#EB0021] font-bold text-base">
                                    TOTAL
                                </td>
                                <td className="py-3 px-3 border border-[#EB0021] font-bold text-right text-base whitespace-nowrap">
                                    {fmt(total)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-auto border border-slate-400 rounded-md p-4 text-xs bg-white">
                <p className="font-bold text-slate-900 mb-3 border-b border-slate-300 pb-1.5 uppercase tracking-wide">
                    Condiciones Comerciales y Garantía Institucional
                </p>

                <div className="grid grid-cols-2 gap-6">
                    <ul className="list-none text-slate-700 space-y-2">
                        <li>
                            <span className="font-bold text-slate-900 mr-1">
                                • Tiempo de entrega:
                            </span>{" "}
                            48 horas tras confirmación de compra.
                        </li>
                        <li>
                            <span className="font-bold text-slate-900 mr-1">
                                • Validez de oferta:
                            </span>{" "}
                            15 días calendario.
                        </li>
                        <li>
                            <span className="font-bold text-slate-900 mr-1">• Respaldo:</span>{" "}
                            +31 años de experiencia, operando con certificaciones
                            organizacionales. (Atención en horario comercial estándar).
                        </li>
                    </ul>

                    <div className="border-l border-slate-200 pl-6">
                        <p className="font-bold text-slate-900 mb-2">
                            Cuentas Bancarias Autorizadas:
                        </p>
                        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-slate-700 font-medium space-y-1">
                            <p className="flex justify-between">
                                <span>BCP Soles:</span> <span>191-2237068-0-45</span>
                            </p>
                            <p className="flex justify-between">
                                <span>CCI:</span> <span>00219100223706804550</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
