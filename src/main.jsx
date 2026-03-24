import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{
          style: { background:'#1c2434', color:'#e6edf3', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', fontSize:'14px' }
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
