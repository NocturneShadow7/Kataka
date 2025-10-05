import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const BLOCKCHAIN_APIS = {
  BTC: 'https://blockchain.info/rawaddr/',
  ETH: 'https://api.etherscan.io/api',
  'USDT-TRON': 'https://api.trongrid.io/v1/accounts/',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: pendingChecks, error } = await supabase
      .from('crypto_payment_checks')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date(Date.now() + 1000).toISOString());

    if (error) throw error;

    const results = [];

    for (const check of pendingChecks || []) {
      try {
        const balance = await checkCryptoBalance(
          check.crypto_type,
          check.crypto_address,
        );

        if (balance >= check.expected_amount) {
          await supabase
            .from('crypto_payment_checks')
            .update({
              status: 'confirmed',
              received_amount: balance,
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', check.id);

          await supabase
            .from('payments')
            .update({ status: 'confirmed' })
            .eq('id', check.payment_id);

          const { data: payment } = await supabase
            .from('payments')
            .select('order_id')
            .eq('id', check.payment_id)
            .single();

          if (payment) {
            await supabase
              .from('invoices')
              .update({ status: 'paid' })
              .eq('order_id', payment.order_id);

            await supabase
              .from('orders')
              .update({ status: 'paid' })
              .eq('id', payment.order_id);
          }

          results.push({ id: check.id, status: 'confirmed', balance });
        } else if (balance > 0 && balance < check.expected_amount) {
          await supabase
            .from('crypto_payment_checks')
            .update({
              status: 'underpaid',
              received_amount: balance,
              last_checked_at: new Date().toISOString(),
            })
            .eq('id', check.id);

          results.push({ id: check.id, status: 'underpaid', balance });
        } else {
          await supabase
            .from('crypto_payment_checks')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', check.id);

          results.push({ id: check.id, status: 'pending', balance: 0 });
        }
      } catch (err) {
        console.error(`Error checking ${check.id}:`, err);
        results.push({ id: check.id, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function checkCryptoBalance(
  cryptoType: string,
  address: string,
): Promise<number> {
  try {
    if (cryptoType === 'BTC') {
      const response = await fetch(`${BLOCKCHAIN_APIS.BTC}${address}`);
      const data = await response.json();
      return (data.final_balance || 0) / 100000000;
    } else if (cryptoType === 'ETH') {
      const response = await fetch(
        `${BLOCKCHAIN_APIS.ETH}?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`,
      );
      const data = await response.json();
      return parseFloat(data.result || '0') / 1e18;
    } else if (cryptoType === 'USDT-TRON') {
      const response = await fetch(`${BLOCKCHAIN_APIS['USDT-TRON']}${address}`);
      const data = await response.json();
      const usdtBalance = data.data?.[0]?.trc20?.find(
        (token: any) => token.symbol === 'USDT',
      );
      return parseFloat(usdtBalance?.balance || '0') / 1e6;
    }
    return 0;
  } catch (error) {
    console.error(`Error checking balance for ${cryptoType}:`, error);
    return 0;
  }
}
