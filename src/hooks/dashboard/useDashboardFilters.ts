import { useState } from "react";
import type { EmpresaItem, Extintor } from "../../types";
import { sortExtintoresPersonalizado } from "../../utils/helpers";
import { filterEmpresas, filterExtintores, getAvailableYears } from "../../utils/dashboardMetrics";

export function useDashboardFilters(
    empresas: EmpresaItem[],
    extintores: Extintor[],
    customWeightOrder: string[],
    customEstadoOrder: string[],
    customAgenteOrder: string[]
) {
    // Filtros de la lista de empresas
    const [search, setSearch] = useState("");
    const [fMonth, setFMonth] = useState("");
    const [fYear, setFYear] = useState("");

    // Filtros de la tabla de extintores
    const [fMarca, setFMarca] = useState("");
    const [fAgente, setFAgente] = useState("");
    const [fEstado, setFEstado] = useState("");
    const [fServicio, setFServicio] = useState("");
    const [fComponente, setFComponente] = useState("");
    const [fPeso, setFPeso] = useState("");

    const availableYears = getAvailableYears(empresas);
    const filtered = filterEmpresas(empresas, search, fMonth, fYear);

    const filteredExt = filterExtintores(extintores, fMarca, fAgente, fEstado, fPeso, fServicio, fComponente);

    const sortedExt = sortExtintoresPersonalizado(
        filteredExt,
        customWeightOrder,
        customEstadoOrder,
        customAgenteOrder,
        extintores
    );

    const totalExtintores = extintores.length;
    const hasFilters = !!(fMarca || fAgente || fEstado || fServicio || fComponente);

    return {
        search, setSearch,
        fMonth, setFMonth,
        fYear, setFYear,
        availableYears,
        filtered,
        fMarca, setFMarca,
        fAgente, setFAgente,
        fEstado, setFEstado,
        fServicio, setFServicio,
        fComponente, setFComponente,
        fPeso, setFPeso,
        filteredExt,
        sortedExt,
        totalExtintores,
        hasFilters,
    };
}