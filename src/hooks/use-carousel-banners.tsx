import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface CarouselBanner {
    id: string;
    type: 'event' | 'promotional';
    image_url: string;
    headline: string;
    subheadline: string;
    link_url?: string; // Para banners promocionais
    event_id?: string; // Para banners de evento
    min_price?: number | null;
    location?: string;
    date?: string;
    time?: string;
    display_order: number;
}

const fetchCarouselBanners = async (): Promise<CarouselBanner[]> => {
    // A Edge Function fetch-carousel-events lida com a lógica de ordenação, fallback e limite.
    // Não passamos user_id, latitude ou longitude por enquanto, mas a função está pronta para recebê-los.
    
    const { data, error } = await supabase.functions.invoke('fetch-carousel-events', {
        method: 'POST',
        body: {}, // Corpo vazio por enquanto, mas pode incluir localização do usuário
    });

    if (error) {
        console.error("Error invoking fetch-carousel-events Edge Function:", error);
        throw new Error(error.message);
    }
    
    if (data.error) {
        console.error("Edge Function returned error:", data.error);
        throw new Error(data.error);
    }

    return data.banners as CarouselBanner[];
};

export const useCarouselBanners = () => {
    const query = useQuery({
        queryKey: ['carouselBanners'],
        queryFn: fetchCarouselBanners,
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load carousel banners.", error);
            showError("Erro ao carregar o carrossel de eventos.");
        }
    });

    return {
        ...query,
        banners: query.data || [],
    };
};