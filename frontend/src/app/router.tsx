import { createBrowserRouter, type RouteObject } from 'react-router';
import { CustomerDetail } from '../pages/CustomerDetail.tsx';
import { Dashboard } from '../pages/Dashboard.tsx';
import { NewCustomer } from '../pages/NewCustomer.tsx';
import { Layout } from './Layout.tsx';

// Rutas de la aplicación. Se exportan para que los tests las monten con `createMemoryRouter`.
// `customers/new` es estática y React Router la prioriza sobre `customers/:id`.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'customers/new', element: <NewCustomer /> },
      { path: 'customers/:id', element: <CustomerDetail /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
