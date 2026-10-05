'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface LanguageSwitcherProps {
  currentLocale: string;
  className?: string;
  /** Optional label resolver, e.g. next-intl `t('label')`. */
  label?: string;
}

function persistLocalePreference(newLocale: string) {
  if (typeof window !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLocale;
    try {
      localStorage.setItem('dhruto_locale', newLocale);
    } catch {
      // Ignore storage failures (private mode).
    }
  }
}

const LOCALES = ['en', 'bn'] as const;

/**
 * Bilingual EN ⇄ BN switch. Bangla is LTR, so no direction handling is needed;
 * the switch only swaps the locale segment of the current URL.
 */
export function LanguageSwitcher({
  currentLocale,
  className,
  label,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

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
    router.push(queryString ? `${targetPath}?${queryString}` : targetPath);
  };

  return (
    <div
      role="group"
      aria-label={label ?? 'Change language'}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5',
        className,
      )}
    >
      <Globe className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      {LOCALES.map((locale) => {
        const active = locale === currentLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => handleLocaleChange(locale)}
            aria-pressed={active}
            className={cn(
              'rounded px-2 py-1 text-caption font-semibold uppercase transition-colors',
              active
                ? 'bg-primary-soft text-primary-soft-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
