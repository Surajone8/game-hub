'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Palette, Moon, Sun, Monitor, Settings, Trash2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, isDark } = useTheme();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearGameHistory = () => {
    GameStorage.clearHistory();
    setShowClearConfirm(false);
  };

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Clean white background'
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
      description: 'Dark background for low light'
    },
    {
      value: 'auto' as const,
      label: 'Auto',
      icon: Monitor,
      description: 'Follows system preference'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          
          <h1 className="text-3xl font-bold" style={{ color: 'var(--card-foreground)' }}>⚙️ Settings</h1>
          
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Theme Settings */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Palette className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--card-foreground)' }}>Theme</h2>
        </div>
        
        <div className="grid gap-4">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-200"
                style={{
                  borderColor: theme === option.value ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: theme === option.value ? 'var(--muted)' : 'var(--card)'
                }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                  backgroundColor: theme === option.value ? 'var(--primary)' : 'var(--muted)',
                  color: theme === option.value ? 'var(--primary-foreground)' : 'var(--muted-foreground)'
                }}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 text-left">
                  <div className="font-medium" style={{ color: 'var(--card-foreground)' }}>{option.label}</div>
                  <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{option.description}</div>
                </div>
                
                {theme === option.value && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Settings className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--card-foreground)' }}>Data Management</h2>
        </div>
        
        <div className="p-6 rounded-lg border space-y-4" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--card-foreground)' }}>Game History</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Clear all saved game results and player statistics. This action cannot be undone.
            </p>
            
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors duration-200"
                style={{ backgroundColor: 'var(--destructive)' }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Game History</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium" style={{ color: 'var(--destructive)' }}>
                  Are you sure you want to clear all game history?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={clearGameHistory}
                    className="px-4 py-2 text-white rounded-lg transition-colors duration-200"
                    style={{ backgroundColor: 'var(--destructive)' }}
                  >
                    Yes, Clear All
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 text-white rounded-lg transition-colors duration-200"
                    style={{ backgroundColor: 'var(--muted-foreground)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Theme Preview */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--card-foreground)' }}>Theme Preview</h2>
        
        <div className="p-6 rounded-lg border-2 transition-all duration-200" style={{
          backgroundColor: isDark ? 'var(--card)' : 'var(--card)',
          borderColor: isDark ? 'var(--border)' : 'var(--border)',
          color: isDark ? 'var(--card-foreground)' : 'var(--card-foreground)'
        }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">GameHub</h3>
              <div className="text-sm opacity-70">
                {theme === 'auto' ? 'Auto (System)' : theme === 'dark' ? 'Dark' : 'Light'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="h-3 rounded" style={{ backgroundColor: 'var(--muted)' }}></div>
              <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--muted)' }}></div>
              <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--muted)' }}></div>
            </div>
            
            <div className="flex space-x-2">
              <div className="px-3 py-1 rounded text-sm font-medium" style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              }}>
                Primary
              </div>
              <div className="px-3 py-1 rounded text-sm font-medium" style={{
                backgroundColor: 'var(--secondary)',
                color: 'var(--secondary-foreground)'
              }}>
                Secondary
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information */}
      <div className="p-6 rounded-lg border" style={{
        backgroundColor: 'var(--muted)',
        borderColor: 'var(--border)'
      }}>
        <h3 className="font-medium mb-2" style={{ color: 'var(--card-foreground)' }}>About Settings</h3>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Your theme preference is saved locally in your browser. Game history and statistics 
          are also stored locally and can be cleared at any time.
        </p>
      </div>
    </div>
  );
}
