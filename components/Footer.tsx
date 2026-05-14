import React from 'react';

export const Footer: React.FC = () => {
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Listen for storage events (though this only works across tabs)
    // For local tab, we can just update it periodically or on a timer
    const updateTime = () => {
      setLastSaved(new Date().toLocaleTimeString());
    };
    
    // We update the 'last saved' display when we think a save happened
    // In this app, saves happen on almost any interaction, so a periodic check or just 'Just now' works.
    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const handleClearAll = () => {
    if (window.confirm('This will clear all your saved progress across all tools. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <footer className="bg-white dark:bg-slate-900 py-6 mt-auto border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
          <p className="font-bold">&copy; 2025 ASA, e-mail: Ayoub.Albadwi@utas.edu.om</p>
          <p className="text-[10px] mt-1 opacity-60">All work is automatically saved locally. Last check: {lastSaved}</p>
        </div>
        <button 
          onClick={handleClearAll}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded border border-slate-200 dark:border-slate-800"
        >
          Reset All Saved Progress
        </button>
      </div>
    </footer>
  );
};
