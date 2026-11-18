// Código que se lintea con `lintText` y una ruta virtual (layers.test.ts). Son strings, no
// módulos: así no hay imports rotos que excluir del typecheck ni del lint normal.

export const imports = {
  otherFeature: "import { x } from '../simulation/x';\nexport const y = x;\n",
  otherFeatureDeep: "import { x } from '../../features/customers/x';\nexport const y = x;\n",
  currencyPrivate: "import { x } from '../currency/fxClient';\nexport const y = x;\n",
  currencyMoney: "import { Money } from '../currency/Money.tsx';\nexport const y = Money;\n",
  currencyTotal:
    "import { MoneyTotal } from '../currency/MoneyTotal';\nexport const y = MoneyTotal;\n",
  currencyHook:
    "import { useCurrency } from '../currency/useCurrency.ts';\nexport const y = useCurrency;\n",
  ownFile: "import { x } from './x';\nexport const y = x;\n",
  api: "import { x } from '../../api/customers';\nexport const y = x;\n",
  shared: "import { x } from '../../shared/x';\nexport const y = x;\n",
  pages: "import { x } from '../../pages/Dashboard';\nexport const y = x;\n",
  app: "import { x } from '../../app/router';\nexport const y = x;\n",
  features: "import { x } from '../features/customers/x';\nexport const y = x;\n",
  apiFromShared: "import { x } from '../api/client';\nexport const y = x;\n",
};

export const http = {
  fetchGlobal: "export const load = () => fetch('/x');\n",
  fetchWindow: "export const load = () => window.fetch('/x');\n",
  fetchGlobalThis: "export const load = () => globalThis.fetch('/x');\n",
};
