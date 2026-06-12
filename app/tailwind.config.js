/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f5f3ee',
        paper: '#ffffff',
        ink: '#1d2127',
        line: '#e3ded2',
        staff: '#3a3f47',
        teal: '#1f6f6b',
        tealD: '#155551',
        amber: '#e8a33d',
        hl: '#ffd24a',
        dim: '#7a8088',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
