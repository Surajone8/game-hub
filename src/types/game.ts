

export interface Player {
  id: string;
  name: string;
  score: number;
  isWinner?: boolean;
}

export interface GameResult {
  id: string;
  gameType: GameType;
  players: Player[];
  winner: Player | null;
  timestamp: Date;
  duration?: number;
  score?: number;
  moves?: number;
  mistakes?: number;
}

export interface GameHistory {
  results: GameResult[];
  totalGames: number;
  totalPlayers: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  averageScore: number;
  favoriteGame: string;
}

export type GameType = 'tictactoe' | 'snake' | 'tetris' | 'puzzle' | 'memory' | 'chess' | 'checkers' | 'sudoku' | 'breakout' | 'pong' | 'minesweeper' | 'hangman' | 'wordle' | 'flappy';

export interface GameConfig {
  type: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  isMultiplayer: boolean;
  icon: string;
  route: string;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  startTime: Date | null;
  endTime: Date | null;
  score: number;
  level?: number;
  lives?: number;
  selectedCell?: { row: number; col: number };
  initialBoard?: number[][];
  solution?: number[][];
}
