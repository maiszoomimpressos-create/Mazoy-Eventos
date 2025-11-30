import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10">
                <CardHeader>
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Funcionalidade CRT</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Esta página será usada para gerenciar a funcionalidade CRT (Certificado de Registro de Título) do evento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="text-center py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                        <p className="text-gray-400">A funcionalidade de CRT está sendo implementada.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CrtEvento;