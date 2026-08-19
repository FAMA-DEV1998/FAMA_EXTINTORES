import { useState } from "react";
import type { Socket } from "socket.io-client";
import type { Extintor } from "../types";

export function useEvidencia(socket: Socket | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [extInfo, setExtInfo] = useState<string>("");
  const [activeIdx, setActiveIdx] = useState(0);

  const open = (ext: Extintor) => {
    if (!socket || ext.evidencia !== "__HAS_EVIDENCIA__") return;
    setLoading(true);
    setList([]);
    setActiveIdx(0);
    setExtInfo(`${ext.nSerie || "S-N"}_${ext.marca || ""}`);
    setIsOpen(true);
    socket.emit("extintor:evidencia:get", { rowIndex: ext.rowIndex }, (res: any) => {
      setLoading(false);
      if (res?.success && res.evidencia) {
        try {
          const arr = JSON.parse(res.evidencia);
          setList(Array.isArray(arr) ? arr : []);
        } catch {
          if (res.evidencia && res.evidencia !== "[]") {
            setList([res.evidencia]);
          }
        }
      }
    });
  };

  const close = () => {
    setIsOpen(false);
    setList([]);
  };

  return { isOpen, list, loading, extInfo, activeIdx, setActiveIdx, open, close };
}