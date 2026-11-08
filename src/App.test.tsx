import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderApp(path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('menampilkan beranda peserta', () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: /quiz maker/i })).toBeInTheDocument()
    expect(screen.getByText(/masukkan 6 huruf kode/i)).toBeInTheDocument()
  })

  it('menampilkan halaman tidak ditemukan', () => {
    renderApp('/alamat-tidak-ada')

    expect(screen.getByRole('heading', { name: /halaman tidak ditemukan/i })).toBeInTheDocument()
  })
})
