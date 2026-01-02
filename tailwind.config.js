/**
 * Tailwind CSS Framework configuration.
 */

/**
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],

  theme: {
    extend: {
    },
  },

  plugins: [
    /**
     * Markdown and other dynamic HTML content.
     */
    require("@tailwindcss/typography"),

    /**
     * Standardizes form element resets across different
     * browser engines for consistent UI input behavior.
     */
    require("@tailwindcss/forms"),
  ],
};
