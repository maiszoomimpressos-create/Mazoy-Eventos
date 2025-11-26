// ... (código existente)
    // CORRIGIDO: Redireciona para a tela de detalhes do evento
    const handleEventClick = (event: PublicEvent) => {
        navigate(`/events/${event.id}`);
    };
// ... (código existente)