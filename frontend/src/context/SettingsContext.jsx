import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext(null);

function getInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

export default function SettingsProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);
    const [targetPercentage, setTargetPercentageState] = useState(() => {
        const saved = Number(localStorage.getItem('targetPercentage'));
        return Number.isFinite(saved) && saved >= 1 && saved <= 100 ? saved : 75;
    });

    useEffect(() => {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        document.body.classList.toggle('light-theme', theme === 'light');
    }, [theme]);

    const handleThemeToggle = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    const setTargetPercentage = (value) => {
        const numeric = Math.min(100, Math.max(1, Math.round(Number(value) || 75)));
        setTargetPercentageState(numeric);
        localStorage.setItem('targetPercentage', String(numeric));
    };

    return (
        <SettingsContext.Provider value={{ theme, handleThemeToggle, targetPercentage, setTargetPercentage }}>
            {children}
        </SettingsContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext);
