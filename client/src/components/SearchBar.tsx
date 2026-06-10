import React, { useState, useEffect, useRef } from 'react';
import { Search, X, PawPrint, Dna, Heart, Activity, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  searchApi,
  SearchResponse,
} from '../services/api';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchApi.search(query.trim());
        setResults(data);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('搜索失败:', error.message);
        } else {
          console.error('搜索失败:', error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults(null);
    inputRef.current?.focus();
  };

  const handleResultClick = (url: string) => {
    navigate(url);
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  const hasResults = results && (
    results.pets.length > 0 ||
    results.breeds.length > 0 ||
    results.geneMarkers.length > 0 ||
    results.diseases.length > 0 ||
    results.breedingPairs.length > 0
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="搜索宠物名称、品种、基因标记、遗传病、繁殖配对..."
          className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (query || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 max-h-[500px] overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              搜索中...
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="p-2">
              {results!.pets.length > 0 && (
                <SearchResultGroup
                  title="宠物名称"
                  icon={<PawPrint className="w-4 h-4" />}
                  items={results!.pets.map((pet) => ({
                    id: pet.id,
                    primary: pet.name,
                    secondary: pet.breed || pet.species,
                    url: `/pets/${pet.id}`,
                  }))}
                  onClick={handleResultClick}
                />
              )}

              {results!.breeds.length > 0 && (
                <SearchResultGroup
                  title="品种"
                  icon={<Tag className="w-4 h-4" />}
                  items={results!.breeds.map((pet) => ({
                    id: pet.id,
                    primary: pet.breed || '未知品种',
                    secondary: `${pet.name} · ${pet.species}`,
                    url: `/pets/${pet.id}`,
                  }))}
                  onClick={handleResultClick}
                />
              )}

              {results!.geneMarkers.length > 0 && (
                <SearchResultGroup
                  title="基因标记"
                  icon={<Dna className="w-4 h-4" />}
                  items={results!.geneMarkers.map((marker) => ({
                    id: marker.id,
                    primary: marker.markerName,
                    secondary: `${marker.geneName} · ${marker.disease}`,
                    url: `/risk-prediction`,
                  }))}
                  onClick={handleResultClick}
                />
              )}

              {results!.diseases.length > 0 && (
                <SearchResultGroup
                  title="遗传病"
                  icon={<Activity className="w-4 h-4" />}
                  items={results!.diseases.map((marker) => ({
                    id: marker.id,
                    primary: marker.disease,
                    secondary: `${marker.markerName} · ${marker.geneName}`,
                    url: `/risk-prediction`,
                  }))}
                  onClick={handleResultClick}
                />
              )}

              {results!.breedingPairs.length > 0 && (
                <SearchResultGroup
                  title="繁殖配对"
                  icon={<Heart className="w-4 h-4" />}
                  items={results!.breedingPairs.map((pair) => ({
                    id: pair.id,
                    primary: pair.name || `${pair.male.name} × ${pair.female.name}`,
                    secondary: `${pair.male.breed || ''} × ${pair.female.breed || ''}`,
                    url: `/breeding/${pair.id}`,
                  }))}
                  onClick={handleResultClick}
                />
              )}
            </div>
          )}

          {!isLoading && !hasResults && query && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">未找到与 "{query}" 相关的结果</p>
              <p className="text-xs text-gray-400 mt-1">试试其他关键词</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SearchResultGroupProps {
  title: string;
  icon: React.ReactNode;
  items: {
    id: string;
    primary: string;
    secondary: string;
    url: string;
  }[];
  onClick: (url: string) => void;
}

const SearchResultGroup: React.FC<SearchResultGroupProps> = ({
  title,
  icon,
  items,
  onClick,
}) => {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
        {icon}
        {title}
        <span className="text-gray-300">({items.length})</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onClick(item.url)}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
          >
            <div className="text-sm font-medium text-gray-900 group-hover:text-primary-700">
              {item.primary}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {item.secondary}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
