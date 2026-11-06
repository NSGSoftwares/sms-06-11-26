export const splitProducts = (value: string): string[] =>
  value && value !== "-"
    ? [...new Set(value.split(",").map((product) => product.trim()).filter(Boolean))]
    : [];

export const joinProducts = (products: string[]): string =>
  [...new Set(products.map((product) => product.trim()).filter(Boolean))].join(", ");
