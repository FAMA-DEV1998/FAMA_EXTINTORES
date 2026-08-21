import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  useEmpresaSelection, useCustomOrders, useSedes,
  useExtintorForm, useEmpresaForm,
} from "../hooks/dashboard";
import { useEvidencia } from "../hooks/useEvidencia";
import { useCatalogLists } from "../hooks/useCatalogLists";
import { computeBaseMetrics } from "../utils/dashboardMetrics";
import type { Catalogs } from "../hooks/useSocket";

type ScopeValue = ReturnType<typeof useBuildScope>;
const EmpresaScopeContext = createContext<ScopeValue | null>(null);

function useBuildScope(socket: Socket | null, role: string, catalogs: Catalogs) {
  const catalogLists = useCatalogLists(catalogs);
  const [saving, setSaving] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [obsModal, setObsModal] = useState<string | null>(null);

  const empresaSelection = useEmpresaSelection(socket, (data) => customOrders.setFromEmpresaData(data));
  const { empresas, selectedEmpresa, extintores: extintoresRaw, loadingDetail, openEmpresa, goBack } = empresaSelection;

  const extintores = Array.from(new Map(extintoresRaw.map((e: any) => [e.uid, e])).values()) as typeof extintoresRaw;

  const { pesoCounts, estadoCounts } = computeBaseMetrics(extintores);

  const customOrders = useCustomOrders(socket, selectedEmpresa, extintores, pesoCounts, estadoCounts);

  const sedesHook = useSedes(socket, selectedEmpresa?.id);

  // Edición/archivado de la empresa activa (usado por EmpresaLayout)
  const empresaForm = useEmpresaForm(socket, role, selectedEmpresa, goBack, saving, setSaving);

  // Alta/edición/eliminación de extintores (usado por ExtintorInventoryPanel,
  // compartido entre la vista "Extintores" y la vista "Historial")
  const extintorForm = useExtintorForm(socket, role, selectedEmpresa, saving, setSaving);

  const evidencia = useEvidencia(socket);

  return {
    empresas, selectedEmpresa, extintores, loadingDetail, openEmpresa, goBack,
    customOrders, sedes: sedesHook, empresaForm, extintorForm, evidencia,
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