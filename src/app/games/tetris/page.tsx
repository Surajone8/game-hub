'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Play, Pause } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Direction = 'LEFT' | 'RIGHT' | 'DOWN';

interface Position {
  x: number;
  y: number;
}

interface Tetromino {
  type: TetrominoType;
  position: Position;
  rotation: number;
  shape: number[][];
}

interface TetrisGameState {
  board: (TetrominoType | null)[][];
  currentPiece: Tetromino | null;
  nextPiece: TetrominoType;
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  startTime: Date | null;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const TETROMINOES = {
  I: {
    shape: [
      [1, 1, 1, 1]
    ],
    color: 'bg-cyan-500'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'bg-yellow-500'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: 'bg-purple-500'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 'bg-green-500'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: 'bg-red-500'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 'bg-blue-500'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 'bg-orange-500'
  }
};

export default function TetrisPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [gameState, setGameState] = useState<TetrisGameState>({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)),
    currentPiece: null,
    nextPiece: 'I',
    isPlaying: false,
    isPaused: false,
    score: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    startTime: null
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [showDropPreview, setShowDropPreview] = useState(false);

  const createTetromino = useCallback((type: TetrominoType): Tetromino => {
    return {
      type,
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
      rotation: 0,
      shape: TETROMINOES[type].shape
    };
  }, []);

  const getRandomTetromino = useCallback((): TetrominoType => {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return types[Math.floor(Math.random() * types.length)];
  }, []);

  const isValidPosition = useCallback((piece: Tetromino, position: Position): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = position.x + x;
          const newY = position.y + y;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }
          
          if (newY >= 0 && gameState.board[newY][newX] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }, [gameState.board]);

  const getDropPreviewPosition = useCallback((piece: Tetromino): Position => {
    let dropY = piece.position.y;
    
    // Move the piece down until it collides
    while (isValidPosition(piece, { x: piece.position.x, y: dropY + 1 })) {
      dropY++;
    }
    
    return { x: piece.position.x, y: dropY };
  }, [isValidPosition]);

  const placePiece = useCallback(() => {
    if (!gameState.currentPiece) return;

    const newBoard = gameState.board.map(row => [...row]);
    const piece = gameState.currentPiece;

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y;
          const boardX = piece.position.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = piece.type;
          }
        }
      }
    }

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPiece: createTetromino(prev.nextPiece),
      nextPiece: getRandomTetromino()
    }));
  }, [gameState.currentPiece, gameState.board, createTetromino, getRandomTetromino]);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      gameOver: true
    }));

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'tetris' as GameType,
      players: [{ ...player, score: gameState.score }],
      winner: null, // Single player game
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.score, player]);

  const clearLines = useCallback(() => {
    const newBoard = [...gameState.board];
    let linesCleared = 0;
    
    // Check each row from bottom to top
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      // If a row is completely filled, remove it and add a new empty row at the top
      if (newBoard[y].every(cell => cell !== null)) {
        newBoard.splice(y, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(null));
        linesCleared++;
        y++; // Re-check the same row index since we removed a row
      }
    }

    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800][linesCleared] * gameState.level;
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        score: prev.score + points,
        linesCleared: prev.linesCleared + linesCleared,
        level: Math.floor((prev.linesCleared + linesCleared) / 10) + 1
      }));
    }
  }, [gameState.board, gameState.level]);

  const movePiece = useCallback((direction: Direction) => {
    if (!gameState.currentPiece || !gameState.isPlaying || gameState.isPaused) return;

    const newPosition = { ...gameState.currentPiece.position };
    
    switch (direction) {
      case 'LEFT':
        newPosition.x -= 1;
        break;
      case 'RIGHT':
        newPosition.x += 1;
        break;
      case 'DOWN':
        newPosition.y += 1;
        break;
    }

    if (isValidPosition(gameState.currentPiece, newPosition)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: prev.currentPiece ? {
          ...prev.currentPiece,
          position: newPosition
        } : null
      }));
    } else if (direction === 'DOWN') {
      placePiece();
      clearLines();
      
      // Check if the new piece can be placed - if not, game over
      const nextPiece = createTetromino(gameState.nextPiece);
      if (!isValidPosition(nextPiece, nextPiece.position)) {
        endGame();
      }
    }
  }, [gameState.currentPiece, gameState.isPlaying, gameState.isPaused, isValidPosition, placePiece, clearLines, createTetromino, gameState.nextPiece, endGame]);

  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || !gameState.isPlaying || gameState.isPaused) return;

    // Find the lowest valid position
    const dropPosition = getDropPreviewPosition(gameState.currentPiece);

    // Place the piece at the lowest position
    setGameState(prev => ({
      ...prev,
      currentPiece: { ...prev.currentPiece!, position: dropPosition }
    }));

    // Immediately place and clear lines
    setTimeout(() => {
      placePiece();
      clearLines();
      
      // Check if the new piece can be placed - if not, game over
      const nextPiece = createTetromino(gameState.nextPiece);
      if (!isValidPosition(nextPiece, nextPiece.position)) {
        endGame();
      }
    }, 0);
  }, [gameState.currentPiece, gameState.isPlaying, gameState.isPaused, isValidPosition, placePiece, clearLines, createTetromino, gameState.nextPiece, getDropPreviewPosition, endGame]);

  const rotatePiece = useCallback(() => {
    if (!gameState.currentPiece || !gameState.isPlaying || gameState.isPaused) return;

    const rotatedShape = gameState.currentPiece.shape[0].map((_, i) =>
      gameState.currentPiece!.shape.map(row => row[i]).reverse()
    );

    const rotatedPiece = {
      ...gameState.currentPiece,
      shape: rotatedShape
    };

    // Try to place the rotated piece
    if (isValidPosition(rotatedPiece, rotatedPiece.position)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: rotatedPiece
      }));
    } else {
      // Try wall kicks - attempt to move the piece left or right to make rotation work
      const leftKick = { ...rotatedPiece.position, x: rotatedPiece.position.x - 1 };
      const rightKick = { ...rotatedPiece.position, x: rotatedPiece.position.x + 1 };
      
      if (isValidPosition(rotatedPiece, leftKick)) {
        setGameState(prev => ({
          ...prev,
          currentPiece: { ...rotatedPiece, position: leftKick }
        }));
      } else if (isValidPosition(rotatedPiece, rightKick)) {
        setGameState(prev => ({
          ...prev,
          currentPiece: { ...rotatedPiece, position: rightKick }
        }));
      }
    }
  }, [gameState.currentPiece, gameState.isPlaying, gameState.isPaused, isValidPosition]);

  const gameLoop = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.gameOver) return;

    movePiece('DOWN');
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, movePiece]);

  const togglePause = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!gameState.isPlaying || gameState.gameOver) return;

    const key = event.key.toLowerCase();
    
    switch (key) {
      case 'arrowleft':
      case 'a':
        movePiece('LEFT');
        break;
      case 'arrowright':
      case 'd':
        movePiece('RIGHT');
        break;
      case 'arrowdown':
      case 's':
        movePiece('DOWN');
        break;
      case 'arrowup':
      case 'w':
        rotatePiece();
        break;
      case ' ':
        togglePause();
        break;
      case 'shift':
        hardDrop();
        break;
    }
  }, [gameState.isPlaying, gameState.gameOver, movePiece, rotatePiece, hardDrop, togglePause]);

  const startGame = () => {
    if (!player.name.trim()) return;

    const newPiece = createTetromino(getRandomTetromino());
    setGameState({
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)),
      currentPiece: newPiece,
      nextPiece: getRandomTetromino(),
      isPlaying: true,
      isPaused: false,
      score: 0,
      level: 1,
      linesCleared: 0,
      gameOver: false,
      startTime: new Date()
    });
  };

  const resetGame = () => {
    const newPiece = createTetromino(getRandomTetromino());
    setGameState({
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)),
      currentPiece: newPiece,
      nextPiece: getRandomTetromino(),
      isPlaying: true,
      isPaused: false,
      score: 0,
      level: 1,
      linesCleared: 0,
      gameOver: false,
      startTime: new Date()
    });
  };

  const newGame = () => {
    setPlayer({ id: '1', name: '', score: 0 });
    resetGame();
  };

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      const speed = Math.max(100, 1000 - (gameState.level - 1) * 100);
      gameLoopRef.current = setInterval(gameLoop, speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, gameState.level, gameLoop]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Check for game over - only when a new piece can't be placed at the top
  useEffect(() => {
    if (gameState.currentPiece && gameState.isPlaying) {
      const piece = gameState.currentPiece;
      // Only check for game over when the piece is at the top and can't move down
      if (piece.position.y <= 0 && !isValidPosition(piece, { ...piece.position, y: piece.position.y + 1 })) {
        endGame();
      }
    }
  }, [gameState.currentPiece, gameState.isPlaying, isValidPosition, endGame]);

  const renderCell = (y: number, x: number) => {
    let cellType: TetrominoType | null = gameState.board[y][x];
    let isCurrentPiece = false;
    let isGhostPiece = false;

    if (gameState.currentPiece) {
      const piece = gameState.currentPiece;
      
      // Check if this is the current piece
      for (let py = 0; py < piece.shape.length; py++) {
        for (let px = 0; px < piece.shape[py].length; px++) {
          if (piece.shape[py][px] && piece.position.y + py === y && piece.position.x + px === x) {
            cellType = piece.type;
            isCurrentPiece = true;
            break;
          }
        }
      }
      
      // Check if this is the drop preview (where the piece will land)
      if (!isCurrentPiece && cellType === null && showDropPreview) {
        const dropPosition = getDropPreviewPosition(piece);
        
        for (let py = 0; py < piece.shape.length; py++) {
          for (let px = 0; px < piece.shape[py].length; px++) {
            if (piece.shape[py][px] && dropPosition.y + py === y && dropPosition.x + px === x) {
              isGhostPiece = true;
              break;
            }
          }
        }
      }
    }

    return (
      <div
        key={`${y}-${x}`}
        className={cn(
          'w-6 h-6 border border-gray-300',
          cellType && TETROMINOES[cellType].color,
          isCurrentPiece && 'opacity-80',
          isGhostPiece && 'bg-gray-400 opacity-30'
        )}
      />
    );
  };

  if (!gameState.isPlaying && !gameState.gameOver) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🧩 Tetris</h1>
          <p className="text-gray-600">Stack falling blocks to clear lines</p>
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
    <div className="max-w-4xl mx-auto space-y-8">
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
          
          <h1 className="text-3xl font-bold text-gray-800">🧩 Tetris</h1>
          
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
            <div className="text-2xl font-bold text-gray-800">{gameState.score}</div>
            <div className="text-sm text-gray-600">Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{gameState.level}</div>
            <div className="text-sm text-gray-600">Level</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{gameState.linesCleared}</div>
            <div className="text-sm text-gray-600">Lines</div>
          </div>
          
          {gameState.isPlaying && (
            <>
              <button
                onClick={togglePause}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{gameState.isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              
              <button
                onClick={() => setShowDropPreview(!showDropPreview)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors',
                  showDropPreview 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                )}
              >
                <span className="w-4 h-4">👁️</span>
                <span>{showDropPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </>
          )}
        </div>

        {/* Game Over */}
        {gameState.gameOver && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full">
              <span className="font-semibold text-lg">Game Over!</span>
            </div>
            
            <div className="text-lg text-gray-600">
              Final Score: <span className="font-bold text-gray-800">{gameState.score}</span>
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

        {/* Instructions */}
        {gameState.isPlaying && !gameState.gameOver && (
          <div className="text-center text-sm text-gray-500">
            <p>Arrow keys or WASD to move • Up/W to rotate • Space to pause • Shift for hard drop</p>
            <p className="mt-1">Toggle drop preview to see where pieces will land</p>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center space-x-8">
        <div className="space-y-2">
          {showDropPreview && (
            <div className="text-center text-sm text-green-600 font-medium">
              👁️ Drop Preview Enabled
            </div>
          )}
          <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
            <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1.5rem)` }}>
              {Array.from({ length: BOARD_HEIGHT }, (_, y) =>
                Array.from({ length: BOARD_WIDTH }, (_, x) => renderCell(y, x))
              )}
            </div>
          </div>
        </div>

        {/* Next Piece */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Next Piece</h3>
            <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${TETROMINOES[gameState.nextPiece].shape[0].length}, 1.5rem)` }}>
                {TETROMINOES[gameState.nextPiece].shape.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`next-${y}-${x}`}
                      className={cn(
                        'w-6 h-6 border border-gray-300',
                        cell && TETROMINOES[gameState.nextPiece].color
                      )}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
