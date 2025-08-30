import { GameConfig } from '@/types/game';

export const GAMES: GameConfig[] = [
  { type: 'tictactoe', name: 'Tic Tac Toe', description: 'Classic X and O game for two players', minPlayers: 2, maxPlayers: 2, isMultiplayer: true, icon: '❌', route: '/games/tictactoe' },
  { type: 'snake', name: 'Snake', description: 'Grow your snake by eating food', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🐍', route: '/games/snake' },
  { type: 'tetris', name: 'Tetris', description: 'Stack falling blocks to clear lines', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🧱', route: '/games/tetris' },
  { type: 'puzzle', name: 'Sliding Puzzle', description: 'Arrange tiles in correct order', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🧩', route: '/games/puzzle' },
  { type: 'memory', name: 'Memory Match', description: 'Find matching pairs of cards', minPlayers: 1, maxPlayers: 4, isMultiplayer: true, icon: '🧠', route: '/games/memory' },
  { type: 'chess', name: 'Chess', description: 'Strategic board game for two players', minPlayers: 2, maxPlayers: 2, isMultiplayer: true, icon: '♟️', route: '/games/chess' },
  { type: 'checkers', name: 'Checkers', description: 'Classic checkers game with jumping moves', minPlayers: 2, maxPlayers: 2, isMultiplayer: true, icon: '🔴', route: '/games/checkers' },
  { type: 'sudoku', name: 'Sudoku', description: 'Fill the grid with numbers following rules', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🔢', route: '/games/sudoku' },
  { type: 'breakout', name: 'Breakout', description: 'Break all the bricks with your paddle', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🏓', route: '/games/breakout' },
  { type: 'pong', name: 'Pong', description: 'Classic two-player paddle game', minPlayers: 2, maxPlayers: 2, isMultiplayer: true, icon: '🏓', route: '/games/pong' },
  { type: 'minesweeper', name: 'Minesweeper', description: 'Find all mines without detonating them', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '💣', route: '/games/minesweeper' },
  { type: 'hangman', name: 'Hangman', description: 'Guess the word before the hangman is complete', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🪢', route: '/games/hangman' },
  { type: 'wordle', name: 'Wordle', description: 'Guess the five-letter word in six tries', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '📝', route: '/games/wordle' },
  { type: 'flappy', name: 'Flappy Bird', description: 'Navigate through pipes without hitting them', minPlayers: 1, maxPlayers: 1, isMultiplayer: false, icon: '🐦', route: '/games/flappy' }
];

export const getGameByType = (type: string): GameConfig | undefined => {
  return GAMES.find(game => game.type === type);
};
