/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        forest: '#2D4A3E',
        sage:   '#4A7C6A',
        cream:  '#F5F0E8',
        gold:   '#D4AF37',
        slate:  '#2C3E50',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
