/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
      },
      colors: {
        'white': '#FFFFFF',
        'black': '#03090A',
        'gray-light': '#F2F3F3',
        'gray-border': '#E6E6E6',
        'gray-dark': '#4F5354',
        primary: {
          DEFAULT: '#03090A',
          hover: '#4F5354',
        },
      },
    },
  },
  plugins: [],
}
