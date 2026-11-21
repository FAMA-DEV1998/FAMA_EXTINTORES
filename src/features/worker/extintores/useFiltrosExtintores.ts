import { useEffect, useMemo, useState } from "react";
import type { EmpresaData, Extintor } from "../../../types";
import { esExtintorIncompleto } from "../../../utils/extintores";
import { sortExtintoresPersonalizado } from "../../../utils/ordenamiento";

export function useFiltrosExtintores(extintores: Extintor[], empresa: EmpresaData, variant: "todos" | "servicio" = "todos") {
    const [search, setSearch] = useState("");
    const [fMarca, setFMarca] = useState("");
    const [fAgente, setFAgente] = useState("");
    const [fPeso, setFPeso] = useState("");
    const [fEstado, setFEstado] = useState("");
    const [fArea, setFArea] = useState("");
    const [soloIncompletos, setSoloIncompletos] = useState(false);

    const weightOrder = variant === "servicio" ? empresa.servicioWeightOrder : empresa.weightOrder;
    const estadoOrder = variant === "servicio" ? empresa.servicioEstadoOrder : empresa.estadoOrder;
    const agenteOrder = variant === "servicio" ? empresa.servicioAgenteOrder : empresa.agenteOrder;

    const { incompletosCount, marcasDisponibles, agentesDisponibles, pesosDisponibles, estadosDisponibles, areasDisponibles, extintoresOrdenados } = useMemo(() => {
        const extintoresSegunFiltros = (excluir?: "marca" | "agente" | "peso" | "estado" | "area") => {
            return extintores.filter((e) => {
                if (excluir !== "marca" && fMarca && (e.marca || "") !== fMarca) return false;
                if (excluir !== "agente" && fAgente && (e.agenteExtintor || "") !== fAgente) return false;
                if (excluir !== "peso" && fPeso && (e.peso ? `${e.peso} ${e.unidadPeso}` : "") !== fPeso) return false;
                if (excluir !== "estado" && fEstado && (e.estadoExtintor || "") !== fEstado) return false;
                if (excluir !== "area" && fArea && (e.area || "").trim() !== fArea) return false;
                if (soloIncompletos && !esExtintorIncompleto(e)) return false;
                return true;
            });
        };

        const q = search.trim().toLowerCase();
        const extintoresFiltrados = extintoresSegunFiltros().filter((ext) => {
            if (!q) return true;
            return (ext.nSerie || "").toLowerCase().includes(q) || (ext.nInterno || "").toLowerCase().includes(q) || (ext.area || "").toLowerCase().includes(q);
        });

        return {
            incompletosCount: extintores.filter(esExtintorIncompleto).length,
            marcasDisponibles: [...new Set(extintoresSegunFiltros("marca").map((e) => e.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
            agentesDisponibles: [...new Set(extintoresSegunFiltros("agente").map((e) => e.agenteExtintor).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
            pesosDisponibles: [...new Set(extintoresSegunFiltros("peso").filter((e) => e.peso).map((e) => `${e.peso} ${e.unidadPeso}`))],
            estadosDisponibles: [...new Set(extintoresSegunFiltros("estado").map((e) => e.estadoExtintor).filter(Boolean))],
            areasDisponibles: [...new Set(extintoresSegunFiltros("area").map((e) => (e.area || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
            extintoresOrdenados: sortExtintoresPersonalizado(extintoresFiltrados, weightOrder, estadoOrder, agenteOrder, extintores),
        };
    }, [extintores, search, fMarca, fAgente, fPeso, fEstado, fArea, soloIncompletos, weightOrder, estadoOrder, agenteOrder]);

    useEffect(() => {
        if (fMarca && !marcasDisponibles.includes(fMarca)) setFMarca("");
        if (fAgente && !agentesDisponibles.includes(fAgente)) setFAgente("");
        if (fPeso && !pesosDisponibles.includes(fPeso)) setFPeso("");
        if (fEstado && !estadosDisponibles.includes(fEstado)) setFEstado("");
        if (fArea && !areasDisponibles.includes(fArea)) setFArea("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extintores]);

    useEffect(() => {
        if (soloIncompletos && incompletosCount === 0) setSoloIncompletos(false);
    }, [soloIncompletos, incompletosCount]);

    return {
        search, setSearch,
        fMarca, setFMarca,
        fAgente, setFAgente,
        fPeso, setFPeso,
        fEstado, setFEstado,
        fArea, setFArea,
        areasDisponibles,
        soloIncompletos, setSoloIncompletos,
        incompletosCount,
        marcasDisponibles,
        agentesDisponibles,
        pesosDisponibles,
        estadosDisponibles,
        extintoresOrdenados,
    };
}
