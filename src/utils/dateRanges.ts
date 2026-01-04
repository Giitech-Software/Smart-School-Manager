//mobile/src/utils/dateRanges.ts
export function getMonthRange(year: number, monthIndex: number) {
  // monthIndex: 0 = Jan, 11 = Dec
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 0);

  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    fromIso: toIso(from),
    toIso: toIso(to),
    label: from.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}
