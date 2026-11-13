import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.tsx';

describe('smoke', () => {
  it('renderiza la aplicación', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SaaS-O-Matic' })).toBeTruthy();
  });
});
