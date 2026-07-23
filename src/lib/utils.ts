import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compara dois itens pelo campo `ordem` (definido manualmente pelo professor).
 * Itens sem `ordem` numérico vão para o final. Em caso de empate, usa `desempate`
 * (ex.: data de publicação mais recente primeiro) ou mantém a ordem original.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compararPorOrdem(a: any, b: any, desempate?: (a: any, b: any) => number): number {
  const oa = typeof a?.ordem === "number" ? a.ordem : Number.POSITIVE_INFINITY;
  const ob = typeof b?.ordem === "number" ? b.ordem : Number.POSITIVE_INFINITY;
  if (oa !== ob) return oa - ob;
  return desempate ? desempate(a, b) : 0;
}
