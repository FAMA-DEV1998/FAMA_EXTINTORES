import React from "react";
import { modalInput } from "../ui/ModalUI";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  usersList: any[];
  userForm: any;
  setUserForm: React.Dispatch<React.SetStateAction<any>>;
  editingUserId: string | null;
  setEditingUserId: React.Dispatch<React.SetStateAction<string | null>>;
  savingUser: boolean;
  userError: string;
  onSave: () => void;
  onDelete: (id: string) => void;
};

export default function UsersModal({
  isOpen, onClose, usersList, userForm, setUserForm,
  editingUserId, setEditingUserId, savingUser, userError, onSave, onDelete
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* CAMBIO UX: flex-col para independizar el header del scroll */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white">👥 Gestión de Usuarios</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
        </div>

        {/* CAMBIO UX: Contenedor que maneja el scroll internamente */}
        <div className="flex-1 overflow-y-auto">
          {/* Formulario crear/editar */}
          <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-950/30">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">
              {editingUserId ? "Editar Usuario" : "Nuevo Usuario"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Usuario</label>
                <input className={modalInput} value={userForm.username}
                  onChange={(e) => setUserForm((p: any) => ({ ...p, username: e.target.value }))}
                  placeholder="nombre de usuario" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {editingUserId ? "Nueva Contraseña (vacío = no cambiar)" : "Contraseña"}
                </label>
                <input type="password" className={modalInput} value={userForm.password}
                  onChange={(e) => setUserForm((p: any) => ({ ...p, password: e.target.value }))}
                  placeholder={editingUserId ? "Dejar vacío para no cambiar" : "Contraseña"} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Nombre para mostrar</label>
                <input className={modalInput} value={userForm.displayName}
                  onChange={(e) => setUserForm((p: any) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Nombre completo" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Rol</label>
                <select className={modalInput} value={userForm.role}
                  onChange={(e) => setUserForm((p: any) => ({ ...p, role: e.target.value }))}>
                  <option value="worker">Técnico — Aplicación móvil</option>
                  <option value="admin">Administrador — App + Panel de Control</option>
                </select>
              </div>
            </div>
            {userError && (
              <p className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2 mt-3">{userError}</p>
            )}
            <div className="flex gap-2 mt-3">
              {editingUserId && (
                <button onClick={() => { setEditingUserId(null); setUserForm({ username: "", password: "", displayName: "", role: "worker" }); }}
                  className="px-3 py-2 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cancelar edición
                </button>
              )}
              <button onClick={onSave} disabled={savingUser}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white disabled:opacity-50 transition-colors">
                {savingUser ? "Guardando..." : editingUserId ? "Actualizar" : "Crear Usuario"}
              </button>
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="px-6 py-4">
            <div className="divide-y divide-zinc-800/40">
              {usersList.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200">{u.displayName || u.username}</p>
                    <p className="text-[11px] text-zinc-500">@{u.username} · <span className={`font-bold ${u.role === "boss" ? "text-red-400" : u.role === "admin" ? "text-amber-400" : "text-zinc-400"}`}>{u.role}</span></p>
                  </div>
                  {u.role !== "boss" && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingUserId(u.id); setUserForm({ username: u.username, password: "", displayName: u.displayName, role: u.role }); }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-400 hover:text-white border border-zinc-700 transition-colors">
                        ✏️ Editar
                      </button>
                      <button onClick={() => onDelete(u.id)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-900 text-[11px] font-semibold text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-700 transition-colors">
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}