// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // This is the correct plugin for Tailwind v4
    autoprefixer: {},
  },
}