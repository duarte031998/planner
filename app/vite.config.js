import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona en cualquier carpeta (GitHub Pages, Netlify, etc.).
export default defineConfig({ base: './', plugins: [react()] });
