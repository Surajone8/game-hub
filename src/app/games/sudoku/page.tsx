'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, CheckCircle, Shuffle } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface SudokuGameState {
  board: number[][];
  solution: number[][];
  initialBoard: number[][];
  selectedCell: { row: number; col: number } | null;
  isPlaying: boolean;
  isCompleted: boolean;
  mistakes: number;
  startTime: Date | null;
}

const BOARD_SIZE = 9;
const BOX_SIZE = 3;

export default function SudokuPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [gameState, setGameState] = useState<SudokuGameState>({
    board: [],
    solution: [],
    initialBoard: [],
    selectedCell: null,
    isPlaying: false,
    isCompleted: false,
    mistakes: 0,
    startTime: null
  });

  const generateSudoku = useCallback((): { board: number[][]; solution: number[][] } => {
    // Generate a solved Sudoku board
    const solution = generateSolvedBoard();
    
    // Create puzzle by removing numbers
    const board = solution.map(row => [...row]);
    const cellsToRemove = 40; // Adjust difficulty
    
    for (let i = 0; i < cellsToRemove; i++) {
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      board[row][col] = 0;
    }
    
    return { board, solution };
  }, []);

  const generateSolvedBoard = (): number[][] => {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    // Fill diagonal boxes first (boxes at positions (0,0), (3,3), (6,6))
    fillBox(board, 0, 0);
    fillBox(board, 3, 3);
    fillBox(board, 6, 6);
    
    // Solve the rest
    solveSudoku(board);
    
    return board;
  };

  const fillBox = (board: number[][], startRow: number, startCol: number) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 0; i < BOX_SIZE; i++) {
      for (let j = 0; j < BOX_SIZE; j++) {
        const randomIndex = Math.floor(Math.random() * numbers.length);
        board[startRow + i][startCol + j] = numbers[randomIndex];
        numbers.splice(randomIndex, 1);
      }
    }
  };

  const solveSudoku = (board: number[][]): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidMove(board, row, col, num)) {
              board[row][col] = num;
              if (solveSudoku(board)) {
                return true;
              }
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const isValidMove = (board: number[][], row: number, col: number, num: number): boolean => {
    // Check row
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[row][x] === num) return false;
    }
    
    // Check column
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[x][col] === num) return false;
    }
    
    // Check box
    const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let i = 0; i < BOX_SIZE; i++) {
      for (let j = 0; j < BOX_SIZE; j++) {
        if (board[startRow + i][startCol + j] === num) return false;
      }
    }
    
    return true;
  };

  const isBoardComplete = useCallback((board: number[][]): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === 0) return false;
      }
    }
    return true;
  }, []);

  const isBoardCorrect = useCallback((board: number[][]): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] !== gameState.solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }, [gameState.solution]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState.isPlaying || gameState.isCompleted) return;
    
    // Only allow clicking on empty cells or cells that were filled by the player
    if (gameState.initialBoard[row][col] === 0) {
      setGameState(prev => ({ ...prev, selectedCell: { row, col } }));
    }
  }, [gameState.isPlaying, gameState.isCompleted, gameState.initialBoard]);

  const handleNumberInput = useCallback((num: number) => {
    if (!gameState.selectedCell || !gameState.isPlaying || gameState.isCompleted) return;
    
    const { row, col } = gameState.selectedCell;
    
    // Only allow input on cells that were initially empty
    if (gameState.initialBoard[row][col] !== 0) return;
    
    const newBoard = gameState.board.map(row => [...row]);
    newBoard[row][col] = num;
    
    // Check if the move is correct
    const isCorrect = num === gameState.solution[row][col];
    const newMistakes = isCorrect ? gameState.mistakes : gameState.mistakes + 1;
    
    const isCompleted = isBoardComplete(newBoard) && isBoardCorrect(newBoard);
    
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      mistakes: newMistakes,
      isCompleted,
      selectedCell: null
    }));
    
    if (isCompleted) {
      endGame();
    }
  }, [gameState.selectedCell, gameState.isPlaying, gameState.isCompleted, gameState.initialBoard, gameState.board, gameState.solution, gameState.mistakes, isBoardComplete, isBoardCorrect]);

  const startGame = () => {
    if (!player.name.trim()) return;
    
    const { board, solution } = generateSudoku();
    setGameState({
      board: board.map(row => [...row]),
      solution,
      initialBoard: board.map(row => [...row]),
      selectedCell: null,
      isPlaying: true,
      isCompleted: false,
      mistakes: 0,
      startTime: new Date()
    });
  };

  const endGame = () => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    // Calculate score based on mistakes and time
    const baseScore = 1000;
    const mistakePenalty = gameState.mistakes * 50;
    const timeBonus = Math.max(0, 300 - duration) * 2; // Bonus for completing under 5 minutes
    const finalScore = Math.max(0, baseScore - mistakePenalty + timeBonus);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'sudoku' as GameType,
      players: [{ ...player, score: finalScore }],
      winner: null, // Single player game
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  };

  const resetGame = () => {
    const { board, solution } = generateSudoku();
    setGameState({
      board: board.map(row => [...row]),
      solution,
      initialBoard: board.map(row => [...row]),
      selectedCell: null,
      isPlaying: true,
      isCompleted: false,
      mistakes: 0,
      startTime: new Date()
    });
  };

  const newGame = () => {
    setPlayer({ id: '1', name: '', score: 0 });
    setGameState({
      board: [],
      solution: [],
      initialBoard: [],
      selectedCell: null,
      isPlaying: false,
      isCompleted: false,
      mistakes: 0,
      startTime: null
    });
  };

  const renderCell = (row: number, col: number) => {
    const value = gameState.board[row][col];
    const isInitial = gameState.initialBoard[row][col] !== 0;
    const isSelected = gameState.selectedCell?.row === row && gameState.selectedCell?.col === col;
    const isIncorrect = value !== 0 && value !== gameState.solution[row][col];
    
    return (
      <button
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        disabled={!gameState.isPlaying || gameState.isCompleted || isInitial}
        className={cn(
          'w-10 h-10 border border-gray-300 flex items-center justify-center text-lg font-bold transition-all duration-200',
          isInitial ? 'bg-gray-100 text-gray-800' : 'bg-white text-blue-600',
          isSelected && 'bg-blue-100 border-blue-500',
          isIncorrect && 'bg-red-100 text-red-600',
          !gameState.isPlaying || gameState.isCompleted || isInitial ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50'
        )}
      >
        {value !== 0 ? value : ''}
      </button>
    );
  };

  if (!gameState.isPlaying && !gameState.isCompleted) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🔢 Sudoku</h1>
          <p className="text-gray-600">Fill the grid with numbers following rules</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player Name
            </label>
            <input
              type="text"
              value={player.name}
              onChange={(e) => setPlayer(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={20}
            />
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={startGame}
            disabled={!player.name.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            Start Game
          </button>
          
          <button
            onClick={() => router.push('/games')}
            className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/games')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>
          
          <h1 className="text-3xl font-bold text-gray-800">🔢 Sudoku</h1>
          
          <button
            onClick={newGame}
            className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>

        {/* Game Info */}
        <div className="flex justify-center space-x-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{gameState.mistakes}</div>
            <div className="text-sm text-gray-600">Mistakes</div>
          </div>
          
          {gameState.isPlaying && !gameState.isCompleted && (
            <button
              onClick={resetGame}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              <span>New Puzzle</span>
            </button>
          )}
        </div>

        {/* Completed */}
        {gameState.isCompleted && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold text-lg">Puzzle Completed!</span>
            </div>
            
            <div className="text-lg text-gray-600">
              Mistakes: <span className="font-bold text-gray-800">{gameState.mistakes}</span>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
            {Array.from({ length: BOARD_SIZE }, (_, row) =>
              Array.from({ length: BOARD_SIZE }, (_, col) => renderCell(row, col))
            )}
          </div>
        </div>
      </div>

      {/* Number Pad */}
      {gameState.isPlaying && !gameState.isCompleted && (
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => handleNumberInput(i + 1)}
                className="w-12 h-12 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
