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

  // 1. Authentication Check (using user's JWT for client identification)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }
  
  const supabaseAnon = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }
  const clientUserId = user.id;

  try {
    const { eventId, purchaseItems } = await req.json(); // purchaseItems: [{ ticketTypeId, quantity, price }]

    if (!eventId || !purchaseItems || purchaseItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing event details or purchase items' }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Calculate total value
    const totalValue = purchaseItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    // 2. Fetch Event Details to get Manager ID and Company Payment Settings
    const { data: eventData, error: eventError } = await supabaseService
        .from('events')
        .select('user_id, companies(payment_settings(api_key, api_token))')
        .eq('id', eventId)
        .single();

    if (eventError || !eventData) {
        return new Response(JSON.stringify({ error: 'Event not found or manager data missing.' }), { 
            status: 404, 
            headers: corsHeaders 
        });
    }
    
    const managerUserId = eventData.user_id;
    const paymentSettings = eventData.companies?.payment_settings?.[0];
    
    if (!paymentSettings?.api_key || !paymentSettings?.api_token) {
        return new Response(JSON.stringify({ error: 'Payment gateway keys (Mercado Pago) are not configured by the manager.' }), { 
            status: 403, 
            headers: corsHeaders 
        });
    }
    
    // 3. Reserve/Identify available wristband analytics records
    const analyticsIdsToUpdate: string[] = [];
    const itemDetailsMap = new Map<string, { price: number, quantity: number }>(); // Map to store unit price and quantity per wristband ID
    
    for (const item of purchaseItems) {
        const { ticketTypeId, quantity, price } = item;
        
        // Fetch N records of analytics that are 'active' and not associated with a client
        const { data: availableAnalytics, error: fetchAnalyticsError } = await supabaseService
            .from('wristband_analytics')
            .select('id')
            .eq('wristband_id', ticketTypeId)
            .eq('status', 'active')
            .is('client_user_id', null)
            .limit(quantity);

        if (fetchAnalyticsError) throw fetchAnalyticsError;

        if (!availableAnalytics || availableAnalytics.length < quantity) {
            return new Response(JSON.stringify({ error: `Not enough tickets available for type ${ticketTypeId}.` }), { 
                status: 409, 
                headers: corsHeaders 
            });
        }
        
        analyticsIdsToUpdate.push(...availableAnalytics.map(a => a.id));
        itemDetailsMap.set(ticketTypeId, { price, quantity });
    }
    
    // 4. Insert pending transaction into receivables
    const { data: transactionData, error: insertTransactionError } = await supabaseService
        .from('receivables')
        .insert({
            client_user_id: clientUserId,
            manager_user_id: managerUserId,
            event_id: eventId,
            total_value: totalValue,
            status: 'pending',
            wristband_analytics_ids: analyticsIdsToUpdate,
        })
        .select('id')
        .single();

    if (insertTransactionError) throw insertTransactionError;
    const transactionId = transactionData.id;

    // 5. Simulate Mercado Pago Call (using fetched keys)
    // --- SIMULAÇÃO DE PAGAMENTO ---
    
    const paymentSuccess = Math.random() > 0.1; // 90% success rate simulation
    const paymentGatewayId = paymentSuccess ? `MP-${Date.now()}` : null;
    
    // 6. Update transaction status and wristband analytics based on simulation
    let finalStatus = paymentSuccess ? 'paid' : 'failed';
    
    const updatePayload: any = {
        status: finalStatus,
        payment_gateway_id: paymentGatewayId,
        updated_at: new Date().toISOString(),
    };

    // Update receivables status
    const { error: updateTransactionError } = await supabaseService
        .from('receivables')
        .update(updatePayload)
        .eq('id', transactionId);

    if (updateTransactionError) {
        console.error("Failed to update transaction status:", updateTransactionError);
    }

    if (paymentSuccess) {
        // Update wristband analytics: associate client and mark as used/sold
        
        // We need to fetch the wristband_id for each analytics record to get the unit price/quantity details
        const { data: analyticsToUpdate, error: fetchUpdateError } = await supabaseService
            .from('wristband_analytics')
            .select('id, wristband_id')
            .in('id', analyticsIdsToUpdate);
            
        if (fetchUpdateError) {
            console.error("CRITICAL: Failed to fetch analytics records for update:", fetchUpdateError);
            throw new Error("Payment successful, but failed to retrieve ticket details for assignment.");
        }
        
        // Prepare batch update for analytics records
        const updates = analyticsToUpdate.map(record => {
            const itemDetails = itemDetailsMap.get(record.wristband_id);
            
            return {
                id: record.id,
                client_user_id: clientUserId,
                status: 'used', 
                event_type: 'purchase',
                event_data: {
                    purchase_date: new Date().toISOString(),
                    total_paid: totalValue, // Total value of the entire transaction (for context)
                    client_id: clientUserId,
                    transaction_id: transactionId,
                    // Explicitly storing unit price and quantity (1 per analytics record)
                    unit_price: itemDetails?.price || 0, 
                    quantity_purchased: 1, // Each analytics record represents 1 ticket
                }
            };
        });

        const { error: updateAnalyticsError } = await supabaseService
            .from('wristband_analytics')
            .upsert(updates); // Using upsert for batch update by ID

        if (updateAnalyticsError) {
            console.error("CRITICAL: Failed to update wristband analytics after successful payment:", updateAnalyticsError);
            return new Response(JSON.stringify({ error: 'Payment successful, but failed to assign tickets. Contact support.' }), { 
                status: 500, 
                headers: corsHeaders 
            });
        }
    } else {
        // Payment failed simulation.
        return new Response(JSON.stringify({ error: 'Falha na transação de pagamento (simulação Mercado Pago).', status: finalStatus }), { 
            status: 402, 
            headers: corsHeaders 
        });
    }

    return new Response(JSON.stringify({ 
        message: 'Purchase completed successfully.',
        transactionId: transactionId,
        status: finalStatus,
        ticketsAssigned: analyticsIdsToUpdate.length
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