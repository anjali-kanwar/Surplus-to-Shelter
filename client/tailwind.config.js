/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        emerald: {
          600: '#1F7A4D',
          700: '#18643e',
          800: '#134e30',
        },
        primary: {
          DEFAULT: '#1F7A4D',
          hover: '#18643e',
          light: '#E8F5EE',
        },
        charcoal: {
          DEFAULT: '#1F2937',
          muted: '#4B5563',
          light: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
