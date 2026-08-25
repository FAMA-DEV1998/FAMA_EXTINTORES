const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DECENAS = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
const DECENAS_10 = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

const tresDigitos = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    const c = Math.floor(n / 100);
    const resto = n % 100;
    let texto = c > 0 ? CENTENAS[c] + " " : "";
    if (resto >= 10 && resto < 20) {
        texto += DECENAS[resto - 10];
    } else if (resto >= 20) {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        texto += DECENAS_10[d] + (u > 0 ? ` Y ${UNIDADES[u]}` : "");
    } else if (resto > 0) {
        texto += UNIDADES[resto];
    }
    return texto.trim();
};

const seisDigitos = (n: number): string => {
    if (n === 0) return "";
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    let texto = "";
    if (miles > 0) texto += (miles === 1 ? "MIL" : `${tresDigitos(miles)} MIL`) + " ";
    texto += tresDigitos(resto);
    return texto.trim();
};

const enteroALetras = (n: number): string => {
    if (n === 0) return "CERO";
    const millones = Math.floor(n / 1000000);
    const resto = n % 1000000;
    let texto = "";
    if (millones > 0) texto += (millones === 1 ? "UN MILLÓN" : `${seisDigitos(millones)} MILLONES`) + " ";
    texto += seisDigitos(resto);
    return texto.trim();
};

export const montoALetras = (monto: number): string => {
    const entero = Math.floor(monto);
    const centavos = Math.round((monto - entero) * 100);
    return `${enteroALetras(entero)} CON ${String(centavos).padStart(2, "0")}/100 SOLES`;
};
