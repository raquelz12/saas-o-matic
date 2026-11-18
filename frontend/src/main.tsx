import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from './app/queryClient.ts';
import { createAppRouter } from './app/router.tsx';
import { CurrencyProvider } from './features/currency/CurrencyContext.tsx';
import './global.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('No se encuentra el elemento #root');
}

// Providers (architecture §1): QueryClient, Currency (usa TanStack para los tipos) y Router.
const queryClient = createQueryClient();
const router = createAppRouter();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <RouterProvider router={router} />
      </CurrencyProvider>
    </QueryClientProvider>
  </StrictMode>,
);
