import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useEventDetails } from '@/hooks/use-event-details';

// Define minimal types needed for the order state
interface OrderItem {
    eventId: string;
}

interface OrderState {
    items: OrderItem[];
}

const Checkout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const order = location.state as OrderState;

    // Extrai o eventId do primeiro item do pedido, se disponível
    const eventId = order?.items?.[0]?.eventId;
    const { details: eventDetails, isLoading: isLoadingEventDetails, isError: isErrorEventDetails } = useEventDetails(eventId);

    // Validação simplificada para garantir que temos um ID de evento
    const isOrderValid = !!eventId;

    if (!isOrderValid) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20 px-4">
                <h1 className="text-4xl font-serif text-red-500 mb-4">Pedido Inválido</h1>
                <p className="text-xl text-gray-400 mb-6">Não foi possível carregar os detalhes do pedido.</p>
                <Button onClick={() => navigate('/')} className="bg-yellow-500 text-black hover:bg-yellow-600">
                    Voltar para a Home
                </Button>
            </div>
        );
    }

    if (isLoadingEventDetails) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
                <p className="ml-4 text-gray-400">Carregando nome do evento...</p>
            </div>
        );
    }

    if (isErrorEventDetails || !eventDetails) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20 px-4">
                <h1 className="text-4xl font-serif text-red-500 mb-4">Erro ao Carregar Evento</h1>
                <p className="text-xl text-gray-400 mb-6">Não foi possível carregar os detalhes do evento.</p>
                <Button onClick={() => navigate('/')} className="bg-yellow-500 text-black hover:bg-yellow-600">
                    Voltar para a Home
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-serif text-yellow-500 mb-4">
                    Evento: {eventDetails.event.title}
                </h1>
                <Button
                    onClick={() => navigate(-1)}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm mt-6"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>
        </div>
    );
};

export default Checkout;