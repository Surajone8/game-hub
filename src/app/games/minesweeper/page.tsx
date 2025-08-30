'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Flag, Bomb, Maximize2, Minimize2, Trophy } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

interface MinesweeperGameState {
  board: Cell[][];
  isPlaying: boolean;
  isGameOver: boolean;
  isWon: boolean;
  mineCount: number;
  flaggedCount: number;
  revealedCount: number;
  startTime: Date | null;
  difficulty: 'easy' | 'medium' | 'hard';
}

const DIFFICULTY_CONFIGS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
};

export default function MinesweeperPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameState, setGameState] = useState<MinesweeperGameState>({
    board: [],
    isPlaying: false,
    isGameOver: false,
    isWon: false,
    mineCount: 10,
    flaggedCount: 0,
    revealedCount: 0,
    startTime: null,
    difficulty: 'easy'
  });

  const initializeBoard = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const { rows, cols, mines } = config;
    
    // Create empty board
    const board: Cell[][] = [];
    for (let row = 0; row < rows; row++) {
      board[row] = [];
      for (let col = 0; col < cols; col++) {
        board[row][col] = {
          row,
          col,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        };
      }
    }

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      if (!board[row][col].isMine) {
        board[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor mine counts
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!board[row][col].isMine) {
          board[row][col].neighborMines = countNeighborMines(board, row, col);
        }
      }
    }

    return board;
  }, []);

  const countNeighborMines = (board: Cell[][], row: number, col: number): number => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < board.length && 
            newCol >= 0 && newCol < board[0].length && 
            board[newRow][newCol].isMine) {
          count++;
        }
      }
    }
    return count;
  };

  const revealCell = useCallback((row: number, col: number) => {
    if (!gameState.isPlaying || gameState.isGameOver || gameState.board[row][col].isFlagged) {
      return;
    }

    setGameState(prev => {
      const newBoard = [...prev.board];
      const cell = newBoard[row][col];

      if (cell.isMine) {
        // Game over - reveal all mines
        for (let r = 0; r < newBoard.length; r++) {
          for (let c = 0; c < newBoard[0].length; c++) {
            if (newBoard[r][c].isMine) {
              newBoard[r][c].isRevealed = true;
            }
          }
        }
        return { ...prev, board: newBoard, isGameOver: true, isPlaying: false };
      }

      // Reveal the cell
      cell.isRevealed = true;
      let newRevealedCount = prev.revealedCount + 1;

      // If no neighbor mines, reveal neighbors recursively
      if (cell.neighborMines === 0) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (newRow >= 0 && newRow < newBoard.length && 
                newCol >= 0 && newCol < newBoard[0].length && 
                !newBoard[newRow][newCol].isRevealed && 
                !newBoard[newRow][newCol].isFlagged) {
              newBoard[newRow][newCol].isRevealed = true;
              newRevealedCount++;
              
              // Recursively reveal if no neighbor mines
              if (newBoard[newRow][newCol].neighborMines === 0) {
                const { board: updatedBoard, revealedCount: additionalRevealed } = 
                  revealNeighbors(newBoard, newRow, newCol);
                newBoard.splice(0, newBoard.length, ...updatedBoard);
                newRevealedCount += additionalRevealed;
              }
            }
          }
        }
      }

      // Check if won
      const totalCells = newBoard.length * newBoard[0].length;
      const isWon = newRevealedCount === totalCells - prev.mineCount;

      return {
        ...prev,
        board: newBoard,
        revealedCount: newRevealedCount,
        isWon,
        isPlaying: !isWon
      };
    });
  }, [gameState.isPlaying, gameState.isGameOver, gameState.board, gameState.revealedCount, gameState.mineCount]);

  const revealNeighbors = (board: Cell[][], row: number, col: number): { board: Cell[][], revealedCount: number } => {
    let revealedCount = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < board.length && 
            newCol >= 0 && newCol < board[0].length && 
            !board[newRow][newCol].isRevealed && 
            !board[newRow][newCol].isFlagged) {
          board[newRow][newCol].isRevealed = true;
          revealedCount++;
          
          if (board[newRow][newCol].neighborMines === 0) {
            const result = revealNeighbors(board, newRow, newCol);
            revealedCount += result.revealedCount;
          }
        }
      }
    }
    return { board, revealedCount };
  };

  const toggleFlag = useCallback((row: number, col: number) => {
    if (!gameState.isPlaying || gameState.isGameOver || gameState.board[row][col].isRevealed) {
      return;
    }

    setGameState(prev => {
      const newBoard = [...prev.board];
      const cell = newBoard[row][col];
      cell.isFlagged = !cell.isFlagged;
      
      return {
        ...prev,
        board: newBoard,
        flaggedCount: prev.flaggedCount + (cell.isFlagged ? 1 : -1)
      };
    });
  }, [gameState.isPlaying, gameState.isGameOver, gameState.board]);

  const startGame = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    if (player.name.trim()) {
      const config = DIFFICULTY_CONFIGS[difficulty];
      const board = initializeBoard(difficulty);
      
      setGameState(prev => ({
        ...prev,
        board,
        isPlaying: true,
        isGameOver: false,
        isWon: false,
        mineCount: config.mines,
        flaggedCount: 0,
        revealedCount: 0,
        startTime: new Date(),
        difficulty
      }));
    }
  }, [player.name, initializeBoard]);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const score = gameState.isWon ? 
      Math.max(1000 - duration, 100) : 0;

    // Update player score
    const newPlayer = {
      ...player,
      score: player.score + score
    };
    setPlayer(newPlayer);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'minesweeper' as GameType,
      players: [newPlayer],
      winner: gameState.isWon ? newPlayer : null,
      timestamp: endTime,
      duration,
      score
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.isWon, player]);

  const newGame = () => {
    setGameState(prev => ({
      ...prev,
      board: [],
      isPlaying: false,
      isGameOver: false,
      isWon: false,
      flaggedCount: 0,
      revealedCount: 0,
      startTime: null
    }));
    setPlayer({ id: '1', name: '', score: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.log('Error attempting to exit fullscreen:', err);
      });
    }
  };

  useEffect(() => {
    if (gameState.isGameOver || gameState.isWon) {
      endGame();
    }
  }, [gameState.isGameOver, gameState.isWon, endGame]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getCellColor = (cell: Cell): string => {
    if (cell.isFlagged) return 'bg-yellow-400';
    if (!cell.isRevealed) return 'bg-gray-300 hover:bg-gray-400';
    if (cell.isMine) return 'bg-red-500';
    
    const colors = [
      'bg-transparent',
      'text-blue-600',
      'text-green-600',
      'text-red-600',
      'text-purple-600',
      'text-yellow-600',
      'text-cyan-600',
      'text-pink-600',
      'text-orange-600'
    ];
    return colors[cell.neighborMines] || 'bg-transparent';
  };

  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged) return <Flag className="w-4 h-4 text-yellow-800" />;
    if (!cell.isRevealed) return '';
    if (cell.isMine) return <Bomb className="w-4 h-4 text-white" />;
    return cell.neighborMines > 0 ? cell.neighborMines : '';
  };

  if (!gameState.isPlaying && !gameState.isGameOver && !gameState.isWon) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">💣 Minesweeper</h1>
          <p className="text-gray-600">Find all mines without detonating them</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Player Name
            </label>
            <input
              type="text"
              value={player.name}
              onChange={(e) => setPlayer({ ...player, name: e.target.value })}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={20}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">Select Difficulty:</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                const config = DIFFICULTY_CONFIGS[difficulty];
                return (
                  <button
                    key={difficulty}
                    onClick={() => startGame(difficulty)}
                    disabled={!player.name.trim()}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all duration-200',
                      'border-gray-200 bg-white hover:border-purple-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="text-center space-y-2">
                      <div className="text-2xl font-bold capitalize">{difficulty}</div>
                      <div className="text-sm text-gray-500">
                        {config.rows}×{config.cols}
                      </div>
                      <div className="text-xs text-gray-400">
                        {config.mines} mines
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Left Side - Game Area */}
      <div className="flex-1 flex flex-col p-4">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/games')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <h1 className="text-xl font-bold text-gray-800">💣 Minesweeper</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="text-sm">{isFullscreen ? 'Exit' : 'Full'}</span>
            </button>
            
            <button
              onClick={newGame}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors px-3 py-2 rounded-lg hover:bg-purple-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">New</span>
            </button>
          </div>
        </div>

        {/* Instructions - Compact */}
        {gameState.isPlaying && (
          <div className="text-center text-xs text-gray-500 mb-2">
            <p>Left click to reveal • Right click to flag • Find all mines</p>
          </div>
        )}

        {/* Game Board - Centered and Scaled */}
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="inline-grid gap-1 p-2 bg-gray-200 rounded-lg max-w-full max-h-full overflow-auto"
            style={{
              gridTemplateColumns: `repeat(${gameState.board[0]?.length || 9}, minmax(1.5rem, 2rem))`
            }}
          >
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => revealCell(rowIndex, colIndex)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(rowIndex, colIndex);
                  }}
                  className={cn(
                    'w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold rounded transition-all duration-200',
                    getCellColor(cell),
                    'border border-gray-400',
                    'hover:scale-105 active:scale-95'
                  )}
                  disabled={gameState.isGameOver || gameState.isWon}
                >
                  {getCellContent(cell)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Score Panel */}
      <div className="w-full lg:w-80 bg-gray-50 border-l border-gray-200 p-4 flex flex-col">
        {/* Game Info */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Game Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <span className="text-gray-600">Mines Left</span>
              <span className="text-2xl font-bold text-red-600">{gameState.mineCount - gameState.flaggedCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <span className="text-gray-600">Flagged</span>
              <span className="text-xl font-bold text-yellow-600">{gameState.flaggedCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <span className="text-gray-600">Difficulty</span>
              <span className="text-xl font-bold text-purple-600">{gameState.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Game Over Section */}
        {(gameState.isGameOver || gameState.isWon) && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Game Result</h2>
            <div className={cn(
              'border rounded-lg p-4 mb-4',
              gameState.isWon 
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            )}>
              <div className="text-center">
                {gameState.isWon ? (
                  <>
                    <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-600 font-semibold mb-1">Congratulations!</div>
                    <div className="text-green-600 text-sm">You found all the mines!</div>
                  </>
                ) : (
                  <>
                    <Bomb className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <div className="text-red-600 font-semibold mb-1">Game Over!</div>
                    <div className="text-red-600 text-sm">You hit a mine!</div>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => startGame(gameState.difficulty)}
                className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="w-full py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="mt-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Game Status</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={gameState.isPlaying ? 'text-green-600' : 'text-gray-500'}>
                {gameState.isPlaying ? 'Playing' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Board Size:</span>
              <span className="text-gray-500">
                {gameState.board.length} × {gameState.board[0]?.length || 0}
              </span>
            </div>
            {gameState.startTime && (
              <div className="flex justify-between">
                <span>Started:</span>
                <span className="text-gray-500">
                  {gameState.startTime.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
