import { Home, LogIn, Mail } from 'lucide-react';

interface NavbarProps {
  currentPage?: 'home' | 'login' | 'contact';
  onNavigate?: (page: 'home' | 'login' | 'contact') => void;
}

export function Navbar({ currentPage = 'home', onNavigate }: NavbarProps) {
  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">Interkom</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate?.('home')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'home'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </button>
            <button
              onClick={() => onNavigate?.('contact')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'contact'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </button>
            <button
              onClick={() => onNavigate?.('login')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Connexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
