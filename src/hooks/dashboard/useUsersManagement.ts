import { useState } from "react";
import type { Socket } from "socket.io-client";

export function useUsersManagement(socket: Socket | null, role: string) {
  const [usersModal, setUsersModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({ username: "", password: "", displayName: "", role: "worker" as string });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState("");

  const openUsersModal = () => {
    if (!socket || role !== "boss") return;
    socket.emit("auth:users:list", { role }, (res: any) => {
      if (res?.success) setUsersList(res.users);
    });
    setUserForm({ username: "", password: "", displayName: "", role: "worker" });
    setEditingUserId(null);
    setUserError("");
    setUsersModal(true);
  };

  const saveUser = () => {
    if (!socket) return;
    setSavingUser(true);
    setUserError("");

    if (editingUserId) {
      socket.emit("auth:users:update", {
        role,
        userId: editingUserId,
        username: userForm.username || undefined,
        password: userForm.password || undefined,
        displayName: userForm.displayName || undefined,
        newRole: userForm.role as any,
      }, (res: any) => {
        setSavingUser(false);
        if (res?.success) {
          setEditingUserId(null);
          setUserForm({ username: "", password: "", displayName: "", role: "worker" });
          socket!.emit("auth:users:list", { role }, (r: any) => {
            if (r?.success) setUsersList(r.users);
          });
        } else setUserError(res?.error || "Error");
      });
    } else {
      if (!userForm.username || !userForm.password) { setSavingUser(false); setUserError("Usuario y contraseña requeridos"); return; }
      socket.emit("auth:users:create", {
        role,
        username: userForm.username,
        password: userForm.password,
        displayName: userForm.displayName,
        newRole: userForm.role as any,
      }, (res: any) => {
        setSavingUser(false);
        if (res?.success) {
          setUserForm({ username: "", password: "", displayName: "", role: "worker" });
          socket!.emit("auth:users:list", { role }, (r: any) => {
            if (r?.success) setUsersList(r.users);
          });
        } else setUserError(res?.error || "Error");
      });
    }
  };

  const deleteUser = (userId: string) => {
    if (!socket || !confirm("¿Eliminar este usuario?")) return;
    socket.emit("auth:users:delete", { role, userId }, (res: any) => {
      if (res?.success) {
        socket!.emit("auth:users:list", { role }, (r: any) => {
          if (r?.success) setUsersList(r.users);
        });
      }
    });
  };

  return {
    usersModal,
    setUsersModal,
    usersList,
    userForm,
    setUserForm,
    editingUserId,
    setEditingUserId,
    savingUser,
    userError,
    openUsersModal,
    saveUser,
    deleteUser,
  };
}