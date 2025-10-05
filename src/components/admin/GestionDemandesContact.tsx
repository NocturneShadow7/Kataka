import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Phone, MessageSquare, CheckCircle, XCircle, Trash2, User } from 'lucide-react';

interface ContactRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at: string | null;
}

export function GestionDemandesContact() {
  const [demandes, setDemandes] = useState<ContactRequest[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    chargerDemandes();
  }, []);

  const chargerDemandes = async () => {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDemandes(data);
    }
    setChargement(false);
  };

  const mettreAJourStatut = async (id: string, statut: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('contact_requests')
      .update({
        status: statut,
        processed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }

    alert(`Demande ${statut === 'approved' ? 'approuvée' : 'rejetée'} avec succès`);
    chargerDemandes();
  };

  const supprimerDemande = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return;

    const { error } = await supabase
      .from('contact_requests')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }

    alert('Demande supprimée avec succès');
    chargerDemandes();
  };

  const demandesEnAttente = demandes.filter((d) => d.status === 'pending');
  const demandesTraitees = demandes.filter((d) => d.status !== 'pending');

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Demandes d'inscription</h3>
        <p className="text-gray-400">
          {demandesEnAttente.length} demande(s) en attente
        </p>
      </div>

      {demandesEnAttente.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-white mb-4">En attente de traitement</h4>
          <div className="space-y-4">
            {demandesEnAttente.map((demande) => (
              <div
                key={demande.id}
                className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-yellow-400" />
                      <span className="text-lg font-semibold text-white">{demande.full_name}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 text-gray-300">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{demande.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{demande.phone}</span>
                      </div>
                    </div>

                    {demande.message && (
                      <div className="flex items-start space-x-2 text-gray-300 bg-gray-800 rounded p-3">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                        <p className="text-sm">{demande.message}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Demandé le {new Date(demande.created_at).toLocaleDateString('fr-FR')} à {new Date(demande.created_at).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => mettreAJourStatut(demande.id, 'approved')}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      title="Approuver"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approuver</span>
                    </button>
                    <button
                      onClick={() => mettreAJourStatut(demande.id, 'rejected')}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Rejeter"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeter</span>
                    </button>
                    <button
                      onClick={() => supprimerDemande(demande.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-lg font-medium text-white mb-4">Historique</h4>
        {demandesTraitees.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-800 rounded-lg border border-gray-700">
            Aucune demande traitée pour le moment
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Nom</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Téléphone</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandesTraitees.map((demande) => (
                  <tr key={demande.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white">{demande.full_name}</td>
                    <td className="py-3 px-4 text-gray-300">{demande.email}</td>
                    <td className="py-3 px-4 text-gray-300">{demande.phone}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          demande.status === 'approved'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {demande.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {new Date(demande.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => supprimerDemande(demande.id)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
