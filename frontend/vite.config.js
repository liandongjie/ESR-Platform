/*
 * @Author: liandongjie
 * @Date: 2026-05-03 11:50:26
 * @LastEditors: liandongjie
 * @LastEditTime: 2026-05-03 15:19:55
 * @Description:
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            },
            '/static': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            },
            '/download': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            }
        }
    }
})
