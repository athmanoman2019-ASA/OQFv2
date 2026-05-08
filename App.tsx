
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LearningOutcomeEvaluator } from './components/LearningOutcomeEvaluator';
import { Footer } from './components/Footer';

type Theme = 'light' | 'dark';

function App(): React.ReactElement {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme | null;
      if (storedTheme) {
        return storedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-950">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col">
        <LearningOutcomeEvaluator />
      </main>
      <Footer />
    </div>
  );
}

export default App;
