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
    image_url: "https://readdy.ai/api/search-image?query=premium%20concert%20hall%20with%20golden%20stage%20lighting%20and%20black%20elegant%20seating%20luxury%20entertainment%20venue%20with%20sophisticated%20ambiance%20and%20dramatic%20illumination&width=1200&height=400&seq=banner2&orientation=landscape",
    link_url: "/manager/register",
    display_order: 2,
  },
];

// Função de embaralhamento Fisher-Yates (para garantir aleatoriedade no Deno)
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  try {
    // Tenta ler o corpo APENAS se o Content-Type for JSON
    let body = {};
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        try {
            body = await req.json();
        } catch (e) {
            // Ignora erro de corpo vazio ou mal formatado se for uma chamada GET/POST sem payload
        }
    }
    
    const { user_id, user_latitude, user_longitude } = body as { user_id?: string, user_latitude?: number, user_longitude?: number };

    // 1. Buscar configurações globais do carrossel
    const { data: settings, error: settingsError } = await supabase
      .from('carousel_settings')
      .select('max_banners_display')
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error("[ERROR] Failed to fetch carousel settings:", settingsError);
      // Não lança erro, usa default
    }

    const maxBannersDisplay = settings?.max_banners_display || 5;

    let allBanners: any[] = [];

    // 2. Buscar banners de eventos do carrossel
    const { data: eventCarouselBanners, error: eventCarouselError } = await supabase
      .from('event_carousel_banners')
      .select(`
        id, event_id, image_url, headline, subheadline, display_order, start_date, end_date,
        events (id, title, description, category, location, date, time, latitude, longitude)
      `);

    if (eventCarouselError) {
        console.error("[ERROR] Failed to fetch event carousel banners:", eventCarouselError);
    }

    // 3. Buscar banners promocionais
    const { data: promotionalBanners, error: promoBannersError } = await supabase
      .from('promotional_banners')
      .select(`
        id, image_url, headline, subheadline, display_order, start_date, end_date, link_url
      `);

    if (promoBannersError) console.error("[ERROR] Failed to fetch promotional banners:", promoBannersError);

    // 4. Combinar e formatar banners
    const eventIds = (eventCarouselBanners || []).map(b => b.event_id);
    let eventMinPrices: { [eventId: string]: number } = {};

    if (eventIds.length > 0) {
        const { data: wristbandsData } = await supabase
            .from('wristbands')
            .select('event_id, price, status')
            .in('event_id', eventIds)
            .eq('status', 'active');

        eventMinPrices = (wristbandsData || []).reduce((acc, item) => {
            const price = parseFloat(item.price as unknown as string) || 0;
            if (!acc[item.event_id] || price < acc[item.event_id]) {
                acc[item.event_id] = price;
            }
            return acc;
        }, {} as { [eventId: string]: number });
    }

    (eventCarouselBanners || []).forEach(banner => {
        if (banner.events) {
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

    (promotionalBanners || []).forEach(banner => {
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

    // 5. Se não houver banners reais, usa os dados de exemplo
    if (allBanners.length === 0) {
        console.log("[DEBUG] No real banners found. Using dummy data for carousel.");
        allBanners = DUMMY_CAROUSEL_BANNERS;
    }

    // 6. Implementar ordenação aleatória (shuffle)
    allBanners = shuffleArray(allBanners);

    // 7. Limitar os banners
    allBanners = allBanners.slice(0, maxBannersDisplay);

    return new Response(JSON.stringify({ banners: allBanners }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Edge Function CRITICAL Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500, // Retorna 500 em caso de erro crítico
      headers: corsHeaders,
    });
  }
});