import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../src/App.jsx';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderRoute(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('RestroMind documentation routes', () => {
  it('renders the home page', () => {
    renderRoute('/');
    expect(screen.getByRole('heading', { name: /RestroDocs v2.0/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /System Architecture/ })).toBeInTheDocument();
  });

  it('renders the system hub page', () => {
    renderRoute('/system-hub');
    expect(screen.getByRole('heading', { name: '⬡ RestroDocs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /System Architecture/ })).toBeInTheDocument();
  });

  it.each([
    ['/index.html', '/'],
    ['/system-hub.html', '/system-hub'],
  ])('redirects legacy route %s to %s', (legacyRoute, expectedRoute) => {
    renderRoute(legacyRoute);
    expect(screen.getByRole('heading', { name: /System Architecture/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(expectedRoute);
  });

  it('renders the not-found page', () => {
    renderRoute('/missing-page');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('keeps the login action keyboard accessible', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    const login = screen.getByRole('button', { name: '🔑 Login' });
    login.focus();
    await user.keyboard('{Enter}');
    expect(login).toHaveFocus();
  });

  it('does not render raw script elements', () => {
    const { container } = renderRoute('/');
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });

  it('preserves important resource links', () => {
    renderRoute('/');
    expect(
      screen.getByRole('link', { name: /Supabase/i }),
    ).toHaveAttribute('href', 'https://supabase.com');
  });
});
