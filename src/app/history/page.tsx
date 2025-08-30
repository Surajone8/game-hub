'use client';

import { useState, useEffect } from 'react';
import { GameStorage } from '@/utils/storage';
import { GameHistory } from '@/types/game';
import { Trophy, Users, Clock, Target } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function HistoryPage() {
  const [history, setHistory] = useState<GameHistory>({ results: [], totalGames: 0, totalPlayers: 0 });
  const [activeTab, setActiveTab] = useState<'recent' | 'stats'>('recent');

  useEffect(() => {
    const gameHistory = GameStorage.getGameHistory();
    setHistory(gameHistory);
  }, []);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all game history? This action cannot be undone.')) {
      GameStorage.clearHistory();
      setHistory({ results: [], totalGames: 0, totalPlayers: 0 });
    }
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const sortedResults = [...history.results].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculate player statistics from game results
  const playerStats = history.results.reduce((acc, result) => {
    result.players.forEach(player => {
      if (!acc[player.id]) {
        acc[player.id] = {
          playerId: player.id,
          playerName: player.name,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          totalScore: 0,
          averageScore: 0,
          favoriteGame: result.gameType
        };
      }
      
      acc[player.id].gamesPlayed++;
      acc[player.id].totalScore += player.score || 0;
      
      if (result.winner && result.winner.id === player.id) {
        acc[player.id].gamesWon++;
      } else {
        acc[player.id].gamesLost++;
      }
    });
    return acc;
  }, {} as Record<string, {
    playerId: string;
    playerName: string;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    totalScore: number;
    averageScore: number;
    favoriteGame: string;
    winRate?: number;
  }>);

  // Calculate win rates and average scores
  Object.values(playerStats).forEach((stat) => {
    stat.winRate = stat.gamesPlayed > 0 ? (stat.gamesWon / stat.gamesPlayed) * 100 : 0;
    stat.averageScore = stat.gamesPlayed > 0 ? stat.totalScore / stat.gamesPlayed : 0;
  });

  const sortedStats = Object.values(playerStats).sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--card-foreground)' }}>Game History</h1>
        <p className="text-xl" style={{ color: 'var(--muted-foreground)' }}>
          Track your gaming progress and see how you and your friends are performing
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl shadow-md text-center border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--muted)' }}>
            <Trophy className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--card-foreground)' }}>{history.totalGames}</div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Total Games</div>
        </div>
        
        <div className="p-6 rounded-xl shadow-md text-center border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--muted)' }}>
            <Users className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--card-foreground)' }}>{history.totalPlayers}</div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Unique Players</div>
        </div>
        
        <div className="p-6 rounded-xl shadow-md text-center border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--muted)' }}>
            <Target className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--card-foreground)' }}>
            {history.totalGames > 0 ? Math.round(history.totalGames / 2) : 0}
          </div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Games Today</div>
        </div>
        
        <div className="p-6 rounded-xl shadow-md text-center border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--muted)' }}>
            <Clock className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--card-foreground)' }}>
            {history.results.length > 0 
              ? Math.round(history.results.reduce((acc, result) => acc + (result.duration || 0), 0) / 60)
              : 0
            }
          </div>
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Total Minutes</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
        <button
          onClick={() => setActiveTab('recent')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
            activeTab === 'recent'
              ? 'shadow-sm'
              : 'hover:text-gray-800'
          )}
          style={{
            backgroundColor: activeTab === 'recent' ? 'var(--card)' : 'transparent',
            color: activeTab === 'recent' ? 'var(--primary)' : 'var(--muted-foreground)'
          }}
        >
          Recent Games
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
            activeTab === 'stats'
              ? 'shadow-sm'
              : 'hover:text-gray-800'
          )}
          style={{
            backgroundColor: activeTab === 'stats' ? 'var(--card)' : 'transparent',
            color: activeTab === 'stats' ? 'var(--primary)' : 'var(--muted-foreground)'
          }}
        >
          Player Stats
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'recent' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--card-foreground)' }}>Recent Games</h2>
            {history.results.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-4 py-2 text-sm rounded-md transition-colors"
                style={{
                  color: 'var(--destructive)',
                  backgroundColor: 'transparent'
                }}
              >
                Clear History
              </button>
            )}
          </div>
          
          {history.results.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>No games played yet</h3>
              <p style={{ color: 'var(--muted-foreground)' }}>Start playing games to see your history here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResults.map((result) => (
                <div key={result.id} className="p-4 rounded-lg shadow-sm border" style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{result.gameType === 'tictactoe' ? '🎯' : '🎮'}</div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--card-foreground)' }}>
                          {result.gameType.charAt(0).toUpperCase() + result.gameType.slice(1)}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          {result.players.map(p => p.name).join(' vs ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{formatDate(result.timestamp)}</div>
                      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{formatDuration(result.duration)}</div>
                    </div>
                  </div>
                  
                  {result.winner && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-sm">
                        <span style={{ color: 'var(--muted-foreground)' }}>Winner: </span>
                        <span className="font-medium" style={{ color: 'var(--primary)' }}>{result.winner.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--card-foreground)' }}>Player Statistics</h2>
          
          {Object.keys(playerStats).length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>No player data yet</h3>
              <p style={{ color: 'var(--muted-foreground)' }}>Play some games to see player statistics!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedStats.map((stat) => (
                <div key={stat.playerId} className="p-4 rounded-lg shadow-sm border" style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}>
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--muted)' }}>
                      <Users className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--card-foreground)' }}>{stat.playerName}</h3>
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Player ID: {stat.playerId.slice(0, 8)}...</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="font-medium" style={{ color: 'var(--card-foreground)' }}>{stat.gamesPlayed}</div>
                        <div style={{ color: 'var(--muted-foreground)' }}>Played</div>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--primary)' }}>{stat.gamesWon}</div>
                        <div style={{ color: 'var(--muted-foreground)' }}>Won</div>
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--destructive)' }}>{stat.gamesLost}</div>
                        <div style={{ color: 'var(--muted-foreground)' }}>Lost</div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                        {(stat.winRate || 0).toFixed(1)}%
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Win Rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
