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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Usando ANON_KEY para dados públicos
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  try {
    const { user_id, user_latitude, user_longitude } = await req.json();

    // 1. Buscar configurações do carrossel
    const { data: settings, error: settingsError } = await supabase
      .from('carousel_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = No rows found
      throw settingsError;
    }

    const carouselSettings = settings || {
      rotation_time_seconds: 5,
      max_banners_display: 5,
      regional_distance_km: 100,
      min_regional_banners: 3,
      fallback_strategy: 'latest_events',
      days_until_event_threshold: 30,
    };

    const now = new Date().toISOString();

    // 2. Buscar eventos em destaque
    let { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select(`
        id, title, description, date, time, location, image_url, category, capacity, duration,
        is_featured_carousel, carousel_display_order, carousel_start_date, carousel_end_date,
        carousel_headline, carousel_subheadline, latitude, longitude
      `)
      .eq('is_featured_carousel', true)
      .lte('carousel_start_date', now)
      .gte('carousel_end_date', now)
      .order('carousel_display_order', { ascending: true })
      .order('date', { ascending: true })
      .limit(carouselSettings.max_banners_display); // Aplicar limite aqui

    if (eventsError) throw eventsError;

    // 3. Buscar todas as pulseiras ativas para esses eventos para calcular preço mínimo e disponibilidade
    const eventIds = eventsData.map(e => e.id);
    const { data: wristbandsData, error: wristbandsError } = await supabase
      .from('wristbands')
      .select('event_id, id, price, status')
      .in('event_id', eventIds)
      .eq('status', 'active'); // Apenas pulseiras ativas

    if (wristbandsError) throw wristbandsError;

    const eventAggregates = wristbandsData.reduce((acc, item) => {
      if (!acc[item.event_id]) {
        acc[item.event_id] = { min_price: Infinity, min_price_wristband_id: null, total_available_tickets: 0 };
      }
      const price = parseFloat(item.price as unknown as string) || 0;
      if (price < acc[item.event_id].min_price) {
        acc[item.event_id].min_price = price;
        acc[item.event_id].min_price_wristband_id = item.id;
      }
      acc[item.event_id].total_available_tickets += 1;
      return acc;
    }, {} as { [eventId: string]: { min_price: number; min_price_wristband_id: string | null; total_available_tickets: number } });

    // 4. Combinar e formatar eventos
    const formattedEvents = eventsData.map(event => {
      const aggregates = eventAggregates[event.id] || { min_price: Infinity, min_price_wristband_id: null, total_available_tickets: 0 };
      const minPrice = aggregates.min_price === Infinity ? null : aggregates.min_price;

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        date: new Date(event.date).toLocaleDateString('pt-BR'),
        time: event.time,
        location: event.location,
        image_url: event.image_url,
        category: event.category,
        min_price: minPrice,
        min_price_wristband_id: aggregates.min_price_wristband_id,
        total_available_tickets: aggregates.total_available_tickets,
        capacity: event.capacity,
        is_featured_carousel: event.is_featured_carousel,
        carousel_display_order: event.carousel_display_order,
        carousel_start_date: event.carousel_start_date ? new Date(event.carousel_start_date).toLocaleDateString('pt-BR') : null,
        carousel_end_date: event.carousel_end_date ? new Date(event.carousel_end_date).toLocaleDateString('pt-BR') : null,
        carousel_headline: event.carousel_headline,
        carousel_subheadline: event.carousel_subheadline,
      };
    });

    return new Response(JSON.stringify({ events: formattedEvents }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});