import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEventDetails, TicketType } from '@/hooks/use-event-details';
import { Loader2, Car, Road, BookOpen, MapPin, Clock, Users, UserCheck, User, Shield, ArrowRight } from 'lucide-react';
import { showError } from '@/utils/toast';
import EventBanner from '@/components/EventBanner';

// Hardcoded highlights for the requested layout structure (Expo Carros Clássicos)
const HIGHLIGHTS = [
    { icon: 'fas fa-car', title: 'Carros Únicos' },
    { icon: 'fas fa-road', title: 'Test Drives' },
    { icon: 'fas fa-chalkboard-teacher', title: 'Palestras Técnicas' },
];

// Helper function to get the minimum price from ticket types
const getMinPriceDisplay = (ticketTypes: TicketType[] | undefined) => {
    if (!ticketTypes || ticketTypes.length === 0) return 'Sem ingressos ativos';
    const minPrice = Math.min(...ticketTypes.map(t => t.price));
    // Se o preço for 0, exibe "R$ 0,00". Caso contrário, formata o preço.
    return `R$ ${minPrice.toFixed(2).replace('.', ',')}`;
};

const EventDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { details, isLoading, isError } = useEventDetails(id);
    
    const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({});

    const handleTicketChange = (ticketId: string, quantity: number) => {
        setSelectedTickets(prev => ({
            ...prev,
            [ticketId]: Math.max(0, quantity)
        }));
    };

    const getTotalPrice = () => {
        if (!details) return 0;
        return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
            const ticket = details.ticketTypes.find((t: TicketType) => t.id === ticketId);
            return total + (ticket ? ticket.price * quantity : 0);
        }, 0);
    };

    const getTotalTickets = () => {
        return Object.values(selectedTickets).reduce((total, quantity) => total + quantity, 0);
    };
    
    const handleCheckout = () => {
        const totalTickets = getTotalTickets();
        if (totalTickets === 0) {
            showError("Selecione pelo menos um ingresso para continuar.");
            return;
        }
        
        const ticketsToPurchase = Object.entries(selectedTickets)
            .filter(([, quantity]) => quantity > 0)
            .map(([ticketId, quantity]) => {
                const ticketDetails = details?.ticketTypes.find(t => t.id === ticketId);
                return {
                    ticketId,
                    quantity,
                    price: ticketDetails?.price || 0,
                    name: ticketDetails?.name || 'Ingresso',
                };
            });

        navigate('/finalizar-compra', { 
            state: { 
                eventId: id,
                tickets: ticketsToPurchase,
                totalPrice: getTotalPrice(),
            } 
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (isError || !details) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20 px-4">
                <h1 className="text-4xl font-serif text-red-500 mb-4">Erro 404</h1>
                <p className="text-xl text-gray-400 mb-6">Evento não encontrado ou indisponível.</p>
                <Button onClick={() => navigate('/')} className="bg-yellow-500 text-black hover:bg-yellow-600">
                    Voltar para a Home
                </Button>
            </div>
        );
    }
    
    const { event, ticketTypes } = details;
    const minPriceDisplay = getMinPriceDisplay(ticketTypes);
    
    const organizerName = event.companies?.corporate_name || 'N/A';
    const capacityDisplay = event.capacity > 0 ? event.capacity.toLocaleString('pt-BR') : 'N/A';
    const durationDisplay = event.duration || 'N/A';
    const classificationDisplay = event.min_age === 0 ? 'Livre' : `${event.min_age} anos`;

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* 1. Cabeçalho do Evento (Banner) */}
            <section className="relative h-[450px] md:h-[600px] lg:h-[700px] overflow-hidden -mt-20">
                <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover object-top"
                />
                {/* Overlay escuro com gradiente */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40"></div>
                
                <div className="absolute inset-0 flex items-end pb-16 pt-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                        <div className="max-w-full lg:max-w-4xl">
                            {/* Categoria (Badge) */}
                            <div className="inline-block bg-yellow-500 text-black px-4 py-1.5 rounded-lg text-sm sm:text-base font-semibold mb-4">
                                {event.category}
                            </div>
                            
                            {/* Título Principal (H1) */}
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif text-white mb-4 sm:mb-6 leading-tight drop-shadow-lg">
                                {event.title}
                            </h1>
                            
                            {/* Subtítulo / Descrição Curta */}
                            <p className="text-base sm:text-xl text-gray-200 mb-6 sm:mb-10 leading-relaxed line-clamp-3 drop-shadow-md">
                                {event.description}
                            </p>
                            
                            {/* Informações do Evento — linha de 3 colunas */}
                            <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8 sm:mb-12">
                                {/* Data */}
                                <div className="flex items-center">
                                    <i className="fas fa-calendar-alt text-yellow-500 text-2xl mr-3"></i>
                                    <div>
                                        <div className="text-xs text-gray-400">Data</div>
                                        <div className="text-lg font-bold text-white">{new Date(event.date).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>
                                {/* Horário */}
                                <div className="flex items-center">
                                    <i className="fas fa-clock text-yellow-500 text-2xl mr-3"></i>
                                    <div>
                                        <div className="text-xs text-gray-400">Horário</div>
                                        <div className="text-lg font-bold text-white">{event.time}</div>
                                    </div>
                                </div>
                                {/* Local */}
                                <div className="flex items-center">
                                    <i className="fas fa-map-marker-alt text-yellow-500 text-2xl mr-3"></i>
                                    <div>
                                        <div className="text-xs text-gray-400">Local</div>
                                        <div className="text-lg font-bold text-white">{event.location}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Preço Inicial e Botão */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                                <span className="text-3xl sm:text-4xl font-bold text-yellow-500">
                                    A partir de {minPriceDisplay}
                                </span>
                                <Button 
                                    onClick={() => {
                                        // Rola para a seção de ingressos
                                        document.getElementById('ingressos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-600 px-8 py-3 text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer hover:scale-105"
                                >
                                    Comprar Ingressos
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Linha divisória */}
            <div className="w-full h-px bg-yellow-500"></div>
            
            <section className="py-12 sm:py-20 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                        
                        {/* Coluna Principal (Detalhes) */}
                        <div className="lg:col-span-2 space-y-8 sm:space-y-12 order-2 lg:order-1">
                            
                            {/* 2. Seção "Sobre o Evento" */}
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-serif text-yellow-500 mb-4 sm:mb-6">Sobre o Evento</h2>
                                <div className="bg-black/60 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 sm:p-8">
                                    <p className="text-gray-300 text-sm sm:text-lg leading-relaxed mb-6">
                                        {event.description}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-yellow-500/10">
                                        {/* Capacidade */}
                                        <div className="flex items-center text-sm sm:text-base">
                                            <Users className="text-yellow-500 mr-3 h-5 w-5" />
                                            <div>
                                                <div className="text-xs text-gray-400">Capacidade</div>
                                                <span className="text-white font-semibold">{capacityDisplay} pessoas</span>
                                            </div>
                                        </div>
                                        {/* Duração */}
                                        <div className="flex items-center text-sm sm:text-base">
                                            <Clock className="text-yellow-500 mr-3 h-5 w-5" />
                                            <div>
                                                <div className="text-xs text-gray-400">Duração</div>
                                                <span className="text-white font-semibold">{durationDisplay}</span>
                                            </div>
                                        </div>
                                        {/* Classificação */}
                                        <div className="flex items-center text-sm sm:text-base">
                                            <UserCheck className="text-yellow-500 mr-3 h-5 w-5" />
                                            <div>
                                                <div className="text-xs text-gray-400">Classificação</div>
                                                <span className="text-white font-semibold">{classificationDisplay}</span>
                                            </div>
                                        </div>
                                        {/* Organizador */}
                                        <div className="flex items-center text-sm sm:text-base">
                                            <User className="text-yellow-500 mr-3 h-5 w-5" />
                                            <div>
                                                <div className="text-xs text-gray-400">Organizador</div>
                                                <span className="text-white font-semibold">{organizerName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 3. Seção “Destaques do Evento” */}
                            <div>
                                <h3 className="text-xl sm:text-2xl font-serif text-yellow-500 mb-4 sm:mb-6">Destaques do Evento</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {HIGHLIGHTS.map((highlight, index) => (
                                        <Card 
                                            key={index} 
                                            className="bg-black/60 border border-yellow-500/30 rounded-2xl p-6 text-center hover:border-yellow-500/60 transition-all duration-300"
                                        >
                                            <i className={`${highlight.icon} text-3xl text-yellow-500 mb-3`}></i>
                                            <p className="text-white font-semibold text-sm">{highlight.title}</p>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            
                            {/* 4. Seção “Localização” */}
                            <div>
                                <h3 className="text-xl sm:text-2xl font-serif text-yellow-500 mb-4 sm:mb-6">Localização</h3>
                                <div className="bg-black/60 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 sm:p-8">
                                    <div className="flex items-start space-x-4 mb-6">
                                        <MapPin className="text-yellow-500 h-6 w-6 mt-1 flex-shrink-0" />
                                        <div>
                                            <h4 className="text-white font-semibold text-base sm:text-lg mb-2">{event.location}</h4>
                                            <p className="text-gray-300 text-sm sm:text-base">{event.address}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 rounded-xl h-48 sm:h-64 flex items-center justify-center">
                                        <div className="text-center">
                                            <i className="fas fa-map text-yellow-500 text-3xl sm:text-4xl mb-4"></i>
                                            <p className="text-gray-400 text-sm">Mapa interativo em breve</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Coluna de Ingressos (Sidebar) */}
                        <div id="ingressos" className="lg:col-span-1 order-1 lg:order-2">
                            <div className="lg:sticky lg:top-24">
                                <div className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 sm:p-8">
                                    <h3 className="text-xl sm:text-2xl font-serif text-yellow-500 mb-6">Selecionar Ingressos</h3>
                                    <div className="space-y-6">
                                        {ticketTypes.length > 0 ? (
                                            ticketTypes.map((ticket: TicketType) => (
                                                <div key={ticket.id} className="bg-black/60 border border-yellow-500/20 rounded-xl p-4 sm:p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="text-white font-semibold text-base sm:text-lg">{ticket.name}</h4>
                                                            <p className="text-gray-400 text-xs sm:text-sm mt-1 line-clamp-2">{ticket.description}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-4">
                                                            <div className="text-xl sm:text-2xl font-bold text-yellow-500">R$ {ticket.price.toFixed(2).replace('.', ',')}</div>
                                                            <div className="text-xs sm:text-sm text-gray-400">{ticket.available} disponíveis</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-yellow-500/10">
                                                        <span className="text-white text-sm sm:text-base">Quantidade:</span>
                                                        <div className="flex items-center space-x-3">
                                                            <button
                                                                onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) - 1)}
                                                                className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500/20 border border-yellow-500/40 rounded-full flex items-center justify-center text-yellow-500 hover:bg-yellow-500/30 transition-all duration-300 cursor-pointer"
                                                                disabled={ticket.available === 0 || (selectedTickets[ticket.id] || 0) === 0}
                                                            >
                                                                <i className="fas fa-minus text-xs"></i>
                                                            </button>
                                                            <span className="text-white font-semibold w-6 sm:w-8 text-center text-sm sm:text-base">
                                                                {selectedTickets[ticket.id] || 0}
                                                            </span>
                                                            <button
                                                                onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) + 1)}
                                                                className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500/20 border border-yellow-500/40 rounded-full flex items-center justify-center text-yellow-500 hover:bg-yellow-500/30 transition-all duration-300 cursor-pointer"
                                                                disabled={(selectedTickets[ticket.id] || 0) >= ticket.available}
                                                            >
                                                                <i className="fas fa-plus text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center p-4 bg-black/60 rounded-xl border border-red-500/30">
                                                <p className="text-red-400 text-sm">Nenhum tipo de ingresso ativo encontrado para este evento.</p>
                                            </div>
                                        )}
                                    </div>
                                    {getTotalTickets() > 0 && (
                                        <>
                                            <div className="border-t border-yellow-500/20 pt-6 mt-6">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-white text-base">Total de Ingressos:</span>
                                                    <span className="text-white font-semibold text-base">{getTotalTickets()}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-white text-lg sm:text-xl">Total a Pagar:</span>
                                                    <span className="text-yellow-500 text-xl sm:text-2xl font-bold">R$ {getTotalPrice().toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={handleCheckout}
                                                className="w-full bg-yellow-500 text-black hover:bg-yellow-600 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer hover:scale-105"
                                            >
                                                Comprar Ingressos
                                            </Button>
                                        </>
                                    )}
                                    {/* Aviso de Compra Segura */}
                                    <div className="mt-6 p-4 bg-black/40 rounded-xl border border-yellow-500/20 flex items-start space-x-3">
                                        <Shield className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-white font-semibold text-sm mb-1">Compra Segura</h4>
                                            <p className="text-gray-400 text-xs">
                                                Seus dados estão protegidos e a compra é 100% segura.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <footer className="bg-black border-t border-yellow-500/20 py-12 sm:py-16 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 sm:mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="text-xl sm:text-2xl font-serif text-yellow-500 font-bold mb-4">
                                Mazoy
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                A plataforma premium para eventos exclusivos e experiências inesquecíveis.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4 text-base sm:text-lg">Links Úteis</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Sobre Nós</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Como Funciona</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Termos de Uso</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Privacidade</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4 text-base sm:text-lg">Suporte</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Central de Ajuda</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Contato</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">FAQ</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">Feedback</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4 text-base sm:text-lg">Redes Sociais</h4>
                            <div className="flex space-x-4">
                                <a href="#" className="text-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer">
                                    <i className="fab fa-instagram text-xl sm:text-2xl"></i>
                                </a>
                                <a href="#" className="text-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer">
                                    <i className="fab fa-facebook text-xl sm:text-2xl"></i>
                                </a>
                                <a href="#" className="text-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer">
                                    <i className="fab fa-twitter text-xl sm:text-2xl"></i>
                                </a>
                                <a href="#" className="text-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer">
                                    <i className="fab fa-linkedin text-xl sm:text-2xl"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-yellow-500/20 pt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            © 2025 Mazoy. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default EventDetails;