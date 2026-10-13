type EmpresaComparable = { id: string; razonSocial: string; ruc?: string | null };

export type MotivoDuplicado = "ruc" | "nombre" | "parecido";

export type PosibleDuplicado = { id: string; razonSocial: string; motivo: MotivoDuplicado };

const SUFIJOS_LEGALES = new Set([
  "sac", "saa", "sa", "srl", "scrl", "eirl", "ltda", "sociedad", "anonima", "cerrada", "abierta",
  "empresa", "individual", "de", "responsabilidad", "limitada", "comercial",
]);

const SIMILITUD_MINIMA = 0.88;

export const normalizarRazonSocial = (texto: string): string => {
  const palabras = (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,'`´-]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  while (palabras.length > 1 && SUFIJOS_LEGALES.has(palabras[palabras.length - 1])) palabras.pop();
  return palabras.join(" ");
};

const distancia = (a: string, b: string): number => {
  if (a === b) return 0;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(actual[j - 1] + 1, previa[j] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = actual;
  }
  return previa[b.length];
};

const similitud = (a: string, b: string): number => {
  const mayor = Math.max(a.length, b.length);
  if (mayor === 0) return 1;
  if (Math.abs(a.length - b.length) / mayor > 1 - SIMILITUD_MINIMA) return 0;
  return 1 - distancia(a, b) / mayor;
};

const compararPar = (a: EmpresaComparable, b: EmpresaComparable, nombreA: string, nombreB: string): MotivoDuplicado | null => {
  const rucA = (a.ruc || "").trim();
  const rucB = (b.ruc || "").trim();
  if (rucA && rucA === rucB) return "ruc";
  if (!nombreA || !nombreB) return null;
  if (nombreA === nombreB) return "nombre";
  if (Math.min(nombreA.length, nombreB.length) >= 5 && similitud(nombreA, nombreB) >= SIMILITUD_MINIMA) return "parecido";
  return null;
};

export const detectarDuplicados = (empresas: EmpresaComparable[]): Map<string, PosibleDuplicado[]> => {
  const resultado = new Map<string, PosibleDuplicado[]>();
  const nombres = empresas.map((e) => normalizarRazonSocial(e.razonSocial));
  for (let i = 0; i < empresas.length; i++) {
    for (let j = i + 1; j < empresas.length; j++) {
      const motivo = compararPar(empresas[i], empresas[j], nombres[i], nombres[j]);
      if (!motivo) continue;
      const a = empresas[i];
      const b = empresas[j];
      resultado.set(a.id, [...(resultado.get(a.id) || []), { id: b.id, razonSocial: b.razonSocial, motivo }]);
      resultado.set(b.id, [...(resultado.get(b.id) || []), { id: a.id, razonSocial: a.razonSocial, motivo }]);
    }
  }
  return resultado;
};

export const buscarEmpresasParecidas = (
  candidata: { id?: string; razonSocial: string; ruc?: string | null },
  empresas: EmpresaComparable[],
): PosibleDuplicado[] => {
  const nombre = normalizarRazonSocial(candidata.razonSocial);
  const propia = { id: candidata.id || "", razonSocial: candidata.razonSocial, ruc: candidata.ruc };
  return empresas
    .filter((e) => e.id !== candidata.id)
    .map((e) => ({ e, motivo: compararPar(propia, e, nombre, normalizarRazonSocial(e.razonSocial)) }))
    .filter((x): x is { e: EmpresaComparable; motivo: MotivoDuplicado } => !!x.motivo)
    .map(({ e, motivo }) => ({ id: e.id, razonSocial: e.razonSocial, motivo }));
};

export const TEXTO_MOTIVO_DUPLICADO: Record<MotivoDuplicado, string> = {
  ruc: "mismo RUC/DNI",
  nombre: "mismo nombre",
  parecido: "nombre muy parecido",
};

export type OrdenEmpresas = "recientes" | "antiguas" | "az" | "za";

export const OPCIONES_ORDEN_EMPRESAS: { value: OrdenEmpresas; label: string }[] = [
  { value: "recientes", label: "Más recientes primero" },
  { value: "antiguas", label: "Más antiguas primero" },
  { value: "az", label: "Nombre A → Z" },
  { value: "za", label: "Nombre Z → A" },
];

export const ordenarEmpresas = <T extends { razonSocial: string }>(lista: T[], orden: OrdenEmpresas): T[] => {
  if (orden === "recientes") return lista;
  if (orden === "antiguas") return [...lista].reverse();
  const porNombre = [...lista].sort((a, b) => (a.razonSocial || "").localeCompare(b.razonSocial || "", "es", { sensitivity: "base" }));
  return orden === "az" ? porNombre : porNombre.reverse();
};
