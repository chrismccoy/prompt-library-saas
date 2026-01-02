/**
 * Parsing prompt templates and generating downloadable assets
 */

class ExporterService {
  /**
   * Injects user-provided variables into a prompt template and generates a UTF-8 buffer.
   */
  generateTextBuffer(prompt, variables = null) {
    let content = prompt.content.trim();

    if (variables) {
      try {
        const varList =
          typeof variables === "string" ? JSON.parse(variables) : variables;

        varList.forEach((v) => {
          if (!v.value || v.value.trim() === "") {
            return;
          }

          // Case-insensitive replacement for both Mustache and Bracket styles
          const regexMustache = new RegExp(`{{${v.label}}}`, "gi");
          const regexBracket = new RegExp(`\\[${v.label}\\]`, "gi");

          content = content
            .replace(regexMustache, v.value.trim())
            .replace(regexBracket, v.value.trim());
        });
      } catch (e) {
        /** Fallback to raw content if variable parsing fails */
      }
    }

    return Buffer.from(content, "utf-8");
  }
}

module.exports = new ExporterService();
