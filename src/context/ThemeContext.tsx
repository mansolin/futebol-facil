'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const stored = localStorage.getItem('theme') as Theme | null;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = stored ?? (systemDark ? 'dark' : 'light');
        setTheme(initial);
        document.documentElement.classList.toggle('dark', initial === 'dark');
    }, []);

    const toggleTheme = () => {
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', next);
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    return useContext(ThemeContext);
}
