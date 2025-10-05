import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FormulaireConnexion } from './components/FormulaireConnexion';
import { TableauBordAdmin } from './pages/TableauBordAdmin';
import { TableauBordClient } from './pages/TableauBordClient';
import { PageAccueil } from './pages/PageAccueil';
import { Boutique } from './pages/Boutique';
import { Contact } from './pages/Contact';
import { PageParrainage } from './pages/PageParrainage';
import { Maintenance } from './pages/Maintenance';
import { SecureAccess } from './pages/SecureAccess';
import { loadSiteSettings, SiteSettings } from './lib/settings';

type PageType = 'home' | 'login' | 'contact' | 'dashboard' | 'boutique' | 'parrainage';

function ContenuApp() {
  const { user, loading } = useAuth();
  const [pageActuelle, setPageActuelle] = useState<PageType>('home');
  const [codeParrainage, setCodeParrainage] = useState<{ code: string; discount: number } | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [secureAccessGranted, setSecureAccessGranted] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const naviguer = (page: PageType) => {
    setPageActuelle(page);
  };

  const handleCodeParrainage = (code: string, discount: number) => {
    setCodeParrainage({ code, discount });
    setPageActuelle('contact');
  };

  useEffect(() => {
    loadSiteSettings().then(s => {
      setSettings(s);
      setLoadingSettings(false);
      const hasAccess = sessionStorage.getItem('secure_access_granted') === 'true';
      setSecureAccessGranted(hasAccess);
    });
  }, []);

  useEffect(() => {
    if (user && pageActuelle !== 'dashboard' && pageActuelle !== 'boutique') {
      setPageActuelle('dashboard');
    }
  }, [user]);

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (settings?.maintenance_mode && !user) {
    const hasMaintenanceAccess = sessionStorage.getItem('maintenance_admin_access') === 'true';
    if (!hasMaintenanceAccess && pageActuelle !== 'login') {
      return (
        <Maintenance
          message={settings.maintenance_message}
          adminCode={settings.maintenance_admin_code}
          onAdminAccess={() => {
            sessionStorage.setItem('maintenance_admin_access', 'true');
            setPageActuelle('login');
          }}
        />
      );
    }
  }

  if (settings?.secure_mode && !secureAccessGranted && (!user || user.role !== 'admin')) {
    return (
      <SecureAccess
        expectedCode={settings.secure_code}
        onValidCode={() => setSecureAccessGranted(true)}
      />
    );
  }

  if (pageActuelle === 'parrainage') {
    return (
      <PageParrainage
        onNavigate={(page) => naviguer(page)}
        onCodeValide={handleCodeParrainage}
      />
    );
  }

  if (pageActuelle === 'contact') {
    return (
      <Contact
        onNavigate={(page) => naviguer(page)}
        codeParrainage={codeParrainage}
      />
    );
  }

  if (pageActuelle === 'login' && !user) {
    return (
      <FormulaireConnexion
        onSuccess={() => setPageActuelle('dashboard')}
        onNavigate={(page) => naviguer(page)}
      />
    );
  }

  if (pageActuelle === 'boutique') {
    return (
      <Boutique
        onRetour={() => {
          if (user) {
            setPageActuelle('dashboard');
          } else {
            setPageActuelle('home');
          }
        }}
      />
    );
  }

  if (user && pageActuelle === 'dashboard') {
    if (user.role === 'admin') {
      return (
        <TableauBordAdmin
          onAccueil={() => naviguer('home')}
          onBoutique={() => naviguer('boutique')}
        />
      );
    }
    return (
      <TableauBordClient
        onAccueil={() => naviguer('home')}
        onBoutique={() => naviguer('boutique')}
      />
    );
  }

  if (pageActuelle === 'home' || !user) {
    return (
      <PageAccueil
        onConnexion={() => {
          if (user) {
            naviguer('dashboard');
          } else {
            naviguer('login');
          }
        }}
        onBoutique={() => naviguer('boutique')}
        onContact={() => naviguer('parrainage')}
      />
    );
  }

  return <FormulaireConnexion onSuccess={() => setPageActuelle('dashboard')} onNavigate={(page) => naviguer(page)} />;
}

function App() {
  return (
    <AuthProvider>
      <ContenuApp />
    </AuthProvider>
  );
}

export default App;
