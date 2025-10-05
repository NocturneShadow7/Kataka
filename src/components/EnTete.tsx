import { LogOut, User, Home, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CentreNotifications } from './CentreNotifications';
import { Chat } from './Chat';

interface EnTeteProps {
  onAccueil?: () => void;
  onBoutique?: () => void;
}

export function EnTete({ onAccueil, onBoutique }: EnTeteProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 md:space-x-4">
            <h1 className="text-lg md:text-2xl font-bold text-white">Interkom</h1>
            <span className="px-2 md:px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
              {user?.role === 'admin' ? 'Admin' : 'Client'}
            </span>
          </div>

          <div className="flex items-center space-x-1 md:space-x-4">
            {onAccueil && (
              <button
                onClick={onAccueil}
                className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-gray-300 hover:text-white transition-colors"
                title="Accueil"
              >
                <Home className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm hidden sm:inline">Accueil</span>
              </button>
            )}
            {onBoutique && (
              <button
                onClick={onBoutique}
                className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-gray-300 hover:text-white transition-colors"
                title="Boutique"
              >
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm hidden sm:inline">Boutique</span>
              </button>
            )}
            <CentreNotifications />
            <Chat isAdmin={user?.role === 'admin'} />
            <div className="flex items-center space-x-1 md:space-x-2 text-gray-300 hidden lg:flex">
              <User className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">{user?.full_name}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs md:text-sm hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
