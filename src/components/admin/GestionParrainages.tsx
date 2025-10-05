import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Network, TrendingUp } from 'lucide-react';

interface ReferralData {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  discount_applied: number;
  created_at: string;
  referrer: {
    full_name: string;
    email: string;
    trusted: boolean;
  };
  referred: {
    full_name: string;
    email: string;
  };
}

interface ReferralStats {
  total_referrals: number;
  trusted_codes: number;
  lowcost_codes: number;
  total_discount_given: number;
}

interface NetworkNode {
  id: string;
  name: string;
  email: string;
  trusted: boolean;
  referrals: number;
  level: number;
}

export function GestionParrainages() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    trusted_codes: 0,
    lowcost_codes: 0,
    total_discount_given: 0
  });
  const [networkData, setNetworkData] = useState<Map<string, NetworkNode>>(new Map());
  const [chargement, setChargement] = useState(true);
  const [afficherReseau, setAfficherReseau] = useState(false);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    const { data: referralsData } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:profiles!referrals_referrer_id_fkey(full_name, email, trusted),
        referred:profiles!referrals_referred_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (referralsData) {
      setReferrals(referralsData);

      const totalDiscount = referralsData.reduce((sum, r) => sum + r.discount_applied, 0);
      const trustedCount = referralsData.filter(r => r.discount_applied === 2.99).length;
      const lowcostCount = referralsData.filter(r => r.discount_applied === 2.00).length;

      setStats({
        total_referrals: referralsData.length,
        trusted_codes: trustedCount,
        lowcost_codes: lowcostCount,
        total_discount_given: totalDiscount
      });

      construireReseau(referralsData);
    }

    setChargement(false);
  };

  const construireReseau = (referralsData: ReferralData[]) => {
    const nodes = new Map<string, NetworkNode>();
    const referrerCounts = new Map<string, number>();

    referralsData.forEach(ref => {
      const count = referrerCounts.get(ref.referrer_id) || 0;
      referrerCounts.set(ref.referrer_id, count + 1);

      if (!nodes.has(ref.referrer_id)) {
        nodes.set(ref.referrer_id, {
          id: ref.referrer_id,
          name: ref.referrer.full_name,
          email: ref.referrer.email,
          trusted: ref.referrer.trusted,
          referrals: 0,
          level: 0
        });
      }

      if (!nodes.has(ref.referred_id)) {
        nodes.set(ref.referred_id, {
          id: ref.referred_id,
          name: ref.referred.full_name,
          email: ref.referred.email,
          trusted: false,
          referrals: 0,
          level: 1
        });
      }
    });

    referrerCounts.forEach((count, id) => {
      const node = nodes.get(id);
      if (node) {
        node.referrals = count;
      }
    });

    setNetworkData(nodes);
  };

  const getTopReferrers = () => {
    return Array.from(networkData.values())
      .filter(node => node.referrals > 0)
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10);
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Système de Parrainage</h3>
        <p className="text-gray-400 text-sm">
          Vue d'ensemble des parrainages et du réseau
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-white">{stats.total_referrals}</span>
          </div>
          <p className="text-blue-300 font-medium">Total Parrainages</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Network className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold text-white">{stats.trusted_codes}</span>
          </div>
          <p className="text-green-300 font-medium">Codes Trusted</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <span className="text-3xl font-bold text-white">{stats.lowcost_codes}</span>
          </div>
          <p className="text-purple-300 font-medium">Codes Low-Cost</p>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-3xl font-bold text-white">{stats.total_discount_given.toFixed(2)}€</span>
          </div>
          <p className="text-orange-300 font-medium">Réductions Totales</p>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setAfficherReseau(!afficherReseau)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            afficherReseau
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {afficherReseau ? 'Masquer' : 'Afficher'} le réseau
        </button>
      </div>

      {afficherReseau && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Top 10 Parrains</h4>
          <div className="space-y-4">
            {getTopReferrers().map((node, index) => {
              const nodeReferrals = referrals.filter(r => r.referrer_id === node.id);
              return (
                <div key={node.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-gray-500' : index === 2 ? 'bg-orange-700' : 'bg-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{node.name}</p>
                        <p className="text-sm text-gray-400">{node.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-400">{node.referrals}</p>
                      <p className="text-xs text-gray-500">filleul(s)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      node.trusted
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-orange-900/50 text-orange-300'
                    }`}>
                      {node.trusted ? 'De confiance' : 'Non-confiance'}
                    </span>
                  </div>

                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-sm text-gray-400 mb-2">Filleuls :</p>
                    <div className="flex flex-wrap gap-2">
                      {nodeReferrals.map(ref => (
                        <div
                          key={ref.id}
                          className="bg-gray-600/50 rounded px-3 py-1 text-xs text-gray-300"
                        >
                          {ref.referred.full_name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-lg font-semibold text-white">Tous les Parrainages</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Parrain</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Filleul</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Code</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Réduction</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr key={referral.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{referral.referrer.full_name}</p>
                      <p className="text-xs text-gray-500">{referral.referrer.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white">{referral.referred.full_name}</p>
                      <p className="text-xs text-gray-500">{referral.referred.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-blue-400">{referral.referral_code}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      referral.discount_applied === 2.99
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-purple-900/50 text-purple-300'
                    }`}>
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
    </div>
  );
}
