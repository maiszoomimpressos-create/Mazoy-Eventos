import React from 'react';

const IMAGE_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRb9tkUz7K0fr-IhkNzRJh_q2CHhfdFq0LBsduY7RfWZ4N_fI8htQL65pA4OswVdsPH8RC-oNAUlX9L0qgecUUOEQBh8zD2wYQcCBKPoCIF&s=10";

const CheckoutImageBanner: React.FC = () => {
    return (
        <div className="w-full mb-8">
            <img 
                src={IMAGE_URL} 
                alt="Banner Promocional de Checkout" 
                className="w-full h-auto max-h-48 object-cover rounded-xl shadow-lg border border-yellow-500/30"
            />
        </div>
    );
};

export default CheckoutImageBanner;