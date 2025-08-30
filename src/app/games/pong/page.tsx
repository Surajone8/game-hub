'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Play, Pause } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

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
  score: number;
}

interface PongGameState {
  ball: Ball;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  isPlaying: boolean;
  isPaused: boolean;
  winner: Player | null;
  startTime: Date | null;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 8;
const PADDLE_SPEED = 8;
const BALL_SPEED = 6;

export default function PongPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 }
  ]);
  const [gameState, setGameState] = useState<PongGameState>({
    ball: { x: 0, y: 0, dx: 0, dy: 0, radius: BALL_RADIUS },
    leftPaddle: { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 },
    rightPaddle: { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 },
    isPlaying: false,
    isPaused: false,
    winner: null,
    startTime: null
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  const initializeGame = useCallback(() => {
    const ball: Ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      radius: BALL_RADIUS
    };

    const leftPaddle: Paddle = {
      x: 20,
      y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      score: 0
    };

    const rightPaddle: Paddle = {
      x: CANVAS_WIDTH - 20 - PADDLE_WIDTH,
      y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      score: 0
    };

    setGameState(prev => ({
      ...prev,
      ball,
      leftPaddle,
      rightPaddle
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
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(gameState.leftPaddle.x, gameState.leftPaddle.y, gameState.leftPaddle.width, gameState.leftPaddle.height);
    
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(gameState.rightPaddle.x, gameState.rightPaddle.y, gameState.rightPaddle.width, gameState.rightPaddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.closePath();

    // Draw scores
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.leftPaddle.score.toString(), CANVAS_WIDTH / 4, 80);
    ctx.fillText(gameState.rightPaddle.score.toString(), (CANVAS_WIDTH / 4) * 3, 80);

    // Draw player names
    ctx.font = '16px Arial';
    ctx.fillText(players[0].name || 'Player 1', CANVAS_WIDTH / 4, 120);
    ctx.fillText(players[1].name || 'Player 2', (CANVAS_WIDTH / 4) * 3, 120);
  }, [gameState, players]);

  const updateGame = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    setGameState(prev => {
      const newBall = { ...prev.ball };
      const newLeftPaddle = { ...prev.leftPaddle };
      const newRightPaddle = { ...prev.rightPaddle };

      // Update ball position
      newBall.x += newBall.dx;
      newBall.y += newBall.dy;

      // Ball collision with top and bottom walls
      if (newBall.y <= newBall.radius || newBall.y >= CANVAS_HEIGHT - newBall.radius) {
        newBall.dy = -newBall.dy;
      }

      // Ball collision with paddles
      if (newBall.x <= newLeftPaddle.x + newLeftPaddle.width &&
          newBall.y >= newLeftPaddle.y &&
          newBall.y <= newLeftPaddle.y + newLeftPaddle.height &&
          newBall.dx < 0) {
        newBall.dx = -newBall.dx;
        // Adjust ball direction based on where it hits the paddle
        const hitPos = (newBall.y - newLeftPaddle.y) / newLeftPaddle.height;
        newBall.dy = (hitPos - 0.5) * BALL_SPEED;
      }

      if (newBall.x >= newRightPaddle.x &&
          newBall.y >= newRightPaddle.y &&
          newBall.y <= newRightPaddle.y + newRightPaddle.height &&
          newBall.dx > 0) {
        newBall.dx = -newBall.dx;
        // Adjust ball direction based on where it hits the paddle
        const hitPos = (newBall.y - newRightPaddle.y) / newRightPaddle.height;
        newBall.dy = (hitPos - 0.5) * BALL_SPEED;
      }

      // Ball goes out of bounds
      if (newBall.x < 0) {
        newRightPaddle.score++;
        if (newRightPaddle.score >= 11) {
          return { ...prev, winner: players[1], isPlaying: false };
        }
        // Reset ball
        newBall.x = CANVAS_WIDTH / 2;
        newBall.y = CANVAS_HEIGHT / 2;
        newBall.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
        newBall.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
      }

      if (newBall.x > CANVAS_WIDTH) {
        newLeftPaddle.score++;
        if (newLeftPaddle.score >= 11) {
          return { ...prev, winner: players[0], isPlaying: false };
        }
        // Reset ball
        newBall.x = CANVAS_WIDTH / 2;
        newBall.y = CANVAS_HEIGHT / 2;
        newBall.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
        newBall.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
      }

      // Update paddle positions based on keys pressed
      if (keysPressed.current.has('w') && newLeftPaddle.y > 0) {
        newLeftPaddle.y -= PADDLE_SPEED;
      }
      if (keysPressed.current.has('s') && newLeftPaddle.y < CANVAS_HEIGHT - newLeftPaddle.height) {
        newLeftPaddle.y += PADDLE_SPEED;
      }
      if (keysPressed.current.has('ArrowUp') && newRightPaddle.y > 0) {
        newRightPaddle.y -= PADDLE_SPEED;
      }
      if (keysPressed.current.has('ArrowDown') && newRightPaddle.y < CANVAS_HEIGHT - newRightPaddle.height) {
        newRightPaddle.y += PADDLE_SPEED;
      }

      return {
        ...prev,
        ball: newBall,
        leftPaddle: newLeftPaddle,
        rightPaddle: newRightPaddle
      };
    });
  }, [gameState.isPlaying, gameState.isPaused, players]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    keysPressed.current.add(event.key.toLowerCase());
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressed.current.delete(event.key.toLowerCase());
  }, []);

  const startGame = () => {
    if (players.every(p => p.name.trim())) {
      initializeGame();
      setGameState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        startTime: new Date()
      }));
    }
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

    const winnerPlayer = gameState.winner;
    
    // Update player scores
    const newPlayers = players.map(player => ({
      ...player,
      score: winnerPlayer && player.id === winnerPlayer.id ? player.score + 1 : player.score,
      isWinner: winnerPlayer ? player.id === winnerPlayer.id : false
    }));

    setPlayers(newPlayers);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'pong' as GameType,
      players: newPlayers,
      winner: winnerPlayer,
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  };

  const resetGame = () => {
    initializeGame();
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      winner: null,
      startTime: new Date()
    }));
  };

  const newGame = () => {
    setGameState({
      ball: { x: 0, y: 0, dx: 0, dy: 0, radius: BALL_RADIUS },
      leftPaddle: { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 },
      rightPaddle: { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 },
      isPlaying: false,
      isPaused: false,
      winner: null,
      startTime: null
    });
    setPlayers([
      { id: '1', name: '', score: 0 },
      { id: '2', name: '', score: 0 }
    ]);
  };

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
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
  }, [gameState.isPlaying, gameState.isPaused, updateGame]);

  useEffect(() => {
    if (gameState.winner) {
      endGame();
    }
  }, [gameState.winner]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    drawGame();
  }, [gameState, drawGame]);

  if (!gameState.isPlaying && !gameState.winner) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🏓 Pong</h1>
          <p className="text-gray-600">Classic two-player paddle game</p>
        </div>

        <div className="space-y-6">
          {players.map((player, index) => (
            <div key={player.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Player {index + 1} ({index === 0 ? 'Left' : 'Right'})
              </label>
              <input
                type="text"
                value={player.name}
                onChange={(e) => {
                  const newPlayers = [...players];
                  newPlayers[index].name = e.target.value;
                  setPlayers(newPlayers);
                }}
                placeholder={`Enter Player ${index + 1} name`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={20}
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button
            onClick={startGame}
            disabled={!players.every(p => p.name.trim())}
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
          
          <h1 className="text-3xl font-bold text-gray-800">🏓 Pong</h1>
          
          <button
            onClick={newGame}
            className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 gap-6">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200',
                'border-gray-200 bg-white'
              )}
            >
              <div className="text-center space-y-2">
                <div className={cn(
                  'w-8 h-8 rounded mx-auto',
                  index === 0 ? 'bg-blue-500' : 'bg-red-500'
                )}></div>
                <div className="font-medium text-gray-700">{player.name}</div>
                <div className="text-sm text-gray-500">Score: {player.score}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Game Over */}
        {gameState.winner && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
              <span className="font-semibold text-lg">
                {gameState.winner.name} Wins!
              </span>
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
                New Players
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {gameState.isPlaying && !gameState.winner && (
          <div className="text-center text-sm text-gray-500">
            <p>Left Player: W/S keys • Right Player: Arrow Up/Down keys • First to 11 points wins</p>
          </div>
        )}

        {/* Pause Button */}
        {gameState.isPlaying && !gameState.winner && (
          <div className="text-center">
            <button
              onClick={togglePause}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
            >
              {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{gameState.isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Game Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}
