import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { SearchInput } from './components/seararchInput';
import { FilterBar } from './components/FilterBar';
import { ResultsSection } from'./components/ResultsSection';
import { AISummary } from './components/AISsmmary';
import { SavedSearches } from './components/SavedSearches';
import { SettingsModal } from './components/SettingsModal';
import { useSearch } from './hooks/useSearch';
import { FilterType, ModelProvider } from './types';
import { Settings, Bookmark, Search as SearchIcon } from 'lucide-react';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  const {
    query,
    setQuery,
    results,
    summary,
    loading,
    error,
    filters,
    setFilter,
    modelProvider,
    setModelProvider,
    performSearch,
    loadSavedSearch,
    savedSearches,
    saveCurrentSearch,
    deleteSavedSearch
  } = useSearrh();

  // Dark mode initialization
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <Layout toggleDarkMode={toggleDarkMode} onOpenSettings={() => setShowSettings(true)} onOpenSaved={() => setShowSaved(true)}>
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8 min-h-[calc(100vh-80px)]">
        
        {/* Header & Search */}
        <div className="flex flex-col items-center gap-6 mt-8 md:mt-16">
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              SmartSearch AI
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Powered by Exa & {modelProvider === ModelProvider.GEMINI ? 'Gemini 2.5' : modelProvider === ModelProvider.OPENAI ? 'OpenAI GPT-4' : 'Grok'}
            </p>
          </div>

          <div className="w-full max-w-2xl space-y-4">
            <SearchInput 
              value={query} 
              onChange={setQuery} 
              onSearch={performSearch} 
              loading={loading}
            />
            <FilterBar 
              activeFilter={filters.type} 
              onSelect={(f) => setFilter('type', f)} 
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Main Content Grid */}
        {(results.length > 0 || summary || loading) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* Left: AI Summary */}
            <div className="lg:col-span-1 order-2 lg:order-1">
               <AISummary summary={summary} loading={loading} model={modelProvider} />
            </div>

            {/* Right: Search Results */}
            <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                   <SearchIcon className="w-5 h-5 text-blue-500" />
                   Search Results
                 </h2>
                 {results.length > 0 && (
                   <button 
                    onClick={saveCurrentSearch}
                    className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium transition-colors"
                   >
                     <Bookmark className="w-4 h-4" /> Save Search
                   </button>
                 )}
              </div>
              <ResultsSection results={results} loading={loading} />
            </div>
          </div>
        )}

        {/* Empty State / Welcome */}
        {!loading && results.length === 0 && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 mt-12">
            <SearchIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Enter a query to explore the web with AI</p>
          </div>
        )}

      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          modelProvider={modelProvider}
          setModelProvider={setModelProvider}
        />
      )}
      
      {showSaved && (
        <SavedSearches 
          onClose={() => setShowSaved(false)}
          searches={savedSearches}
          onSelect={loadSavedSearch}
          onDelete={deleteSavedSearch}
        />
      )}
    </Layout>
  );
}
