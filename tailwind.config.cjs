/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0b0f17",
        panel: "#131a26",
        panel2: "#1a2333",
        line: "#26314a",
        ink: "#e7ecf3",
        muted: "#8a97ad",
      },
    },
  },
  plugins: [],
};
