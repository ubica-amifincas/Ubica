import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      // ami.html: la misma app con la cabecera de AMI Fincas (la sirve vercel.json en /ami-fincas)
      input: {
        main: path.resolve(__dirname, "index.html"),
        ami: path.resolve(__dirname, "ami.html"),
      },
    },
  },
})
