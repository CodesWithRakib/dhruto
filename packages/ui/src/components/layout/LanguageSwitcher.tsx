'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  currentLocale: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

function persistLocalePreference(newLocale: string) {
  if (typeof window !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLocale;
    try {
      localStorage.setItem('dhruto_locale', newLocale);
    } catch {
      // Ignore
    }
  }
}

export function LanguageSwitcher({
  currentLocale,
  className = '',
  showLabel = true,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === currentLocale) return;

    persistLocalePreference(newLocale);

    let targetPath = pathname;
    const segments = pathname.split('/');
    const locales = ['en', 'bn'];
    
    if (segments.length > 1 && locales.includes(segments[1] || '')) {
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
    <div className={`relative inline-block ${className}`}>
      <button 
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => handleLocaleChange(currentLocale === 'en' ? 'bn' : 'en')}
      >
        <Globe className="h-4 w-4 opacity-80 shrink-0" />
        {showLabel && (
          <span className="text-xs uppercase font-semibold">{currentLocale === 'en' ? 'bn' : 'en'}</span>
        )}
      </button>
    </div>
  );
}
