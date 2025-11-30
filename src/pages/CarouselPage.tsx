import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCarousel from '@/components/EventCarousel';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const CarouselPage: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
            setIsLoadingUser(false);
        });
    }, []);

    if (isLoadingUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-20 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-serif text-yellow-500 mb-8">Carrossel de Destaques</h1>
                <p className="text-gray-400 mb-12">Visualização do carrossel principal da página inicial.</p>
                
                <EventCarousel userId={userId} />

                <div className="mt-12 text-center">
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-yellow-500 text-black hover:bg-yellow-600 py-3 px-8 text-lg font-semibold rounded-xl transition-all duration-300 cursor-pointer"
                    >
                        Voltar para a Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CarouselPage;