/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        card: '#111111',
        text: '#FFFFFF',
        'text-muted': '#888888',
        like: '#00FF88',
        pass: '#FF4458',
        superlike: '#00D4FF',
        accent: '#FF1493',
      },
      fontFamily: {
        system: ['System'],
      },
    },
  },
  plugins: [],
};
