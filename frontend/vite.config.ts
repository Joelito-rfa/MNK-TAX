import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5177,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        configure: (proxy) => {
          // Rendre visible la vraie cause d'un 502 : le backend n'écoute pas
          // encore (démarrage Spring Boot) ou s'est arrêté.
          proxy.on('error', (error) => {
            console.warn(
              `[proxy] ${API_PROXY_TARGET} injoignable (${error.message}). ` +
                'Démarrez le backend : cd backend && .\\mvnw.cmd spring-boot:run',
            )
          })
        },
      },
    },
  },
})
