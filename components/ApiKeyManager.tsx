
import React from 'react';
import { IconKey } from './Icon';

interface ApiKeyManagerProps {
  onKeySelected: () => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Assume key is selected after the dialog is triggered to avoid race conditions.
        onKeySelected();
      } catch (error) {
        console.error("Error opening API key selection dialog:", error);
        // You could show an error message to the user here.
      }
    } else {
      alert("API key selection is not available in this environment. Please ensure an API_KEY is configured.");
      console.error("API key selection mechanism is not available in this environment.");
    }
  };

  return (
    <div className="flex items-center justify-center flex-grow">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50">
          <IconKey className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
          API Key Required
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          To use the AI-powered features of this application, you need to select a Google AI API key. Your key is used only for this session and is not stored.
        </p>
        <div className="mt-6">
          <button
            onClick={handleSelectKey}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white text-md font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            Select API Key
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
          For information on billing, please visit the{' '}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-600 dark:hover:text-green-500">
            Gemini API billing documentation
          </a>.
        </p>
      </div>
    </div>
  );
};
