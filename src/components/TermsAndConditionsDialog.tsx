"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import MultiLineEditor from './MultiLineEditor'; // Importa o MultiLineEditor
import { FileText } from 'lucide-react';

interface TermsAndConditionsDialogProps {
    onAgree: (agreed: boolean) => void;
    initialAgreedState?: boolean;
    // Adiciona uma prop para controlar se o botão de concordar deve ser exibido
    showAgreementCheckbox?: boolean; 
}

const TermsAndConditionsDialog: React.FC<TermsAndConditionsDialogProps> = ({ 
    onAgree, 
    initialAgreedState = false,
    showAgreementCheckbox = true // Por padrão, mostra o checkbox
}) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [agreedInternally, setAgreedInternally] = useState(initialAgreedState);

    const handleAgreeChange = (agreed: boolean) => {
        setAgreedInternally(agreed);
        onAgree(agreed);
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm h-9 px-4"
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Termos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-black/90 border border-yellow-500/30 text-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-yellow-500 text-2xl flex items-center">
                        <FileText className="h-6 w-6 mr-2" />
                        Termos e Condições de Uso
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Leia atentamente nossos termos antes de prosseguir.
                    </DialogDescription>
                </DialogHeader>
                {/* Renderiza o MultiLineEditor dentro do Dialog */}
                <MultiLineEditor 
                    onAgree={handleAgreeChange} 
                    initialAgreedState={agreedInternally}
                    // Passa a prop para o MultiLineEditor para ele saber se deve mostrar o checkbox
                    showAgreementCheckbox={showAgreementCheckbox} 
                />
            </DialogContent>
        </Dialog>
    );
};

export default TermsAndConditionsDialog;