// src/utils/format.ts
export function numberFormat(
  n: number | undefined | null,
  locale = "es-PE",
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }
) {
  return new Intl.NumberFormat(locale, options).format(n ?? 0);
}
