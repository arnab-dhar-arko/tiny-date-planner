/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#24252b",
        canvas: "#f2f1f7",
        accent: "#c90055"
      }
    }
  },
  plugins: []
};
