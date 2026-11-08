import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { id } from '@/i18n/id'
import { PlayerHomePage } from './PlayerHomePage'

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<PlayerHomePage />} />
        <Route path="/play/:code" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function typeCode(
  user: ReturnType<typeof userEvent.setup>,
  code: string,
) {
  const inputs = screen.getAllByRole('textbox')
  for (const [index, char] of code.split('').entries()) {
    await user.type(inputs[index], char)
  }
}

describe('PlayerHomePage', () => {
  it('meminta kode lengkap sebelum membuka kuis', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: id.home.start }))

    expect(screen.getByRole('alert')).toHaveTextContent(id.home.incompleteCode)
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  })

  it('membuka halaman kuis setelah kode diisi', async () => {
    const user = userEvent.setup()
    renderHome()

    await typeCode(user, 'ab12cd')
    await user.click(screen.getByRole('button', { name: id.home.start }))

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/play/AB12CD',
    )
  })

  it('mendukung tempel kode sekaligus', async () => {
    const user = userEvent.setup()
    renderHome()
    const inputs = screen.getAllByRole('textbox')

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => 'zx34yz',
      },
    })
    await user.click(screen.getByRole('button', { name: id.home.start }))

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/play/ZX34YZ',
    )
  })
})
