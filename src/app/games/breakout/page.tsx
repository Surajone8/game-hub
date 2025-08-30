'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Play, Pause } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';


interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isDestroyed: boolean;
}

interface BreakoutGameState {
  ball: Ball;
  paddle: Paddle;
  bricks: Brick[];
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  lives: number;
  gameOver: boolean;
  startTime: Date | null;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 80;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 2;

const BRICK_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export default function BreakoutPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [gameState, setGameState] = useState<BreakoutGameState>({
    ball: { x: 0, y: 0, dx: 0, dy: 0, radius: BALL_RADIUS },
    paddle: { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
    bricks: [],
    isPlaying: false,
    isPaused: false,
    score: 0,
    lives: 3,
    gameOver: false,
    startTime: null
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const initializeGame = useCallback(() => {
    const ball: Ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      dx: 4,
      dy: -4,
      radius: BALL_RADIUS
    };

    const paddle: Paddle = {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    };

    const bricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING,
          y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 50,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: BRICK_COLORS[row],
          isDestroyed: false
        });
      }
    }

    setGameState(prev => ({
      ...prev,
      ball,
      paddle,
      bricks,
      score: 0,
      lives: 3,
      gameOver: false
    }));
  }, []);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bricks
    gameState.bricks.forEach(brick => {
      if (!brick.isDestroyed) {
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      }
    });

    // Draw paddle
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(gameState.paddle.x, gameState.paddle.y, gameState.paddle.width, gameState.paddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.closePath();

    // Draw UI
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 10, 30);
    ctx.fillText(`Lives: ${gameState.lives}`, 10, 60);
  }, [gameState]);

  const updateGame = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.gameOver) return;

    setGameState(prev => {
      const newBall = { ...prev.ball };
      const newBricks = [...prev.bricks];
      let newScore = prev.score;
      let newLives = prev.lives;
      let gameOver = prev.gameOver;

      // Update ball position
      newBall.x += newBall.dx;
      newBall.y += newBall.dy;

      // Ball collision with walls
      if (newBall.x <= newBall.radius || newBall.x >= CANVAS_WIDTH - newBall.radius) {
        newBall.dx = -newBall.dx;
      }
      if (newBall.y <= newBall.radius) {
        newBall.dy = -newBall.dy;
      }

      // Ball collision with paddle
      if (newBall.y + newBall.radius >= prev.paddle.y &&
          newBall.x >= prev.paddle.x &&
          newBall.x <= prev.paddle.x + prev.paddle.width) {
        newBall.dy = -Math.abs(newBall.dy);
        // Adjust ball direction based on where it hits the paddle
        const hitPos = (newBall.x - prev.paddle.x) / prev.paddle.width;
        newBall.dx = (hitPos - 0.5) * 8;
      }

      // Ball collision with bricks
      newBricks.forEach((brick, index) => {
        if (!brick.isDestroyed &&
            newBall.x >= brick.x &&
            newBall.x <= brick.x + brick.width &&
            newBall.y >= brick.y &&
            newBall.y <= brick.y + brick.height) {
          newBricks[index] = { ...brick, isDestroyed: true };
          newBall.dy = -newBall.dy;
          newScore += 10;
        }
      });

      // Ball falls below paddle
      if (newBall.y >= CANVAS_HEIGHT) {
        newLives--;
        if (newLives <= 0) {
          gameOver = true;
        } else {
          // Reset ball position
          newBall.x = CANVAS_WIDTH / 2;
          newBall.y = CANVAS_HEIGHT - 100;
          newBall.dx = 4;
          newBall.dy = -4;
        }
      }

      // Check if all bricks are destroyed
      const remainingBricks = newBricks.filter(brick => !brick.isDestroyed);
      if (remainingBricks.length === 0) {
        gameOver = true;
      }

      return {
        ...prev,
        ball: newBall,
        bricks: newBricks,
        score: newScore,
        lives: newLives,
        gameOver
      };
    });
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState.isPlaying || gameState.gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    
    setGameState(prev => ({
      ...prev,
      paddle: {
        ...prev.paddle,
        x: Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, mouseX - PADDLE_WIDTH / 2))
      }
    }));
  }, [gameState.isPlaying, gameState.gameOver]);

  const startGame = () => {
    if (!player.name.trim()) return;

    initializeGame();
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      startTime: new Date()
    }));
  };

  const togglePause = () => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'breakout' as GameType,
      players: [{ ...player, score: gameState.score }],
      winner: null, // Single player game
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.score, player]);

  const resetGame = () => {
    initializeGame();
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      startTime: new Date()
    }));
  };

  const newGame = () => {
    setPlayer({ id: '1', name: '', score: 0 });
    setGameState({
      ball: { x: 0, y: 0, dx: 0, dy: 0, radius: BALL_RADIUS },
      paddle: { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT },
      bricks: [],
      isPlaying: false,
      isPaused: false,
      score: 0,
      lives: 3,
      gameOver: false,
      startTime: null
    });
  };

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      gameLoopRef.current = setInterval(() => {
        updateGame();
      }, 16); // ~60 FPS
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
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, updateGame]);

  useEffect(() => {
    if (gameState.gameOver) {
      endGame();
    }
  }, [gameState.gameOver, endGame]);

  useEffect(() => {
    drawGame();
  }, [gameState, drawGame]);

  if (!gameState.isPlaying && !gameState.gameOver) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🏓 Breakout</h1>
          <p className="text-gray-600">Break all the bricks with your paddle</p>
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
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-700 hover:to-red-700 transition-all duration-200"
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
          
          <h1 className="text-3xl font-bold text-gray-800">🏓 Breakout</h1>
          
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
            <div className="text-2xl font-bold text-gray-800">{gameState.lives}</div>
            <div className="text-sm text-gray-600">Lives</div>
          </div>
          
          {gameState.isPlaying && !gameState.gameOver && (
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
                className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200"
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
            <p>Move your mouse to control the paddle • Break all bricks to win</p>
          </div>
        )}
      </div>

      {/* Game Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          className="border-2 border-gray-300 rounded-lg cursor-none"
        />
      </div>
    </div>
  );
}
