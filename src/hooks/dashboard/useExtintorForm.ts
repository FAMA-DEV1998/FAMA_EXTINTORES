import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaData, Extintor } from "../../types";
import { emptyExtintor, estadoBloqueaServicio, estadoBloqueaServicioExtra } from "../../utils/helpers";


export function useExtintorForm(
  socket: Socket | null,
  role: string,
  selectedEmpresa: EmpresaData | null,
  saving: boolean,
  setSaving: (v: boolean) => void
) {
  const [extintorModal, setExtintorModal] = useState(false);
  const [extintorForm, setExtintorForm] = useState<Partial<Extintor>>(emptyExtintor());
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  const [lastSavedExtintor, setLastSavedExtintor] = useState<{ uid: string; isNew: boolean; estado: Record<string, any> } | null>(null);
  const clearLastSavedExtintor = () => setLastSavedExtintor(null);

  const openAddExtintor = () => {
    setExtintorForm(emptyExtintor());
    setEditingRowIndex(null);
    setExtintorModal(true);
  };

  const openEditExtintor = (ext: Extintor) => {
    setExtintorForm({ ...ext });
    setEditingRowIndex(ext.rowIndex);
    setExtintorModal(true);
  };

  const saveExtintor = () => {
    if (!socket || !selectedEmpresa?.id) return;
    setSaving(true);

    const { evidencia, evidenciaCount, deletedAt, ...formSinFlags } = extintorForm as any;
    const bloqueado = estadoBloqueaServicio(extintorForm.estadoExtintor || "");

    const payload = {
      ...formSinFlags,
      id: selectedEmpresa.id,
      nSerie: !extintorForm.nSerie || extintorForm.nSerie.trim() === "" ? "S/N" : extintorForm.nSerie.trim().toUpperCase(),
      nInterno: !extintorForm.nInterno || extintorForm.nInterno.trim() === "" ? "S/TAG" : extintorForm.nInterno.trim().toUpperCase(),
      ma: bloqueado ? "" : extintorForm.ma,
      ph: bloqueado ? "" : extintorForm.ph,
      recarga: bloqueado ? "" : extintorForm.recarga,
      servicioExtra: estadoBloqueaServicioExtra(extintorForm.estadoExtintor || "") ? "" : extintorForm.servicioExtra,
    };

    const estadoSnapshot = {
      estadoExtintor: payload.estadoExtintor,
      realizadoPH: payload.realizadoPH,
      vencimPH: payload.vencimPH,
      ma: payload.ma,
      ph: payload.ph,
      recarga: payload.recarga,
      valvula: payload.valvula,
      manguera: payload.manguera,
      manometro: payload.manometro,
      tobera: payload.tobera,
      observaciones: payload.observaciones,
      servicioExtra: payload.servicioExtra,
      motivoBaja: payload.motivoBaja,
    };

    if (editingRowIndex !== null) {
      socket.emit("extintor:update", { ...payload, rowIndex: editingRowIndex }, (res: any) => {
        setSaving(false);
        if (res?.success) {
          setExtintorModal(false);
          if (extintorForm.uid) setLastSavedExtintor({ uid: extintorForm.uid, isNew: false, estado: estadoSnapshot });
        }
        else alert(res?.error || "No se pudo actualizar el extintor");
      });
    } else {
      socket.emit("extintor:add", payload, (res: any) => {
        setSaving(false);
        if (res?.success) {
          setExtintorModal(false);
          if (res.uid) setLastSavedExtintor({ uid: res.uid, isNew: true, estado: estadoSnapshot });
        }
        else alert(res?.error || "No se pudo guardar el extintor");
      });
    }
  };

  const deleteExtintor = (rowIndex: number) => {
    if (!socket || !selectedEmpresa?.id || !confirm("¿Eliminar este extintor?")) return;
    socket.emit("extintor:delete", { id: selectedEmpresa.id, rowIndex, role });
  };

  const restoreEstado = (rowIndex: number, estado: Record<string, any>) => {
    if (!socket) return;
    socket.emit("extintor:update", { ...estado, rowIndex });
  };

  return {
    extintorModal,
    setExtintorModal,
    extintorForm,
    setExtintorForm,
    editingRowIndex,
    saving,
    lastSavedExtintor,
    clearLastSavedExtintor,
    openAddExtintor,
    openEditExtintor,
    saveExtintor,
    deleteExtintor,
    restoreEstado,
  };
}