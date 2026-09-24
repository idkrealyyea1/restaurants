/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f8f0df',
        ink: '#1f3439',
        coral: '#ed6b4c',
        'coral-dark': '#c73d18',
        sun: '#f5c84b',
        teal: '#27615f',
        'teal-light': '#dce8df',
      },
      fontFamily: {
        display: ['IBM Plex Sans Arabic', 'Cairo', 'sans-serif'],
        sans: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
