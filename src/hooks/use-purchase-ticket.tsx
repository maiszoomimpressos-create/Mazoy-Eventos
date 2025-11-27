import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface PurchaseItem {
    ticketTypeId: string; // ID da pulseira base (wristband ID)
    quantity: number;
    price: number; // Valor unitário
}

interface PurchaseDetails {
    eventId: string; // UUID do evento
    purchaseItems: PurchaseItem[];
}

export const usePurchaseTicket = () => {
    const [isLoading, setIsLoading] = useState(false);

    const purchaseTicket = async (details: PurchaseDetails) => {
        const { eventId, purchaseItems } = details;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showError("Você precisa estar logado para finalizar a compra.");
            return false;
        }
        
        const totalTickets = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalTickets <= 0) {
            showError("A quantidade de ingressos deve ser maior que zero.");
            return false;
        }

        setIsLoading(true);

        try {
            // 1. Chamar a Edge Function para processar a transação
            const { data: responseData, error: edgeError } = await supabase.functions.invoke('process-ticket-purchase', {
                body: {
                    eventId: eventId,
                    purchaseItems: purchaseItems,
                },
            });

            if (edgeError) {
                // Erro de rede ou erro interno da Edge Function
                throw new Error(edgeError.message);
            }
            
            if (responseData.error) {
                // Erro de lógica de negócio retornado pela Edge Function (ex: sem estoque, falha no pagamento)
                throw new Error(responseData.error);
            }
            
            // 2. Sucesso
            showSuccess(`Compra de ${totalTickets} ingressos concluída com sucesso!`);
            return true;

        } catch (error: any) {
            console.error("Transaction Error:", error);
            showError(error.message || "Falha na transação de compra. Tente novamente.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        purchaseTicket,
    };
};