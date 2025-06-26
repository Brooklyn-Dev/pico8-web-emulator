export const arrayEquals = (a, b) => a.length === b.length && a.every((val, i) => val === b[i]);
