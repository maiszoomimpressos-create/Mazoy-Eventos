import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Authentication Check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // Get user ID from JWT
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }
  const userId = user.id;

  try {
    const { event_id, company_id, base_code, access_type, price, quantity } = await req.json();

    // 2. Input Validation
    if (!event_id || !company_id || !base_code || !access_type || price === undefined || quantity === undefined || quantity < 1) {
      return new Response(JSON.stringify({ error: 'Missing or invalid required fields (event_id, company_id, base_code, etc.).' }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // 3. Security Check: RLS on 'wristbands' and 'user_companies' ensures the user is authorized to insert for this company_id.

    // 4. Insert the main wristband record
    const wristbandData = {
        event_id: event_id,
        company_id: company_id,
        manager_user_id: userId, // Mantemos o user_id como o criador/gestor
        code: base_code,
        access_type: access_type,
        status: 'active',
        price: price,
    };

    const { data: insertedWristband, error: insertWristbandError } = await supabase
        .from('wristbands')
        .insert([wristbandData])
        .select('id, code')
        .single();

    if (insertWristbandError) {
        if (insertWristbandError.code === '23505') { // Unique violation (code already exists)
            return new Response(JSON.stringify({ error: "O Código Base informado já está em uso. Tente um código diferente." }), { 
                status: 409, 
                headers: corsHeaders 
            });
        }
        throw insertWristbandError;
    }
    
    const wristbandId = insertedWristband.id;
    const wristbandCode = insertedWristband.code;

    // 5. Batch Insert wristband_analytics records
    const BATCH_SIZE = 100;
    let totalInsertedAnalytics = 0;

    for (let i = 0; i < quantity; i += BATCH_SIZE) {
        const batchToInsert = [];
        const currentBatchSize = Math.min(BATCH_SIZE, quantity - i);

        for (let j = 0; j < currentBatchSize; j++) {
            batchToInsert.push({
                wristband_id: wristbandId,
                event_type: 'creation',
                client_user_id: null, 
                code_wristbands: wristbandCode,
                status: 'active',
                sequential_number: i + j + 1, // Sequential number for each analytic record
                event_data: {
                    code: wristbandCode,
                    access_type: access_type,
                    price: price,
                    manager_id: userId,
                    event_id: event_id,
                    company_id: company_id, // Adicionando company_id ao event_data
                    initial_status: 'active',
                    sequential_entry: i + j + 1,
                },
            });
        }

        const { error: analyticsError } = await supabase
            .from('wristband_analytics')
            .insert(batchToInsert);

        if (analyticsError) {
            console.error(`Warning: Failed to insert analytics batch starting at index ${i}:`, analyticsError);
            // Se a inserção de analytics falhar, devemos reverter a criação da pulseira principal
            await supabase.from('wristbands').delete().eq('id', wristbandId);
            throw new Error(`Falha crítica ao criar registros de analytics. Pulseira principal revertida. Erro: ${analyticsError.message}`);
        }
        totalInsertedAnalytics += currentBatchSize;
    }

    return new Response(JSON.stringify({ 
        message: `Successfully created wristband "${wristbandCode}" and ${totalInsertedAnalytics} analytics records.`,
        count: totalInsertedAnalytics
    }), { 
        status: 200, 
        headers: corsHeaders 
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});