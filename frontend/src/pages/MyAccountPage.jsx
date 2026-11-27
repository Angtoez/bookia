// Mi cuenta (feature 002, contracts/ui-routes.md): datos y nombre, contraseña, descarga de los
// datos y borrado de la cuenta. Para usuarios y administradores.
import { useEffect } from 'react';
import { AccountProfileForm } from '../components/AccountProfileForm.jsx';
import { ChangePasswordForm } from '../components/ChangePasswordForm.jsx';
import { DeleteAccountSection } from '../components/DeleteAccountSection.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { getAccount } from '../services/accountService.js';

function AccountSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-stone-200" />
      ))}
    </div>
  );
}

export function MyAccountPage() {
  const { data: account, error, reload } = useApiQuery(getAccount);

  useEffect(() => {
    document.title = 'Mi cuenta · Bookia';
  }, []);

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!account) content = <AccountSkeleton />;
  else {
    content = (
      <>
        <AccountProfileForm account={account} />
        <ChangePasswordForm />
        <DeleteAccountSection />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Mi cuenta</h1>
        <p className="text-stone-600">Consulta y cambia tus datos, o borra tu cuenta.</p>
      </div>
      <div aria-busy={!account && !error} className="space-y-6">
        {content}
      </div>
    </div>
  );
}
