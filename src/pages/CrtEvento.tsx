import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';

const CrtEvento: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 flex items-center">
                    <FileText className="h-7 w-7 mr-3" />
                    CRT Evento (Em Desenvolvimento)
                </h1>
                <Button 
                    onClick={() => navigate('/manager/dashboard')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Dashboard
                </Button>
            </div>

            {/* Conteúdo removido, deixando apenas uma mensagem simples */}
            <div className="text-center py-20 bg-black/60 border border-yellow-500/30 rounded-2xl">
                <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-white text-xl sm:text-2xl font-semibold mb-2">Funcionalidade CRT</h2>
                <p className="text-gray-400 text-base">
                    Esta funcionalidade está em desenvolvimento e será lançada em breve.
                </p>
            </div>
        </div>
    );
};

export default CrtEvento;