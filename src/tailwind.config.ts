
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        navy: {
          DEFAULT: 'hsl(var(--navy))',
          hover: 'hsl(var(--navy-hover))',
        },
        'neutral-gray': {
          DEFAULT: 'hsl(var(--neutral-gray))',
          hover: 'hsl(var(--neutral-gray-hover))',
        },
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B69',
        },
        purple: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
          950: '#4C1D95',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        bronze: {
          50: '#FCF8F2',
          100: '#F8EBD9',
          200: '#F2D7B3',
          300: '#E9BE84',
          400: '#DEAA60',
          500: '#D09346',
          600: '#B67836',
          700: '#96602C',
          800: '#7C4D27',
          900: '#684122',
        },
        copper: {
          50: '#FEF3F0',
          100: '#FEE5DE',
          200: '#FDC2B1',
          300: '#FB9B82',
          400: '#F87C5A',
          500: '#F55F33',
          600: '#E93F1A',
          700: '#C43116',
          800: '#9F2918',
          900: '#832616',
        },
      },
      fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'Roboto',
					'"Helvetica Neue"',
					'Arial',
					'sans-serif',
				],
			},
      borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				'soft': '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
				'medium': '0 10px 40px -5px rgba(0, 0, 0, 0.1)',
        'luxury': '0 10px 25px -3px rgba(107, 33, 168, 0.1), 0 4px 10px -2px rgba(107, 33, 168, 0.05)',
        'gold': '0 10px 25px -3px rgba(217, 119, 6, 0.15), 0 4px 10px -2px rgba(217, 119, 6, 0.1)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
      backgroundImage: {
        'gradient-luxury': 'linear-gradient(to right, #8B5CF6, #D946EF)',
        'gradient-gold': 'linear-gradient(to right, #F59E0B, #D97706)',
        'gradient-copper': 'linear-gradient(to right, #F87C5A, #E93F1A)',
        'gradient-bronze': 'linear-gradient(to right, #DEAA60, #B67836)',
        'gradient-blue-purple': 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
        'pattern-dots': "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
