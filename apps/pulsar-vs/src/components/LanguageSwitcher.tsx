/**
 * LanguageSwitcher - Dropdown to switch between supported languages
 */

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { SUPPORTED_LANGUAGES, changeLanguage, type SupportedLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) as SupportedLanguage || 'en';

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-sm">
          <Globe className="h-3.5 w-3.5" />
          <span>{currentLanguage.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={currentLang === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.code === 'en' ? '🇺🇸' : lang.code === 'es' ? '🇪🇸' : '🌐'}</span>
            {lang.nativeName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
