
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LearningOutcomeEvaluator } from './components/LearningOutcomeEvaluator';
import { OQFCreditCalculator } from './components/OQFCreditCalculator';
import { OQFCourseCompliance } from './components/OQFCourseCompliance';
import { Footer } from './components/Footer';

type Theme = 'light' | 'dark';
type Tab = 'evaluator' | 'calculator' | 'compliance';

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

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTab = window.localStorage.getItem('activeTab') as Tab | null;
      if (storedTab) return storedTab;
    }
    return 'evaluator';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-950">
      <Header theme={theme} toggleTheme={toggleTheme} />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col">
        {/* Tab Switcher */}
        <div className="max-w-4xl mx-auto w-full mb-10 flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-inner font-black uppercase text-[10px] tracking-widest">
            <button 
                onClick={() => setActiveTab('evaluator')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all duration-300 ${activeTab === 'evaluator' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                OQF LO Evaluator
            </button>
            <button 
                onClick={() => setActiveTab('calculator')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all duration-300 ${activeTab === 'calculator' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                OQF Credit & NLH 
            </button>
            <button 
                onClick={() => setActiveTab('compliance')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all duration-300 ${activeTab === 'compliance' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                OQF Course Compliance
            </button>
        </div>

        {activeTab === 'evaluator' ? (
          <LearningOutcomeEvaluator />
        ) : activeTab === 'calculator' ? (
          <OQFCreditCalculator />
        ) : (
          <OQFCourseCompliance />
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
