'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Play, Pause } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type CellType = 'snake' | 'food' | 'empty';

interface Position {
  x: number;
  y: number;
}

interface SnakeGameState {
  snake: Position[];
  food: Position;
  direction: Direction;
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  gameOver: boolean;
  startTime: Date | null;
}

const BOARD_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_FOOD = { x: 5, y: 5 };

export default function SnakePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [gameState, setGameState] = useState<SnakeGameState>({
    snake: INITIAL_SNAKE,
    food: INITIAL_FOOD,
    direction: 'RIGHT',
    isPlaying: false,
    isPaused: false,
    score: 0,
    gameOver: false,
    startTime: null
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const lastDirectionRef = useRef<Direction>('RIGHT');

  const generateFood = useCallback((): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE)
      };
    } while (gameState.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, [gameState.snake]);

  const checkCollision = useCallback((head: Position): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
      return true;
    }
    
    // Self collision
    return gameState.snake.some(segment => segment.x === head.x && segment.y === head.y);
  }, [gameState.snake]);

  const moveSnake = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.gameOver) return;

    const newSnake = [...gameState.snake];
    const head = { ...newSnake[0] };

    switch (lastDirectionRef.current) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    if (checkCollision(head)) {
      endGame();
      return;
    }

    newSnake.unshift(head);

    // Check if food is eaten
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
      const newFood = generateFood();
      setGameState(prev => ({
        ...prev,
        food: newFood,
        score: prev.score + 10
      }));
    } else {
      newSnake.pop();
    }

    setGameState(prev => ({
      ...prev,
      snake: newSnake
    }));
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, gameState.snake, gameState.food, checkCollision, generateFood]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!gameState.isPlaying || gameState.gameOver) return;

    const key = event.key.toLowerCase();
    const currentDirection = lastDirectionRef.current;

    switch (key) {
      case 'arrowup':
      case 'w':
        if (currentDirection !== 'DOWN') {
          lastDirectionRef.current = 'UP';
        }
        break;
      case 'arrowdown':
      case 's':
        if (currentDirection !== 'UP') {
          lastDirectionRef.current = 'DOWN';
        }
        break;
      case 'arrowleft':
      case 'a':
        if (currentDirection !== 'RIGHT') {
          lastDirectionRef.current = 'LEFT';
        }
        break;
      case 'arrowright':
      case 'd':
        if (currentDirection !== 'LEFT') {
          lastDirectionRef.current = 'RIGHT';
        }
        break;
      case ' ':
        togglePause();
        break;
    }
  }, [gameState.isPlaying, gameState.gameOver]);

  const startGame = () => {
    if (!player.name.trim()) return;

    setGameState({
      snake: INITIAL_SNAKE,
      food: INITIAL_FOOD,
      direction: 'RIGHT',
      isPlaying: true,
      isPaused: false,
      score: 0,
      gameOver: false,
      startTime: new Date()
    });
    lastDirectionRef.current = 'RIGHT';
  };

  const togglePause = () => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  const endGame = () => {
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
      gameType: 'snake' as GameType,
      players: [{ ...player, score: gameState.score }],
      winner: null, // Single player game
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  };

  const resetGame = () => {
    setGameState({
      snake: INITIAL_SNAKE,
      food: INITIAL_FOOD,
      direction: 'RIGHT',
      isPlaying: false,
      isPaused: false,
      score: 0,
      gameOver: false,
      startTime: null
    });
    lastDirectionRef.current = 'RIGHT';
  };

  const newGame = () => {
    setPlayer({ id: '1', name: '', score: 0 });
    resetGame();
  };

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      gameLoopRef.current = setInterval(moveSnake, 150);
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
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, moveSnake]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const renderCell = (x: number, y: number) => {
    const isSnakeHead = gameState.snake[0]?.x === x && gameState.snake[0]?.y === y;
    const isSnakeBody = gameState.snake.slice(1).some(segment => segment.x === x && segment.y === y);
    const isFood = gameState.food.x === x && gameState.food.y === y;

    return (
      <div
        key={`${x}-${y}`}
        className={cn(
          'w-4 h-4 border border-gray-200',
          isSnakeHead && 'bg-green-600 rounded-sm',
          isSnakeBody && 'bg-green-500 rounded-sm',
          isFood && 'bg-red-500 rounded-full'
        )}
      />
    );
  };

  if (!gameState.isPlaying && !gameState.gameOver) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🐍 Snake</h1>
          <p className="text-gray-600">Navigate the snake to eat food and grow longer</p>
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
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
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
          
          <h1 className="text-3xl font-bold text-gray-800">🐍 Snake</h1>
          
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
          
          {gameState.isPlaying && (
            <button
              onClick={togglePause}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{gameState.isPaused ? 'Resume' : 'Pause'}</span>
            </button>
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
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
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
            <p>Use arrow keys or WASD to move • Space to pause</p>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1rem)` }}>
            {Array.from({ length: BOARD_SIZE }, (_, y) =>
              Array.from({ length: BOARD_SIZE }, (_, x) => renderCell(x, y))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
