'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Trophy, Home, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme, isDark } = useTheme();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Games', href: '/games', icon: Gamepad2 },
    { name: 'History', href: '/history', icon: Trophy },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'auto':
        return Monitor;
      default:
        return Monitor;
    }
  };

  const ThemeIcon = getThemeIcon();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 shadow-lg dark:from-purple-800 dark:via-blue-800 dark:to-indigo-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-white font-bold text-xl">GameHub</span>
            </Link>
          </div>
          
          <nav className="flex items-center space-x-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white"
              title={`Current theme: ${theme} (click to cycle)`}
            >
              <ThemeIcon className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
