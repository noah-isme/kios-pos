/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables so runtime theming (dark mode / dynamic palettes) is respected
        'accent-amber-50': 'var(--accent-amber-50)',
        'accent-amber-100': 'var(--accent-amber-100)',
        'accent-amber-200': 'var(--accent-amber-200)',
        'accent-amber-700': 'var(--accent-amber-700)',
        'accent-sky-50': 'var(--accent-sky-50)',
        'accent-sky-100': 'var(--accent-sky-100)',
        'accent-sky-200': 'var(--accent-sky-200)',
        'accent-sky-700': 'var(--accent-sky-700)',
        'accent-emerald-50': 'var(--accent-emerald-50)',
        'accent-emerald-100': 'var(--accent-emerald-100)',
        'accent-emerald-200': 'var(--accent-emerald-200)',
        'accent-emerald-700': 'var(--accent-emerald-700)',
      },
      backgroundImage: {
        'accent-amber-gradient': 'linear-gradient(135deg, var(--tw-gradient-stops))',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 6s linear infinite',
      },
      boxShadow: {
        'card-lg': '0 10px 30px rgba(12,12,12,0.08)',
      },
      ringColor: {
        focus: '#4f46e5',
      },
    },
  },
  plugins: [],
};
