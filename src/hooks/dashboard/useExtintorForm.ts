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

    if (editingRowIndex !== null) {
      socket.emit("extintor:update", { ...payload, rowIndex: editingRowIndex }, (res: any) => {
        setSaving(false);
        if (res?.success) setExtintorModal(false);
        else alert(res?.error || "No se pudo actualizar el extintor");
      });
    } else {
      socket.emit("extintor:add", payload, (res: any) => {
        setSaving(false);
        if (res?.success) setExtintorModal(false);
        else alert(res?.error || "No se pudo guardar el extintor");
      });
    }
  };

  const deleteExtintor = (rowIndex: number) => {
    if (!socket || !selectedEmpresa?.id || !confirm("¿Eliminar este extintor?")) return;
    socket.emit("extintor:delete", { id: selectedEmpresa.id, rowIndex, role });
  };

  return {
    extintorModal,
    setExtintorModal,
    extintorForm,
    setExtintorForm,
    editingRowIndex,
    saving,
    openAddExtintor,
    openEditExtintor,
    saveExtintor,
    deleteExtintor,
  };
}