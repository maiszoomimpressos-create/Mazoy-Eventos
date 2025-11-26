import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEventDetails } from '@/hooks/use-event-details';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError } from '@/utils/toast';
import EventBanner from '@/components/EventBanner';
import CheckoutImageBanner from '@/components/CheckoutImageBanner';

interface TicketPurchase {
    ticketId: string;
    quantity: number;
    price: number;
    name: string;
}

interface LocationState {
    eventId: string;
    tickets: TicketPurchase[];
    totalPrice: number;
}

// Helper function to get the minimum price display
const getPriceDisplay = (price: number): string => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

const FinalizarCompra: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // 1. Obter o ID do evento e os detalhes da compra do estado de navegação
    const state = location.state as LocationState | undefined;
    const eventId = state?.eventId;
    const ticketsToPurchase = state?.tickets || [];
    const totalPrice = state?.totalPrice || 0;

    // 2. Buscar os detalhes do evento
    const { details, isLoading, isError } = useEventDetails(eventId);

    React.useEffect(() => {
        if (!eventId || ticketsToPurchase.length === 0) {
            showError("Nenhum evento ou ingresso selecionado para a compra.");
            navigate('/', { replace: true });
        }
    }, [eventId, ticketsToPurchase.length, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (isError || !details || !eventId || ticketsToPurchase.length === 0) {
        // Se a validação do useEffect falhar, o usuário será redirecionado.
        // Enquanto isso, mostramos um spinner ou um erro genérico.
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }
    
    const { event } = details;
    const minPriceDisplay = getPriceDisplay(totalPrice); // Usando o preço total para o banner

    return (
        <div className="bg-black text-white">
            {/* Componente de Banner no Topo (sem botão de ação) */}
            <EventBanner event={event} minPriceDisplay={minPriceDisplay} showActionButton={false} />
            
            {/* Conteúdo principal da finalização de compra */}
            <main className="py-12 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif text-yellow-500">Finalizar Compra</h2>
                    <Button 
                        onClick={() => navigate(`/events/${eventId}`)}
                        variant="outline"
                        className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar ao Evento
                    </Button>
                </div>
                
                {/* NOVO COMPONENTE DE IMAGEM */}
                <CheckoutImageBanner />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    {/* Coluna 1: Resumo da Compra */}
                    <div className="lg:col-span-1">
                        <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-white text-xl">Resumo do Pedido</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                                <div className="space-y-3 border-b border-yellow-500/20 pb-4">
                                    {ticketsToPurchase.map((ticket, index) => (
                                        <div key={index} className="flex justify-between text-sm text-gray-300">
                                            <span className="truncate max-w-[70%]">{ticket.quantity}x {ticket.name}</span>
                                            <span className="text-white font-medium">{getPriceDisplay(ticket.price * ticket.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-white text-lg">Total:</span>
                                    <span className="text-yellow-500 text-2xl font-bold">{getPriceDisplay(totalPrice)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    {/* Coluna 2: Detalhes do Pagamento (Placeholder) */}
                    <div className="lg:col-span-2">
                        <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6">
                            <CardHeader className="p-0 mb-6">
                                <CardTitle className="text-white text-xl">Informações de Pagamento</CardTitle>
                                <CardDescription className="text-gray-400 text-sm">Selecione o método de pagamento e finalize a compra.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 space-y-6">
                                <div className="bg-black/60 p-4 rounded-xl border border-yellow-500/20 text-center text-gray-400">
                                    <i className="fas fa-credit-card text-3xl mb-3 text-yellow-500"></i>
                                    <p>Formulário de pagamento e integração com gateway serão implementados aqui.</p>
                                </div>
                                <Button
                                    className="w-full bg-yellow-500 text-black hover:bg-yellow-600 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer hover:scale-105"
                                    onClick={() => alert("Simulando finalização de compra...")}
                                >
                                    Finalizar Compra Segura
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FinalizarCompra;