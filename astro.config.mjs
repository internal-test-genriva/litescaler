import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  output: 'static',

  adapter: node({
    mode: 'standalone'
  }),

  server: {
    port: 3000,
    host: true
  },

  integrations: [react()]
});