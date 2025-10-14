/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        white: '#ffffff',
        'off-white': '#F7F8FA',
        primary: '#2563EB',
        success: '#16A34A',
        // Keep old accent variables for backward compat
        'accent-amber-50': 'var(--accent-amber-50)',
        'accent-amber-100': 'var(--accent-amber-100)',
        'accent-amber-200': 'var(--accent-amber-200)',
        'accent-amber-700': 'var(--accent-amber-700)',
      },
      backgroundImage: {
        'accent-amber-gradient': 'linear-gradient(135deg, var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'ui-sans-serif', 'system-ui'],
      },
      gridTemplateColumns: {
        // 12 column layout
        '12': 'repeat(12, minmax(0, 1fr))',
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
