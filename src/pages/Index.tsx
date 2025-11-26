import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from 'lucide-react';
import EventCarousel from '@/components/EventCarousel';
import { categories } from '@/data/events';
import { usePublicEvents, PublicEvent } from '@/hooks/use-public-events';
import AuthStatusMenu from '@/components/AuthStatusMenu';

// Helper function to get the minimum price display
const getMinPriceDisplay = (price: number | null): string => {
    if (price === null || price === 0) return 'Grátis';
    return `R$ ${price.toFixed(0)}`;
};

const Index: React.FC = () => {
    const navigate = useNavigate();
    const { events, isLoading, isError } = usePublicEvents();
    const [searchTerm, setSearchTerm] = useState('');

    // Filtra eventos futuros
    const upcomingEvents = events.filter(event => event.raw_date >= new Date());

    const filteredEvents = upcomingEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEventClick = (event: PublicEvent) => {
        navigate(`/events/${event.id}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20">
                <p className="text-red-400">Erro ao carregar eventos. Tente recarregar a página.</p>
            </div>
        );
    }

    return (
        <div className="bg-black text-white">
            {/* Hero Section */}
            <section id="home" className="relative h-[60vh] sm:h-[80vh] flex items-center justify-center text-center overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://readdy.ai/api/search-image?query=luxury%20black%20and%20gold%20event%20venue%20with%20elegant%20lighting%20and%20premium%20atmosphere%2C%20sophisticated%20interior%20design%20with%20golden%20accents%20and%20dramatic%20shadows&width=1920&height=1080&seq=hero&orientation=landscape)' }}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                </div>
                <div className="relative z-10 max-w-4xl mx-auto px-4">
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif text-yellow-500 mb-6 animate-fadeInUp">
                        Experiências Premium. Ingressos Exclusivos.
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-300 mb-8 animate-fadeInUp delay-200">
                        Descubra os eventos mais sofisticados e garanta seu acesso VIP.
                    </p>
                    <div className="relative max-w-xl mx-auto animate-fadeInUp delay-400">
                        <Input 
                            type="search" 
                            placeholder="Buscar eventos, locais ou categorias..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 pl-12 pr-4 py-3 sm:py-4 rounded-xl text-base sm:text-lg"
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-500/60" />
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
                
                {/* Seção de Destaques (Carousel) */}
                <section id="destaques" className="mb-16 sm:mb-24">
                    <h2 className="text-3xl sm:text-4xl font-serif text-white mb-10 text-center">
                        Eventos em Destaque
                    </h2>
                    <EventCarousel events={upcomingEvents} />
                </section>

                {/* Seção de Categorias */}
                <section id="categorias" className="mb-16 sm:mb-24">
                    <h2 className="text-3xl sm:text-4xl font-serif text-white mb-10 text-center">
                        Explore por Categoria
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                        {categories.map(category => (
                            <Card 
                                key={category.id} 
                                className="bg-black/60 border border-yellow-500/30 rounded-2xl p-4 sm:p-6 text-center cursor-pointer hover:border-yellow-500/60 hover:bg-yellow-500/10 transition-all duration-300"
                                onClick={() => setSearchTerm(category.name)}
                            >
                                <i className={`${category.icon} text-3xl sm:text-4xl text-yellow-500 mb-3`}></i>
                                <p className="text-white font-semibold text-sm sm:text-base">{category.name}</p>
                                <p className="text-gray-400 text-xs mt-1">{category.count}+ eventos</p>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Seção de Todos os Eventos */}
                <section id="eventos">
                    <h2 className="text-3xl sm:text-4xl font-serif text-white mb-10 text-center">
                        {searchTerm ? `Resultados para "${searchTerm}"` : 'Próximos Eventos'}
                    </h2>
                    
                    {filteredEvents.length === 0 ? (
                        <div className="text-center p-12 bg-black/60 border border-yellow-500/30 rounded-2xl">
                            <i className="fas fa-search-minus text-5xl text-gray-600 mb-4"></i>
                            <p className="text-gray-400 text-lg">Nenhum evento encontrado com os critérios de busca.</p>
                            <Button 
                                onClick={() => setSearchTerm('')}
                                className="mt-6 bg-yellow-500 text-black hover:bg-yellow-600"
                            >
                                Limpar Busca
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredEvents.map(event => (
                                <Card 
                                    key={event.id} 
                                    className="bg-black/60 backdrop-blur-sm border border-yellow-500/30 rounded-2xl overflow-hidden cursor-pointer hover:border-yellow-500/60 transition-all duration-300 group"
                                    onClick={() => handleEventClick(event)}
                                >
                                    <CardContent className="flex flex-col p-0">
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={event.image_url}
                                                alt={event.title}
                                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                                                <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold mb-2 self-start">
                                                    {event.category}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <h3 className="text-xl font-serif text-white line-clamp-2 group-hover:text-yellow-400 transition-colors font-bold">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center text-sm text-gray-300">
                                                <i className="fas fa-calendar-alt mr-2 text-yellow-500"></i>
                                                {event.date}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-300">
                                                <i className="fas fa-map-marker-alt mr-2 text-yellow-500"></i>
                                                {event.location}
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-yellow-500/10">
                                                <span className="text-xl font-bold text-yellow-500 whitespace-nowrap">
                                                    {getMinPriceDisplay(event.min_price)}
                                                </span>
                                                <Button 
                                                    variant="default" 
                                                    className="bg-yellow-500 text-black hover:bg-yellow-600 px-4 py-2 text-sm"
                                                >
                                                    Ver Detalhes
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>
            
            {/* Footer Section */}
            <footer id="contato" className="bg-black border-t border-yellow-500/20 py-12 sm:py-16 px-4 sm:px-6">
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

export default Index;