'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe, Check } from 'lucide-react';
import { Button } from '../button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu.js';
import { cn } from '../../lib/utils.js';

export interface LanguageSwitcherProps {
  currentLocale: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
  className?: string;
  showLabel?: boolean;
  /** Optional label resolver, e.g. next-intl `t('label')`. */
  label?: string;
}

const LANGUAGES = [
  { code: 'bn', label: 'বাংলা', shortLabel: 'বাং', flag: '🇧🇩' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
] as const;

const LOCALES = ['en', 'bn'] as const;

function persistLocalePreference(newLocale: string) {
  if (typeof window !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLocale;
    try {
      localStorage.setItem('dhruto_locale', newLocale);
    } catch {
      // Ignore private browsing error
    }
  }
}

export function LanguageSwitcher({
  currentLocale,
  variant = 'ghost',
  size = 'sm',
  className = '',
  showLabel = true,
  label = 'Change language',
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const activeLang = LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0];

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === currentLocale || !LOCALES.includes(newLocale as 'en' | 'bn')) return;

    persistLocalePreference(newLocale);

    let targetPath = pathname;
    const segments = pathname.split('/');

    if (segments.length > 1 && LOCALES.includes(segments[1] as 'en' | 'bn')) {
      segments[1] = newLocale;
      targetPath = segments.join('/');
    } else {
      targetPath = `/${newLocale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    }

    const queryString = searchParams?.toString();
    const finalUrl = queryString ? `${targetPath}?${queryString}` : targetPath;

    router.push(finalUrl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 font-medium transition-colors hover:bg-surface-muted',
            className
          )}
          aria-label={`${label}. Current language: ${activeLang.label}`}
        >
          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {showLabel && (
            <span className="text-caption font-semibold uppercase">{activeLang.shortLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 p-1 rounded-lg border border-border bg-surface shadow-md">
        {LANGUAGES.map((lang) => {
          const isSelected = lang.code === currentLocale;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => handleLocaleChange(lang.code)}
              onClick={() => handleLocaleChange(lang.code)}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors',
                isSelected ? 'bg-primary-soft text-primary-soft-foreground font-semibold' : 'text-foreground hover:bg-surface-muted'
              )}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
              {isSelected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
