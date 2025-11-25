import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface PublicEvent {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    image_url: string;
    category: string;
    min_price: number | null; // Preço mínimo calculado
    min_price_wristband_id: string | null; // NOVO: ID da pulseira com o preço mínimo
}

const fetchPublicEvents = async (): Promise<PublicEvent[]> => {
    // 1. Buscar todos os eventos
    const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

    if (eventsError) {
        console.error("Error fetching public events:", eventsError);
        throw new Error(eventsError.message);
    }
    
    const eventIds = eventsData.map(e => e.id);
    
    // 2. Buscar o preço mínimo e o ID da pulseira para todos os eventos em uma única query
    const { data: wristbandsData, error: pricesError } = await supabase
        .from('wristbands')
        .select('event_id, id, price') // Selecionando também o ID da pulseira
        .in('event_id', eventIds)
        .eq('status', 'active');

    if (pricesError) {
        console.error("Error fetching wristband prices:", pricesError);
        // Não lançamos erro aqui, apenas continuamos sem preços se falhar
    }
    
    const minPricesMap = wristbandsData ? wristbandsData.reduce((acc, item) => {
        const price = parseFloat(item.price as unknown as string) || 0; 
        
        if (!acc[item.event_id] || price < acc[item.event_id].price) {
            acc[item.event_id] = { price: price, wristband_id: item.id };
        }
        return acc;
    }, {} as { [eventId: string]: { price: number; wristband_id: string } }) : {};

    // 3. Combinar dados e formatar
    return eventsData.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: new Date(event.date).toLocaleDateString('pt-BR'), // Formatando a data para exibição
        time: event.time,
        location: event.location,
        image_url: event.image_url,
        category: event.category,
        min_price: minPricesMap[event.id] !== undefined ? minPricesMap[event.id].price : null,
        min_price_wristband_id: minPricesMap[event.id] !== undefined ? minPricesMap[event.id].wristband_id : null, // NOVO
    }));
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