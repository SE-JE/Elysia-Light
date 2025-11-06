export const conversion = {

  // =============================>
  // ## Conversion: String formatter 
  // =============================>
  strSnake(value: string, delimiter: string = "_"): string {
    return value
      .replace(/\.?([A-Z]+)/g, (x, y) => delimiter + y.toLowerCase())
      .replace(new RegExp("^" + delimiter), "");
  },

  strSlug(value: string, delimiter: string = "-"): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, delimiter)
      .replace(new RegExp(`${delimiter}+$`), "")
      .replace(new RegExp(`^${delimiter}+`), "");
  },

  strCamel(value: string): string {
    return value
      .replace(/[-_](.)/g, (_, group1) => group1.toUpperCase())
      .replace(/^(.)/, (match) => match.toLowerCase());
  },

  strPascal(str: string): string {
    return str
      .replace(/[_\- ]+/g, " ")     
      .split(" ")     
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  },

  strPlural(value: string): string {
    const studly = value
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s+/g, "");

    return studly.endsWith("s") ? studly : studly + "s";
  },

  strSingular(value: string): string {
    return value
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s+/g, "");
  },
};
