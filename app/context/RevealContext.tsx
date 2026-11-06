'use client';

import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

type RevealContextType = {
    // True once the page loader / route mask has fully cleared the screen
    isIntroReady: boolean;
    setIntroReady: (val: boolean) => void;
};

const RevealContext = createContext<RevealContextType>({
    isIntroReady: false,
    setIntroReady: () => { },
});

export const RevealProvider = ({ children }: { children: ReactNode }) => {
    const [isIntroReady, setIntroReady] = useState(false);
    const value = useMemo(() => ({ isIntroReady, setIntroReady }), [isIntroReady]);

    return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
};

export const useReveal = () => useContext(RevealContext);
