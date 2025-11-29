import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface PublicEvent {
    id: string;
    title: string;
    description: string;
    date: string; // Keep as string for display
    raw_date: Date; // New: raw Date object for comparison
    time: string;
    location: string;
    image_url: string;
    category: string;
    min_price: number | null; // Preço mínimo calculado
    min_price_wristband_id: string | null;
    total_available_tickets: number; // New: total count of active wristbands for the event
    capacity: number; // New: event capacity from the 'events' table
    // NOVOS CAMPOS DO CARROSSEL
    is_featured_carousel: boolean;
    carousel_display_order: number | null;
    carousel_start_date: string | null; // Data formatada para exibição
    carousel_end_date: string | null;   // Data formatada para exibição
    carousel_headline: string | null;
    carousel_subheadline: string | null;
}

const fetchPublicEvents = async (): Promise<PublicEvent[]> => {
    // 1. Buscar todos os eventos com capacidade e os novos campos do carrossel
    const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
            id, title, description, date, time, location, image_url, category, capacity,
            is_featured_carousel, carousel_display_order, carousel_start_date, carousel_end_date,
            carousel_headline, carousel_subheadline
        `)
        .order('date', { ascending: true });

    if (eventsError) {
        console.error("Error fetching public events:", eventsError);
        throw new Error(eventsError.message);
    }
    
    const eventIds = eventsData.map(e => e.id);
    
    // 2. Buscar o preço mínimo e o ID da pulseira, e contar a disponibilidade para todos os eventos
    const { data: wristbandsData, error: wristbandsError } = await supabase
        .from('wristbands')
        .select('event_id, id, price, status')
        .in('event_id', eventIds); // Fetch all wristbands for these events

    if (wristbandsError) {
        console.error("Error fetching wristband data:", wristbandsError);
        // Continue without wristband data if there's an error
    }
    
    const eventAggregates = wristbandsData ? wristbandsData.reduce((acc, item) => {
        if (!acc[item.event_id]) {
            acc[item.event_id] = { min_price: Infinity, min_price_wristband_id: null, total_available_tickets: 0 };
        }

        const price = parseFloat(item.price as unknown as string) || 0; 
        
        if (item.status === 'active') {
            // Update min_price only for active wristbands
            if (price < acc[item.event_id].min_price) {
                acc[item.event_id].min_price = price;
                acc[item.event_id].min_price_wristband_id = item.id;
            }
            acc[item.event_id].total_available_tickets += 1;
        }
        return acc;
    }, {} as { [eventId: string]: { min_price: number; min_price_wristband_id: string | null; total_available_tickets: number } }) : {};

    // 3. Combinar dados e formatar
    return eventsData.map(event => {
        const aggregates = eventAggregates[event.id] || { min_price: Infinity, min_price_wristband_id: null, total_available_tickets: 0 };
        const minPrice = aggregates.min_price === Infinity ? null : aggregates.min_price;

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            date: new Date(event.date).toLocaleDateString('pt-BR'),
            raw_date: new Date(event.date), // Store raw date
            time: event.time,
            location: event.location,
            image_url: event.image_url,
            category: event.category,
            min_price: minPrice,
            min_price_wristband_id: aggregates.min_price_wristband_id,
            total_available_tickets: aggregates.total_available_tickets,
            capacity: event.capacity,
            // Mapeando os novos campos do carrossel
            is_featured_carousel: event.is_featured_carousel,
            carousel_display_order: event.carousel_display_order,
            carousel_start_date: event.carousel_start_date ? new Date(event.carousel_start_date).toLocaleDateString('pt-BR') : null,
            carousel_end_date: event.carousel_end_date ? new Date(event.carousel_end_date).toLocaleDateString('pt-BR') : null,
            carousel_headline: event.carousel_headline,
            carousel_subheadline: event.carousel_subheadline,
        };
    });
};

export const usePublicEvents = () => {
    const query = useQuery({
        queryKey: ['publicEvents'],
        queryFn: fetchPublicEvents,
        staleTime: 1000 * 60 * 5, // 5 minutes
        onError: (error) => {
            console.error("Query Error: Failed to load public events.", error);
            showError("Erro ao carregar a lista de eventos.");
        }
    });

    return {
        ...query,
        events: query.data || [],
    };
};