/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        tight: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        logo: ["'Abril Fatface'", "cursive", "serif"],
      },
      colors: {
        navy: {
          900: '#172033',
          950: '#0F172A',
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        app: {
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          'surface-subtle': '#F9FAFB',
        },
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#E5E7EB',
          strong: '#D0D5DD',
        },
        txt: {
          primary: '#111827',
          secondary: '#667085',
          muted: '#98A2B3',
          disabled: '#D0D5DD',
        },
        semantic: {
          success: '#12B76A',
          'success-bg': '#ECFDF3',
          'success-border': '#A6F4C5',
          warning: '#F79009',
          'warning-bg': '#FFFAEB',
          'warning-border': '#FEDF89',
          danger: '#F04438',
          'danger-bg': '#FEF3F2',
          'danger-border': '#FECDCA',
          info: '#2E90FA',
          'info-bg': '#EFF8FF',
          'info-border': '#B2DDFF',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '12px',
        '2xl': '12px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(16, 24, 40, 0.05)',
        sm: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
        md: '0 4px 8px -2px rgba(16, 24, 40, 0.06), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        lg: '0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)',
      },
    },
  },
  plugins: [],
};
