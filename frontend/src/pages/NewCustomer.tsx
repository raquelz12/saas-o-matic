import { NewCustomerForm } from '../features/customers/NewCustomerForm.tsx';

// Alta de cliente (RF-36): tras un alta correcta, el formulario navega al detalle.
export function NewCustomer() {
  return (
    <section>
      <h1>Nuevo cliente</h1>
      <NewCustomerForm />
    </section>
  );
}
