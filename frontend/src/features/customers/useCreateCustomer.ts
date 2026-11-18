import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { createCustomer } from '../../api/customers.ts';
import { queryKeys } from '../../api/queryKeys.ts';

/**
 * Alta de cliente (RF-36). Tras un 201 invalida las búsquedas de clientes, para que el dashboard
 * muestre el nuevo, y navega a su detalle (plan, decisión 1).
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      void navigate(`/customers/${customer.id}`);
    },
  });
}
