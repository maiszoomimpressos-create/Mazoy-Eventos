import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Dados de exemplo para o carrossel (temporário)
const DUMMY_CAROUSEL_BANNERS = [
  {
    id: "dummy-promo-1",
    type: "promotional",
    headline: "Descubra Eventos Exclusivos!",
    subheadline: "Sua próxima experiência premium está na Mazoy.",
    image_url: "https://readdy.ai/api/search-image?query=luxury%20black%20and%20gold%20event%20venue%20with%20elegant%20lighting%20and%20premium%20atmosphere%2C%20sophisticated%20interior%20design%20with%20golden%20accents%20and%20dramatic%20shadows&width=1200&height=400&seq=banner1&orientation=landscape",
    link_url: "/",
    display_order: 1,
  },
  {
    id: "dummy-promo-2",
    type: "promotional",
    headline: "Torne-se um Gestor PRO!",
    subheadline: "Crie e gerencie seus eventos com ferramentas avançadas.",
    image_url: "https://readdy.ai/api/search-image?query=premium%20concert%20hall%20with%20golden%20stage%20lighting%20and%20black%20elegant%20seating%2C%20luxury%20entertainment%20venue%20with%20sophisticated%20ambiance%20and%20dramatic%20illumination&width=1200&height=400&seq=banner2&orientation=landscape",
    link_url: "/manager/register",
    display_order: 2,
  },
];

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
    let body = {};
    try {
        // Tenta ler o corpo, mas se for GET ou o corpo estiver vazio, falha silenciosamente
        if (req.headers.get('content-type')?.includes('application/json')) {
            body = await req.json();
        }
    } catch (e) {
        // Ignora erro de corpo vazio
    }
    
    const { user_id, user_latitude, user_longitude } = body as { user_id?: string, user_latitude?: number, user_longitude?: number };

    // 1. Buscar configurações globais do carrossel
    const { data: settings, error: settingsError } = await supabase
      .from('carousel_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error("[ERROR] Failed to fetch carousel settings:", settingsError);
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

    let allBanners: any[] = [];

    // 2. Buscar banners de eventos do carrossel (AGORA ALEATÓRIO E SEM FILTRO DE DATA)
    const { data: eventCarouselBanners, error: eventCarouselError } = await supabase
      .from('event_carousel_banners')
      .select(`
        id, event_id, image_url, headline, subheadline, display_order, start_date, end_date,
        events (id, title, description, category, location, date, time, latitude, longitude)
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }); // Ordem secundária para estabilidade

    if (eventCarouselError) {
        console.error("[ERROR] Failed to fetch event carousel banners:", eventCarouselError);
    }

    // 3. Buscar banners promocionais (AGORA ALEATÓRIO E SEM FILTRO DE DATA)
    const { data: promotionalBanners, error: promoBannersError } = await supabase
      .from('promotional_banners')
      .select(`
        id, image_url, headline, subheadline, display_order, start_date, end_date, link_url
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }); // Ordem secundária para estabilidade

    if (promoBannersError) console.error("[ERROR] Failed to fetch promotional banners:", promoBannersError);

    // 4. Combinar e formatar banners
    if (eventCarouselBanners) {
      const eventIds = eventCarouselBanners.map(b => b.event_id);
      
      // Buscar preços mínimos (wristbands)
      const { data: wristbandsData, error: wristbandsError } = await supabase
        .from('wristbands')
        .select('event_id, price, status')
        .in('event_id', eventIds)
        .eq('status', 'active');

      if (wristbandsError) console.error("[ERROR] Failed to fetch wristbands for carousel events:", wristbandsError);

      const eventMinPrices = wristbandsData ? wristbandsData.reduce((acc, item) => {
        const price = parseFloat(item.price as unknown as string) || 0;
        if (!acc[item.event_id] || price < acc[item.event_id]) {
          acc[item.event_id] = price;
        }
        return acc;
      }, {} as { [eventId: string]: number }) : {};

      eventCarouselBanners.forEach(banner => {
        if (banner.events) { // Ensure event data exists
          allBanners.push({
            id: banner.id,
            type: 'event',
            event_id: banner.event_id,
            image_url: banner.image_url,
            headline: banner.headline,
            subheadline: banner.subheadline,
            category: banner.events.category,
            min_price: eventMinPrices[banner.event_id] || null,
            location: banner.events.location,
            date: new Date(banner.events.date).toLocaleDateString('pt-BR'),
            time: banner.events.time,
            display_order: banner.display_order,
            latitude: banner.events.latitude,
            longitude: banner.events.longitude,
          });
        }
      });
    }

    if (promotionalBanners) {
      promotionalBanners.forEach(banner => {
        allBanners.push({
          id: banner.id,
          type: 'promotional',
          image_url: banner.image_url,
          headline: banner.headline,
          subheadline: banner.subheadline,
          link_url: banner.link_url,
          display_order: banner.display_order,
        });
      });
    }

    // Se não houver banners reais, usa os dados de exemplo
    if (allBanners.length === 0) {
        console.log("[DEBUG] No real banners found. Using dummy data for carousel.");
        const now = new Date().toISOString().split('T')[0];
        allBanners = DUMMY_CAROUSEL_BANNERS.map(banner => ({
            ...banner,
            start_date: now,
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        }));
    }

    // 5. Implementar ordenação aleatória (random shuffle no Deno)
    // Nota: Para garantir que o limite seja aplicado após a seleção aleatória,
    // fazemos o shuffle aqui no código da Edge Function.
    for (let i = allBanners.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allBanners[i], allBanners[j]] = [allBanners[j], allBanners[i]];
    }

    // 6. Limitar os banners
    allBanners = allBanners.slice(0, carouselSettings.max_banners_display);

    return new Response(JSON.stringify({ banners: allBanners }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Edge Function CRITICAL Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});