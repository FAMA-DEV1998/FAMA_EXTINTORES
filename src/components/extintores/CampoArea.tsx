import { useId } from "react";

export const areasDe = (extintores: { area?: string; sedeId?: string | null }[], sedeId?: string | null) =>
  Array.from(new Set(extintores.filter((e) => sedeId === undefined || (e.sedeId ?? null) === (sedeId ?? null)).map((e) => (e.area || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

interface Props {
  value: string;
  onChange: (v: string) => void;
  sugerencias: string[];
  className?: string;
}

export default function CampoArea({ value, onChange, sugerencias, className }: Props) {
  const id = useId();
  return (
    <>
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        list={`${id}-areas`}
        placeholder="Opcional. Ej: TALLER ELÉCTRICO"
        autoComplete="off"
      />
      <datalist id={`${id}-areas`}>
        {sugerencias.map((a) => <option key={a} value={a} />)}
      </datalist>
    </>
  );
}
