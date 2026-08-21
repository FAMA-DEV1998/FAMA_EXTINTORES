import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { EmpresaData } from "../../types";

export function useEmpresaForm(
  socket: Socket | null,
  role: string,
  selectedEmpresa: EmpresaData | null,
  goBack: () => void,
  saving: boolean,
  setSaving: (v: boolean) => void,
  onCreated?: (slug: string) => void
) {

  // Modal editar empresa
  const [editingEmpresa, setEditingEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState<EmpresaData | null>(null);

  // Archivar empresa
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
        goBack();
        socket.emit("empresa:list");
      }
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
        socket.emit("empresa:list");
        if (res.slug) onCreated?.(res.slug);
      }
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
        socket.emit("empresa:get", { id: empresaForm.id });
        socket.emit("empresa:list");
      }
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