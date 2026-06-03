import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Vodafone Brand Design System mappings
        brand: {
          50: "#fdf2f2",
          100: "#fde2e2",
          200: "#fca5a5",
          300: "#fca5a5",
          400: "#ef4444",
          500: "#e60000", // Vodafone Red
          600: "#cc0000", // Hover Red
          700: "#ac1811", // Deep Brand Red Shade
          800: "#8a120d",
          900: "#25282b", // Charcoal
          950: "#1e2022",
        },
        steel: {
          50: "#f2f2f2", // Light Neutral
          100: "#e5e5e5",
          200: "#d4d4d4",
          300: "#a3a3a3",
          400: "#737373",
          500: "#7e7e7e", // Secondary Body Grey
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#25282b", // Charcoal
          950: "#1e2022",
        },
        apex: {
          orange: '#e60000', // Vodafone Red
          blue: '#25282b', // Charcoal
        },
      },
      borderRadius: {
        lg: "var(--radius)", // 6px
        md: "calc(var(--radius) - 2px)", // 4px
        sm: "calc(var(--radius) - 4px)", // 2px
        // Vodafone Specific
        'button-tight': '2px',
        'card-vf': '6px',
        'asymmetric': '0px 6px 0px 0px',
        'glass-pill': '24px',
        'badge-pill': '32px',
        'cta-pill': '60px',
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
