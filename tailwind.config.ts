
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
      fontSize: {
        xs: ['14px', { lineHeight: '20px' }],
        sm: ['15px', { lineHeight: '22px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }],
        '3xl': ['24px', { lineHeight: '36px' }],
      },
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
        // Colores personalizados para la nueva UI accesible
        luxury: {
          white: '#FFFFFF', // Pure white background
          gray: '#FAF9F6', // Warm white background
          beige: '#F5EEE7', // Luxury beige for cards
          navy: '#5C504A', // Soft black for text and icons
          'gray-dark': '#867E76', // Text secondary
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
				sm: 'calc(var(--radius) - 4px)',
        xl: '0.75rem', // 12px
        '2xl': '1rem', // 16px
			},
			boxShadow: {
				'soft': '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
				'medium': '0 10px 40px -5px rgba(0, 0, 0, 0.1)',
        'luxury': '0 8px 20px -4px rgba(92, 80, 74, 0.08)'
			},
      minHeight: {
        '12': '3rem', // 48px para áreas de toque
      },
      minWidth: {
        '12': '3rem', // 48px para áreas de toque
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
				},
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'scale-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          }
        }
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out'
			},
      spacing: {
        '18': '4.5rem', // 72px
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
