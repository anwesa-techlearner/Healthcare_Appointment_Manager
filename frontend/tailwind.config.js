/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Urgency badge colors (SPEC §8.8)
        urgency: {
          low: '#22c55e',    // green-500
          medium: '#f59e0b', // amber-500
          high: '#ef4444',   // red-500
          unknown: '#94a3b8', // slate-400
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
