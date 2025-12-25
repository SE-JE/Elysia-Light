export const conversion = {

  // =============================>
  // ## Conversion: String formatter 
  // =============================>
  strSnake(value: string, delimiter: string = "_"): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-\s]+/g, delimiter)
    .toLowerCase()
    .replace(new RegExp(`^${delimiter}+|${delimiter}+$`, "g"), "")
    .replace(new RegExp(`${delimiter}{2,}`, "g"), delimiter)
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
    const match = value.match(/^(.*?)([A-Za-z]+)$/)
    if (!match) return value

    const [, prefix, word] = match

    if (
      word.endsWith("y") &&
      !/[aeiou]y$/i.test(word)
    ) {
      return prefix + word.slice(0, -1) + "ies"
    }

    if (!word.endsWith("s")) return prefix + word + "s"

    return value
  },


  strSingular(value: string): string {
    return value
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s+/g, "");
  },
};
