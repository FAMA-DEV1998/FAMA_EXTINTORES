import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { Socket } from "socket.io-client";
import { useEmpresaSeleccionada } from "./useEmpresaSeleccionada";
import { useOrdenPersonalizado } from "../extintores/useOrdenPersonalizado";
import { useSedes } from "../../../hooks/useSedes";
import { useExtintorModalForm } from "../extintores/useExtintorModalForm";
import { useEmpresaForm } from "./useEmpresaForm";
import { useEvidencia } from "../../../hooks/useEvidencia";
import { useListasCatalogo } from "../../../hooks/useListasCatalogo";
import { computeBaseMetrics } from "../../../utils/metricasExtintores";
import type { Catalogs } from "../../../hooks/useSocket";

type ScopeValue = ReturnType<typeof useBuildScope>;
const EmpresaScopeContext = createContext<ScopeValue | null>(null);

function useBuildScope(socket: Socket | null, role: string, catalogs: Catalogs) {
  const catalogLists = useListasCatalogo(catalogs);
  const [saving, setSaving] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [obsModal, setObsModal] = useState<string | null>(null);
  const navigate = useNavigate();

  const empresaSelection = useEmpresaSeleccionada(socket, (data) => {
    customOrders.setFromEmpresaData(data);
    customOrdersServicio.setFromEmpresaData(data);
  });
  const { empresas, selectedEmpresa, extintores: extintoresRaw, loadingDetail, openEmpresa, goBack } = empresaSelection;

  const extintores = Array.from(new Map(extintoresRaw.map((e: any) => [e.uid, e])).values()) as typeof extintoresRaw;

  const { pesoCounts, estadoCounts } = computeBaseMetrics(extintores);

  const customOrders = useOrdenPersonalizado(socket, selectedEmpresa, extintores, pesoCounts, estadoCounts, "todos");
  const customOrdersServicio = useOrdenPersonalizado(socket, selectedEmpresa, extintores, pesoCounts, estadoCounts, "servicio");

  const sedesHook = useSedes(socket, selectedEmpresa?.id);

  const salirAlDirectorio = () => {
    goBack();
    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    if (!selectedEmpresa?.id || empresas.length === 0) return;
    if (!empresas.some((e) => e.id === selectedEmpresa.id)) {
      toast("Esta empresa fue archivada", { id: "empresa-archivada" });
      salirAlDirectorio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresas, selectedEmpresa?.id]);

  const empresaForm = useEmpresaForm(socket, role, selectedEmpresa, salirAlDirectorio, saving, setSaving);

  const extintorForm = useExtintorModalForm(socket, role, selectedEmpresa, saving, setSaving);

  const evidencia = useEvidencia(socket);

  return {
    empresas, selectedEmpresa, extintores, loadingDetail, openEmpresa, goBack,
    customOrders, customOrdersServicio, sedes: sedesHook, empresaForm, extintorForm, evidencia,
    saving, setSaving, showMetrics, setShowMetrics, obsModal, setObsModal,
    catalogLists, socket, role,
  };
}

export function EmpresaScopeProvider({ socket, role, catalogs, children }: { socket: Socket | null; role: string; catalogs: Catalogs; children: React.ReactNode }) {
  const { empresaSlug, sedeSlug } = useParams<{ empresaSlug: string; sedeSlug?: string }>();
  const scope = useBuildScope(socket, role, catalogs);
  const [empresaNoEncontrada, setEmpresaNoEncontrada] = useState(false);

  useEffect(() => {
    if (!socket || !empresaSlug) return;
    setEmpresaNoEncontrada(false);
    socket.emit("empresa:getBySlug", { slug: empresaSlug }, (res: any) => {
      if (res?.success) scope.openEmpresa({ id: res.id } as any);
      else setEmpresaNoEncontrada(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, empresaSlug]);

  const activeSede = sedeSlug ? scope.sedes.sedes.find((s) => s.slug === sedeSlug) || null : null;
  const extintoresDelAmbito = useMemo(
    () => (activeSede ? scope.extintores.filter((e) => e.sedeId === activeSede.id) : scope.extintores),
    [scope.extintores, activeSede?.id],
  );

  useEffect(() => {
    if (!socket || !scope.selectedEmpresa?.id) return;
    const pedir = () => socket.emit("extintor:list", { id: scope.selectedEmpresa!.id });
    pedir();
    socket.on("connect", pedir);
    return () => { socket.off("connect", pedir); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, scope.selectedEmpresa?.id]);

  return (
    <EmpresaScopeContext.Provider value={{ ...scope, extintores: extintoresDelAmbito, extintoresEmpresa: scope.extintores, activeSede, empresaNoEncontrada } as any}>
      {children}
    </EmpresaScopeContext.Provider>
  );
}

export function useEmpresaScope() {
  const ctx = useContext(EmpresaScopeContext);
  if (!ctx) throw new Error("useEmpresaScope debe usarse dentro de EmpresaScopeProvider");
  return ctx;
}
