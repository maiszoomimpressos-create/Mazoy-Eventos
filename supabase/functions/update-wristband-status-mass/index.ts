import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Initialize Supabase client with Service Role Key for secure backend operations
const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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
    const { event_id, new_status } = await req.json();

    if (!event_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing event_id or new_status' }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // 2. Fetch Event Details to get Company ID
    const { data: eventData, error: eventError } = await supabaseService
        .from('events')
        .select('company_id')
        .eq('id', event_id)
        .single();

    if (eventError || !eventData?.company_id) {
        return new Response(JSON.stringify({ error: 'Event not found or company association missing.' }), { 
            status: 404, 
            headers: corsHeaders 
        });
    }
    const companyId = eventData.company_id;

    // 3. Security Check: Ensure the user is an owner/manager of the company
    const { data: association, error: associationError } = await supabaseService
        .from('user_companies')
        .select('role')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .limit(1);

    if (associationError || !association || association.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden: User is not associated with this company.' }), { 
            status: 403, 
            headers: corsHeaders 
        });
    }
    
    // 4. Check for sold wristbands (if mass deactivation is requested)
    if (new_status === 'lost' || new_status === 'cancelled') {
        // Verifica se existe QUALQUER registro de analytics para pulseiras deste evento
        // que tenha um client_user_id associado (indicando venda/associação a um cliente).
        const { data: soldCheck, error: checkError } = await supabaseService
            .from('wristband_analytics')
            .select(`
                client_user_id,
                wristbands!inner(event_id)
            `)
            .not('client_user_id', 'is', null)
            .eq('wristbands.event_id', event_id) 
            .limit(1);

        if (checkError) throw checkError;

        if (soldCheck && soldCheck.length > 0) {
            return new Response(JSON.stringify({ error: 'Não é possível desativar: Pelo menos uma pulseira deste evento já foi vendida ou associada a um cliente.' }), { 
                status: 403, 
                headers: corsHeaders 
            });
        }
    }

    // 5. Get all wristband IDs for the event
    const { data: wristbands, error: fetchError } = await supabaseService
        .from('wristbands')
        .select('id')
        .eq('event_id', event_id)
        .eq('company_id', companyId); // Filtra explicitamente por company_id

    if (fetchError) throw fetchError;

    const wristbandIds = wristbands.map(w => w.id);
    if (wristbandIds.length === 0) {
        return new Response(JSON.stringify({ message: 'No wristbands found for this event to update.' }), { 
            status: 200, 
            headers: corsHeaders 
        });
    }

    // 6. Mass Update in wristbands table
    const { error: updateWristbandsError } = await supabaseService
        .from('wristbands')
        .update({ status: new_status })
        .in('id', wristbandIds);

    if (updateWristbandsError) throw updateWristbandsError;

    // 7. Mass Update in wristband_analytics table
    const { error: updateAnalyticsError } = await supabaseService
        .from('wristband_analytics')
        .update({ status: new_status })
        .in('wristband_id', wristbandIds);

    if (updateAnalyticsError) {
        console.error("Warning: Failed to update analytics status:", updateAnalyticsError);
    }

    return new Response(JSON.stringify({ 
        message: `Successfully updated ${wristbandIds.length} wristbands and analytics records.`,
        count: wristbandIds.length
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