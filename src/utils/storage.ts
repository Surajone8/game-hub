import { GameHistory, GameResult } from '@/types/game';

const STORAGE_KEYS = {
  GAME_HISTORY: 'game_hub_history',
  PLAYER_NAMES: 'game_hub_player_names'
} as const;

export class GameStorage {
  static getGameHistory(): GameHistory {
    if (typeof window === 'undefined') {
      return { results: [], totalGames: 0, totalPlayers: 0 };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        parsed.results = parsed.results.map((result: { timestamp: string; [key: string]: unknown }) => ({
          ...result,
          timestamp: new Date(result.timestamp)
        }));
        return parsed;
      }
    } catch (error) {
      console.error('Error parsing game history:', error);
    }

    return { results: [], totalGames: 0, totalPlayers: 0 };
  }

  static saveGameHistory(history: GameHistory): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving game history:', error);
    }
  }

  static addGameResult(result: GameResult): void {
    const history = this.getGameHistory();
    history.results.push(result);
    history.totalGames = history.results.length;
    
    // Calculate unique players
    const uniquePlayers = new Set(result.players.map(p => p.id));
    history.totalPlayers = uniquePlayers.size;

    this.saveGameHistory(history);
  }

  static getPlayerNames(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_NAMES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error parsing player names:', error);
      return [];
    }
  }

  static savePlayerNames(names: string[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAMES, JSON.stringify(names));
    } catch (error) {
      console.error('Error saving player names:', error);
    }
  }

  static clearHistory(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAMES);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }
}
