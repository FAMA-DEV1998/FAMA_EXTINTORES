import { useState } from "react";
import type { EmpresaItem, Extintor } from "../../../types";
import { sortExtintoresPersonalizado } from "../../../utils/ordenamiento";
import { filterEmpresas, getAvailableYears } from "../../../utils/empresas";
import { filterExtintores } from "../../../utils/metricasExtintores";

export function useFiltrosDashboard(
    empresas: EmpresaItem[],
    extintores: Extintor[],
    customWeightOrder: string[],
    customEstadoOrder: string[],
    customAgenteOrder: string[],
    customSedeOrder: string[] = [],
    sedeNameById: Record<string, string> = {}
) {
    const [search, setSearch] = useState("");
    const [fMonth, setFMonth] = useState("");
    const [fYear, setFYear] = useState("");

    const [fMarca, setFMarca] = useState("");
    const [fAgente, setFAgente] = useState("");
    const [fEstado, setFEstado] = useState("");
    const [fServicio, setFServicio] = useState("");
    const [fComponente, setFComponente] = useState("");
    const [fPeso, setFPeso] = useState("");
    const [fSede, setFSede] = useState("");

    const availableYears = getAvailableYears(empresas);
    const filtered = filterEmpresas(empresas, search, fMonth, fYear);

    const filteredExt = filterExtintores(extintores, fMarca, fAgente, fEstado, fPeso, fServicio, fComponente, fSede);

    const sortedExt = sortExtintoresPersonalizado(
        filteredExt,
        customWeightOrder,
        customEstadoOrder,
        customAgenteOrder,
        extintores,
        customSedeOrder,
        sedeNameById
    );

    const totalExtintores = extintores.length;
    const hasFilters = !!(fMarca || fAgente || fEstado || fServicio || fComponente || fSede);

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
        fSede, setFSede,
        filteredExt,
        sortedExt,
        totalExtintores,
        hasFilters,
    };
}
