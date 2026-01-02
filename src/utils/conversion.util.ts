export const conversion = {

  // =============================>
  // ## Conversion: String formatter 
  // =============================>
  strSnake(value: string, delimiter: string = "_"): string {
    return toWords(value).join(delimiter)
  },

  strSlug(value: string, delimiter: string = "-"): string {
    return toWords(value).join(delimiter);
  },

  strCamel(value: string): string {
    return toWords(value).map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join("");
  },

  strPascal(value: string): string {
    return toWords(value).map(w => w[0].toUpperCase() + w.slice(1)).join("");
  },

  strPlural(value: string): string {
    const match = value.match(/^(.*?)([A-Za-z]+)$/)
    if (!match) return value

    const [, prefix, word] = match

    if (word.endsWith("y") && !/[aeiou]y$/i.test(word)) {
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



function toWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
}