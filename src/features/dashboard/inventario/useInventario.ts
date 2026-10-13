import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import type { InventarioItem } from "../../../types";
import { confirmar } from "../../../components/ui/Notificaciones";

export function useInventario(socket: Socket | null) {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<InventarioItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onList = (list: InventarioItem[]) => setItems(list);
    socket.on("inventario:list", onList);
    socket.emit("inventario:list");

    return () => { socket.off("inventario:list", onList); };
  }, [socket]);

  const openCreate = () => {
    setEditing({ id: "", codigo: "", nombre: "", categoria: "", operacion: "Venta", precioTotal: 0, stock: 0, estado: "Disponible" });
    setModal(true);
  };

  const openEdit = (item: InventarioItem) => {
    setEditing(item);
    setModal(true);
  };

  const save = () => {
    if (!socket || !editing) return;
    const esNuevo = !editing.id;
    setSaving(true);
    socket.emit("inventario:save", editing, (res: any) => {
      setSaving(false);
      if (!res?.success) {
        toast.error(res?.error || "No se pudo guardar el producto");
        return;
      }
      setModal(false);
      setEditing(null);
      toast.success(esNuevo ? "Producto creado" : "Producto actualizado");
    });
  };

  const remove = async (id: string) => {
    if (!socket) return;
    const ok = await confirmar({ titulo: "¿Archivar este producto?", mensaje: "Podrás restaurarlo luego desde Archivados.", textoConfirmar: "Archivar", peligro: true });
    if (!ok) return;
    socket.emit("inventario:delete", { id }, (res: any) => {
      if (res?.success === false) toast.error(res?.error || "No se pudo archivar el producto");
      else toast.success("Producto archivado");
    });
  };

  return { items, modal, setModal, editing, setEditing, saving, openCreate, openEdit, save, remove };
}
