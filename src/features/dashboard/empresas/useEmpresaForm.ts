import { useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import type { EmpresaData } from "../../../types";

export function useEmpresaForm(
  socket: Socket | null,
  role: string,
  selectedEmpresa: EmpresaData | null,
  goBack: () => void,
  saving: boolean,
  setSaving: (v: boolean) => void,
  onCreated?: (slug: string) => void
) {

  const [editingEmpresa, setEditingEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState<EmpresaData | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [createEmpresaModal, setCreateEmpresaModal] = useState(false);

  const handleDeleteEmpresa = () => {
    if (!socket || !selectedEmpresa?.id) return;
    setSaving(true);
    socket.emit("empresa:delete", { id: selectedEmpresa.id, role }, (res: any) => {
      setSaving(false);
      setDeleteModal(false);
      setDeleteConfirmText("");
      if (res?.success) {
        toast.success("Empresa archivada. Puedes restaurarla desde Archivados.", { id: "empresa-archivada" });
        goBack();
        socket.emit("empresa:list");
      } else toast.error(res?.error || "No se pudo archivar la empresa");
    });
  };

  const openCreateEmpresa = () => {
    setEmpresaForm({
      razonSocial: "", direccion: "", distrito: "", ruc: "",
      nombresApellidos: "", celular: "", nOrdenTrabajo: "",
      fechaRetiro: "", fechaEntrega: "",
    });
    setCreateEmpresaModal(true);
  };

  const saveNewEmpresa = () => {
    if (!socket || !empresaForm) return;
    setSaving(true);
    socket.emit("empresa:save", empresaForm, (res: any) => {
      setSaving(false);
      if (res?.success) {
        setCreateEmpresaModal(false);
        toast.success("Empresa registrada");
        socket.emit("empresa:list");
        if (res.slug) onCreated?.(res.slug);
      } else toast.error(res?.error || "No se pudo registrar la empresa");
    });
  };

  const openEditEmpresa = () => {
    if (!selectedEmpresa) return;
    setEmpresaForm({ ...selectedEmpresa });
    setEditingEmpresa(true);
  };

  const saveEmpresa = () => {
    if (!socket || !empresaForm) return;
    setSaving(true);
    socket.emit("empresa:save", empresaForm, (res: any) => {
      setSaving(false);
      if (res?.success) {
        setEditingEmpresa(false);
        toast.success("Datos de la empresa actualizados");
        socket.emit("empresa:get", { id: empresaForm.id });
        socket.emit("empresa:list");
      } else toast.error(res?.error || "No se pudieron guardar los cambios");
    });
  };

  return {
    editingEmpresa,
    setEditingEmpresa,
    empresaForm,
    setEmpresaForm,
    deleteModal,
    setDeleteModal,
    deleteConfirmText,
    setDeleteConfirmText,
    createEmpresaModal,
    setCreateEmpresaModal,
    saving,
    handleDeleteEmpresa,
    openCreateEmpresa,
    saveNewEmpresa,
    openEditEmpresa,
    saveEmpresa,
  };
}
