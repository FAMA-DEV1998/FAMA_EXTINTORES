import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { InventarioItem } from "../../types";

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

  const save = (onDone?: (ok: boolean, error?: string) => void) => {
    if (!socket || !editing) return;
    setSaving(true);
    socket.emit("inventario:save", editing, (res: any) => {
      setSaving(false);
      if (res?.success) {
        setModal(false);
        setEditing(null);
      }
      onDone?.(!!res?.success, res?.error);
    });
  };

  const remove = (id: string) => {
    if (!socket || !confirm("¿Archivar este producto? Podrás restaurarlo luego desde Archivados.")) return;
    socket.emit("inventario:delete", { id });
  };

  return { items, modal, setModal, editing, setEditing, saving, openCreate, openEdit, save, remove };
}