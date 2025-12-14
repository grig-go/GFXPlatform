import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Library, Search, Check } from 'lucide-react';

export interface BackdropAsset {
  id: string;
  file_url: string;
  name: string;
  description?: string;
  file_size?: number;
  ai_model_used?: string;
  created_at: string;
  tags?: string[];
}

export type BackdropSortOption = 
  | 'date-newest'
  | 'date-oldest'
  | 'name-az'
  | 'name-za'
  | 'size-largest'
  | 'size-smallest'
  | 'model-az';

interface BackdropFilterProps {
  backdrops: BackdropAsset[];
  selectedBackdrop: string | null;
  onSelectBackdrop: (url: string) => void;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
}

// Sort option keys for translation
const SORT_OPTION_KEYS: { value: BackdropSortOption; labelKey: string }[] = [
  { value: 'date-newest', labelKey: 'sort.dateNewest' },
  { value: 'date-oldest', labelKey: 'sort.dateOldest' },
  { value: 'name-az', labelKey: 'sort.nameAZ' },
  { value: 'name-za', labelKey: 'sort.nameZA' },
  { value: 'size-largest', labelKey: 'sort.sizeLargest' },
  { value: 'size-smallest', labelKey: 'sort.sizeSmallest' },
  { value: 'model-az', labelKey: 'sort.modelAZ' },
];

export function BackdropFilter({
  backdrops,
  selectedBackdrop,
  onSelectBackdrop,
  onSearchChange,
  isLoading = false,
}: BackdropFilterProps) {
  const { t } = useTranslation('virtualSet');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<BackdropSortOption>('date-newest');

  // Debounced search handler
  useEffect(() => {
    if (!onSearchChange) return;
    
    const timeoutId = setTimeout(() => {
      onSearchChange(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, onSearchChange]);

  // Sorting function using useMemo for performance
  const sortedBackdrops = useMemo(() => {
    if (!backdrops || !Array.isArray(backdrops)) {
      return [];
    }

    const sorted = [...backdrops];

    try {
      switch (sortOption) {
        case 'date-newest':
          sorted.sort((a, b) => {
            const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          break;

        case 'date-oldest':
          sorted.sort((a, b) => {
            const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return dateA - dateB;
          });
          break;

        case 'name-az':
          sorted.sort((a, b) => {
            const nameA = a?.name || '';
            const nameB = b?.name || '';
            return nameA.localeCompare(nameB);
          });
          break;

        case 'name-za':
          sorted.sort((a, b) => {
            const nameA = a?.name || '';
            const nameB = b?.name || '';
            return nameB.localeCompare(nameA);
          });
          break;

        case 'size-largest':
          sorted.sort((a, b) => {
            const sizeA = a?.file_size || 0;
            const sizeB = b?.file_size || 0;
            return sizeB - sizeA;
          });
          break;

        case 'size-smallest':
          sorted.sort((a, b) => {
            const sizeA = a?.file_size || 0;
            const sizeB = b?.file_size || 0;
            return sizeA - sizeB;
          });
          break;

        case 'model-az':
          sorted.sort((a, b) => {
            const modelA = a?.ai_model_used || '';
            const modelB = b?.ai_model_used || '';
            return modelA.localeCompare(modelB);
          });
          break;

        default:
          console.warn(`Unknown sort option: ${sortOption}`);
      }
    } catch (error) {
      console.error('Error sorting backdrops:', error);
    }

    return sorted;
  }, [backdrops, sortOption]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortOption(value as BackdropSortOption);
  }, []);

  const handleBackdropClick = useCallback((url: string) => {
    onSelectBackdrop(url);
  }, [onSelectBackdrop]);

  return (
    <div className="mt-4">
      {/* Header with Search and Sort */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Library className="size-5 text-blue-600" />
          <h4 className="font-medium max-md-900:hidden">{t('recentBackdrops.title')}</h4>
        </div>

        <div className="flex gap-2 max-md-900:flex-1">
          {/* Search Input */}
          <div className="relative max-md-900:flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder={t('recentBackdrops.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 h-9 w-[200px] max-md-900:w-full"
              disabled={isLoading}
            />
          </div>

          {/* Sort Dropdown */}
          <Select value={sortOption} onValueChange={handleSortChange} disabled={isLoading}>
            <SelectTrigger className="w-[160px] h-9 max-md-900:w-auto max-md-900:px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTION_KEYS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{t(option.labelKey)}</span>
                    {sortOption === option.value && <Check className="size-4 ml-2" />}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Backdrops Grid */}
      {sortedBackdrops.length > 0 ? (
        <div className="grid grid-cols-4 gap-3 p-3 rounded bg-gray-50">
          {sortedBackdrops.map((backdrop, idx) => (
            <motion.div
              key={backdrop.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="flex flex-col cursor-pointer group"
              onClick={() => handleBackdropClick(backdrop.file_url)}
              whileHover={{ y: -4 }}
            >
              <div
                className={`relative w-full aspect-video rounded overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 ${
                  selectedBackdrop === backdrop.file_url
                    ? 'ring-2 ring-primary ring-offset-2'
                    : 'border border-gray-300'
                }`}
              >
                <img
                  src={backdrop.file_url}
                  alt={backdrop.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </div>
              <div className="mt-1 w-full">
                <div className="text-xs truncate" title={backdrop.name}>
                  {backdrop.name}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded">
          {isLoading ? t('recentBackdrops.loading') : t('recentBackdrops.noBackdrops')}
        </div>
      )}
    </div>
  );
}
