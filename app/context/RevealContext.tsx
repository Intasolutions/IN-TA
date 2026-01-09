'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type RevealContextType = {
    isRevealed: boolean;
    setRevealComplete: (val: boolean) => void;
};

const RevealContext = createContext<RevealContextType>({
    isRevealed: false,
    setRevealComplete: () => { },
});

export const RevealProvider = ({ children }: { children: ReactNode }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    useEffect(() => {
        // 🔓 unlock content on hard reload
        setIsRevealed(true);
    }, []);

    return (
        <RevealContext.Provider value={{ isRevealed, setRevealComplete: setIsRevealed }}>
            {children}
        </RevealContext.Provider>
    );
};


export const useReveal = () => useContext(RevealContext);
