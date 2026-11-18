import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from './app/queryClient.ts';
import { createAppRouter } from './app/router.tsx';
import './global.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('No se encuentra el elemento #root');
}

// Providers (architecture §1): QueryClient y Router. El de divisa se añade en T-28.
const queryClient = createQueryClient();
const router = createAppRouter();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
