/**
 * Advanced parsing engine for Prompt IDE functionality.
 * Extracts dynamic placeholders and type-hints from prompt templates.
 */

/**
 * Scans and tokenizes text to identify variable placeholders
 * such as {{Name}}, {{Name:select:opt1,opt2}}, or [Name:number:1-10].
 */
class VariableParser {
  /**
   * Scans a string for unique variable patterns and returns an array of specification objects.
   * Supports both mustache {{}} and bracket [] syntax.
   */
  parse(content) {
    if (!content) return [];

    const mustacheRegex = /{{([^}]+)}}/g;
    const bracketRegex = /\[([^\]]+)\]/g;

    const matches = [
      ...content.matchAll(mustacheRegex),
      ...content.matchAll(bracketRegex),
    ];

    const variables = matches.map((match) => {
      const rawInner = match[1];
      const parts = rawInner.split(":");

      const label = parts[0].trim();
      const type = parts[1] ? parts[1].trim().toLowerCase() : "text";
      const optionsRaw = parts[2] ? parts[2].trim() : "";

      let options = {};
      if (type === "select") {
        options = { list: optionsRaw.split(",").map((o) => o.trim()) };
      } else if (type === "number") {
        const [min, max] = optionsRaw.split("-").map(Number);
        options = { min: min || 0, max: max || 100 };
      }

      return {
        original: match[0],
        label,
        type,
        options,
        value:
          type === "toggle"
            ? false
            : type === "number"
              ? options.min || 0
              : "",
      };
    });

    /**
     * Deduplicate variables based on their label to ensure
     * the UI only renders one input per unique variable.
     */
    return Array.from(new Map(variables.map((v) => [v.label, v])).values());
  }
}

module.exports = new VariableParser();
