import { useEffect, useState } from "react";
import type { EmpresaData, Extintor } from "../../types";
import { esExtintorIncompleto, sortExtintoresPersonalizado } from "../../utils/helpers";

export function useExtintorFilters(extintores: Extintor[], empresa: EmpresaData, variant: "todos" | "servicio" = "todos") {
    const [search, setSearch] = useState("");
    const [fMarca, setFMarca] = useState("");
    const [fAgente, setFAgente] = useState("");
    const [fPeso, setFPeso] = useState("");
    const [fEstado, setFEstado] = useState("");
    const [soloIncompletos, setSoloIncompletos] = useState(false);

    const extintoresSegunFiltros = (excluir?: "marca" | "agente" | "peso" | "estado") => {
        return extintores.filter((e) => {
            if (excluir !== "marca" && fMarca && (e.marca || "") !== fMarca) return false;
            if (excluir !== "agente" && fAgente && (e.agenteExtintor || "") !== fAgente) return false;
            if (excluir !== "peso" && fPeso && (e.peso ? `${e.peso} ${e.unidadPeso}` : "") !== fPeso) return false;
            if (excluir !== "estado" && fEstado && (e.estadoExtintor || "") !== fEstado) return false;
            if (soloIncompletos && !esExtintorIncompleto(e)) return false;
            return true;
        });
    };

    const incompletosCount = extintores.filter(esExtintorIncompleto).length;

    const marcasDisponibles = [...new Set(extintoresSegunFiltros("marca").map((e) => e.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const agentesDisponibles = [...new Set(extintoresSegunFiltros("agente").map((e) => e.agenteExtintor).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const pesosDisponibles = [...new Set(extintoresSegunFiltros("peso").filter((e) => e.peso).map((e) => `${e.peso} ${e.unidadPeso}`))];
    const estadosDisponibles = [...new Set(extintoresSegunFiltros("estado").map((e) => e.estadoExtintor).filter(Boolean))];

    useEffect(() => {
        if (fMarca && !marcasDisponibles.includes(fMarca)) setFMarca("");
        if (fAgente && !agentesDisponibles.includes(fAgente)) setFAgente("");
        if (fPeso && !pesosDisponibles.includes(fPeso)) setFPeso("");
        if (fEstado && !estadosDisponibles.includes(fEstado)) setFEstado("");
    }, [extintores]);

    const extintoresFiltrados = extintoresSegunFiltros().filter((ext) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (ext.nSerie || "").toLowerCase().includes(q) || (ext.nInterno || "").toLowerCase().includes(q);
    });

    const weightOrder = variant === "servicio" ? empresa.servicioWeightOrder : empresa.weightOrder;
    const estadoOrder = variant === "servicio" ? empresa.servicioEstadoOrder : empresa.estadoOrder;
    const agenteOrder = variant === "servicio" ? empresa.servicioAgenteOrder : empresa.agenteOrder;

    const extintoresOrdenados = sortExtintoresPersonalizado(
        extintoresFiltrados,
        weightOrder,
        estadoOrder,
        agenteOrder,
        extintores
    );

    return {
        search, setSearch,
        fMarca, setFMarca,
        fAgente, setFAgente,
        fPeso, setFPeso,
        fEstado, setFEstado,
        soloIncompletos, setSoloIncompletos,
        incompletosCount,
        marcasDisponibles,
        agentesDisponibles,
        pesosDisponibles,
        estadosDisponibles,
        extintoresOrdenados,
    };
}