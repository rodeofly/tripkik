/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./script.js"], // IMPORTANT: Ajouter script.js pour que Tailwind purge aussi le JS
  theme: {
    extend: {
      colors: {
        'reunion-blue': '#0077B6',   /* Bleu Océan */
        'reunion-yellow': '#FFC107', /* Jaune Soleil */
        'reunion-red': '#D80000',    /* Rouge Volcan */
        'reunion-green': '#28A745',  /* Vert Nature */
      }
    },
  },
  plugins: [],
}