'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type RevealContextType = {
    isRevealed: boolean;
    setRevealComplete: (val: boolean) => void;
    // True once the page loader / route mask has fully cleared the screen
    isIntroReady: boolean;
    setIntroReady: (val: boolean) => void;
};

const RevealContext = createContext<RevealContextType>({
    isRevealed: false,
    setRevealComplete: () => { },
    isIntroReady: false,
    setIntroReady: () => { },
});

export const RevealProvider = ({ children }: { children: ReactNode }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const [isIntroReady, setIntroReady] = useState(false);

    useEffect(() => {
        // 🔓 unlock content on hard reload
        setIsRevealed(true);
    }, []);

    return (
        <RevealContext.Provider value={{ isRevealed, setRevealComplete: setIsRevealed, isIntroReady, setIntroReady }}>
            {children}
        </RevealContext.Provider>
    );
};


export const useReveal = () => useContext(RevealContext);
