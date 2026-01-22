/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        melodizrOrange: "#F97316",
        melodizrOrangePress: "#E67E00",
        dark1: "#171719",
        dark2: "#1E1E1E",
        dark3: "#2C2C2C",
        grayText: "#888888",
        light1: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
