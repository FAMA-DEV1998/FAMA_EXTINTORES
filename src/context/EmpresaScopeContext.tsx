import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  useEmpresaSelection, useCustomOrders, useSedes,
  useExtintorForm, useDashboardFilters, useEmpresaForm,
} from "../hooks/dashboard";
import { useEvidencia } from "../hooks/useEvidencia";
import { useCatalogLists } from "../hooks/useCatalogLists";
import { computeBaseMetrics, getDuplicateSets, getPesoEntriesWithAgents } from "../utils/dashboardMetrics";
import type { Catalogs } from "../hooks/useSocket";

type ScopeValue = ReturnType<typeof useBuildScope>;
const EmpresaScopeContext = createContext<ScopeValue | null>(null);

function useBuildScope(socket: Socket | null, role: string, catalogs: Catalogs) {
  const catalogLists = useCatalogLists(catalogs);
  const [saving, setSaving] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [obsModal, setObsModal] = useState<string | null>(null);

  const empresaSelection = useEmpresaSelection(socket, (data) => customOrders.setFromEmpresaData(data));
  const { empresas, selectedEmpresa, extintores, loadingDetail, openEmpresa, goBack } = empresaSelection;

  const metrics = computeBaseMetrics(extintores);
  const dupes = getDuplicateSets(extintores);

  const customOrders = useCustomOrders(socket, selectedEmpresa, extintores, metrics.pesoCounts, metrics.estadoCounts);
  const pesoEntriesWithAgents = getPesoEntriesWithAgents(metrics.pesoCounts, metrics.pesoAgentBreakdown, customOrders.customWeightOrder);

  const sedesHook = useSedes(socket, selectedEmpresa?.id);

  // Edición/archivado de la empresa activa (usado por EmpresaLayout)
  const empresaForm = useEmpresaForm(socket, role, selectedEmpresa, goBack, saving, setSaving);

  // Alta/edición/eliminación de extintores (usado por ExtintorInventoryPanel,
  // compartido entre la vista "Extintores" y la vista "Historial")
  const extintorForm = useExtintorForm(socket, role, selectedEmpresa, saving, setSaving);

  // Filtros de la tabla de extintores (reutiliza el mismo hook que ya usaba
  // el Dashboard monolítico; el listado de empresas no aplica aquí)
  const filters = useDashboardFilters([], extintores, customOrders.customWeightOrder, customOrders.customEstadoOrder, customOrders.customAgenteOrder);

  const evidencia = useEvidencia(socket);

  return {
    empresas, selectedEmpresa, extintores, loadingDetail, openEmpresa, goBack,
    ...metrics, ...dupes, pesoEntriesWithAgents,
    customOrders, sedes: sedesHook, empresaForm, extintorForm, filters, evidencia,
    saving, setSaving, showMetrics, setShowMetrics, obsModal, setObsModal,
    catalogLists, socket, role,
  };
}

export function EmpresaScopeProvider({ socket, role, catalogs, children }: { socket: Socket | null; role: string; catalogs: Catalogs; children: React.ReactNode }) {
  const { empresaSlug, sedeSlug } = useParams<{ empresaSlug: string; sedeSlug?: string }>();
  const scope = useBuildScope(socket, role, catalogs);

  useEffect(() => {
    if (!socket || !empresaSlug) return;
    socket.emit("empresa:getBySlug", { slug: empresaSlug }, (res: any) => {
      if (res?.success) scope.openEmpresa({ id: res.id } as any);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, empresaSlug]);

  const activeSede = sedeSlug ? scope.sedes.sedes.find((s) => s.slug === sedeSlug) || null : null;

  // Vuelve a pedir la lista de extintores filtrada por sede cada vez que
  // cambia la sede activa (o al quitarla, para volver a ver el total).
  useEffect(() => {
    if (!socket || !scope.selectedEmpresa?.id) return;
    socket.emit("extintor:list", {
      id: scope.selectedEmpresa.id,
      ...(activeSede ? { sedeId: activeSede.id } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, scope.selectedEmpresa?.id, activeSede?.id]);

  return (
    <EmpresaScopeContext.Provider value={{ ...scope, activeSede } as any}>
      {children}
    </EmpresaScopeContext.Provider>
  );
}

export function useEmpresaScope() {
  const ctx = useContext(EmpresaScopeContext);
  if (!ctx) throw new Error("useEmpresaScope debe usarse dentro de EmpresaScopeProvider");
  return ctx;
}