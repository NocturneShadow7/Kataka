import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Copy, RefreshCw, Users, Gift, Check } from 'lucide-react';

interface ReferralCode {
  id: string;
  code: string;
  code_type: 'trusted' | 'lowcost';
  is_active: boolean;
  uses_count: number;
  created_at: string;
}

interface Referral {
  id: string;
  referred_id: string;
  referral_code: string;
  discount_applied: number;
  created_at: string;
  referred: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  trusted: boolean;
  subscription_fee: number;
}

export function GestionParrainage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chargement, setChargement] = useState(true);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('trusted, subscription_fee')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: codesData } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (codesData) {
      setCodes(codesData);
    }

    const { data: referralsData } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:profiles!referrals_referred_id_fkey(full_name, email)
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (referralsData) {
      setReferrals(referralsData);
    }

    setChargement(false);
  };

  const genererCode = async () => {
    if (!user || !profile) return;

    const codeType = profile.trusted ? 'trusted' : 'lowcost';

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    if (!profileData) return;

    const { data: codeGenere, error } = await supabase.rpc(
      'generate_referral_code',
      { user_full_name: profileData.full_name }
    );

    if (error) {
      alert('Erreur lors de la génération du code');
      return;
    }

    const { error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        user_id: user.id,
        code: codeGenere,
        code_type: codeType,
        is_active: true
      });

    if (insertError) {
      alert('Erreur: ' + insertError.message);
      return;
    }

    chargerDonnees();
  };

  const copierCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  const basculerActif = async (id: string, actif: boolean) => {
    const { error } = await supabase
      .from('referral_codes')
      .update({ is_active: !actif })
      .eq('id', id);

    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }

    chargerDonnees();
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  if (!profile) {
    return <div className="text-gray-400">Profil non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Mes codes de parrainage</h3>
        <p className="text-gray-400 text-sm">
          Partagez vos codes pour inviter de nouveaux utilisateurs
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${
              profile.trusted ? 'bg-green-600/20' : 'bg-orange-600/20'
            }`}>
              <Gift className={`w-6 h-6 ${
                profile.trusted ? 'text-green-400' : 'text-orange-400'
              }`} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white">
                {profile.trusted ? 'Membre de confiance' : 'Membre standard'}
              </h4>
              <p className="text-sm text-gray-400">
                {profile.trusted
                  ? 'Vos parrainés bénéficient de l\'inscription gratuite'
                  : 'Vos parrainés bénéficient de l\'inscription à 0.99€'}
              </p>
            </div>
          </div>
        </div>

        {!profile.trusted && profile.subscription_fee > 0 && (
          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-200">
              Abonnement actuel: {profile.subscription_fee}€/mois
            </p>
            <p className="text-xs text-orange-300 mt-1">
              Passez en membre de confiance pour offrir des inscriptions gratuites à vos filleuls
            </p>
          </div>
        )}

        <button
          onClick={genererCode}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Générer un nouveau code</span>
        </button>
      </div>

      {codes.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-lg font-semibold text-white">Mes codes actifs</h4>
          </div>
          <div className="p-4 space-y-3">
            {codes.map((code) => (
              <div
                key={code.id}
                className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-mono font-bold text-white">
                      {code.code}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      code.code_type === 'trusted'
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-orange-900/50 text-orange-300'
                    }`}>
                      {code.code_type === 'trusted' ? 'Gratuit' : '0.99€'}
                    </span>
                    {code.is_active ? (
                      <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-medium">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-600 text-gray-400 rounded-full text-xs font-medium">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{code.uses_count} utilisation(s)</span>
                    </span>
                    <span>
                      Créé le {new Date(code.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copierCode(code.code)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {copie ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copie ? 'Copié!' : 'Copier'}</span>
                  </button>
                  <button
                    onClick={() => basculerActif(code.id, code.is_active)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      code.is_active
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {code.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {referrals.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-lg font-semibold text-white">Mes filleuls ({referrals.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Nom</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Code utilisé</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Réduction</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white">{referral.referred.full_name}</td>
                    <td className="py-3 px-4 text-gray-300">{referral.referred.email}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono">{referral.referral_code}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded-full text-xs font-medium">
                        -{referral.discount_applied.toFixed(2)}€
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {referrals.length === 0 && codes.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Vous n'avez pas encore de filleuls</p>
          <p className="text-sm text-gray-500 mt-1">
            Partagez vos codes pour inviter de nouveaux utilisateurs
          </p>
        </div>
      )}
    </div>
  );
}
