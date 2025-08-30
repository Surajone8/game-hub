'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';


interface Bird {
  x: number;
  y: number;
  velocity: number;
  gravity: number;
  size: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
}

interface FlappyGameState {
  bird: Bird;
  pipes: Pipe[];
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
  startTime: Date | null;
  gameSpeed: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BIRD_SIZE = 30;
const PIPE_WIDTH = 80;
const PIPE_GAP = 200;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const PIPE_SPEED = 3;

export default function FlappyPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameState, setGameState] = useState<FlappyGameState>({
    bird: {
      x: 150,
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
      gravity: GRAVITY,
      size: BIRD_SIZE
    },
    pipes: [],
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    highScore: 0,
    startTime: null,
    gameSpeed: PIPE_SPEED
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const initializeGame = useCallback(() => {
    const bird: Bird = {
      x: 150,
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
      gravity: GRAVITY,
      size: BIRD_SIZE
    };

    const pipes: Pipe[] = [
      {
        x: CANVAS_WIDTH,
        topHeight: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50,
        bottomY: 0,
        width: PIPE_WIDTH,
        gap: PIPE_GAP,
        passed: false
      }
    ];

    setGameState(prev => ({
      ...prev,
      bird,
      pipes,
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      startTime: new Date()
    }));
  }, []);

  const startGame = useCallback(() => {
    if (player.name.trim()) {
      initializeGame();
    }
  }, [player.name, initializeGame]);

  const jump = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;

    setGameState(prev => ({
      ...prev,
      bird: {
        ...prev.bird,
        velocity: JUMP_FORCE
      }
    }));
  }, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver]);

  const updateGame = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) return;

    setGameState(prev => {
      // Update bird physics
      const newBird = { ...prev.bird };
      newBird.velocity += newBird.gravity;
      newBird.y += newBird.velocity;

      // Check bird boundaries
      if (newBird.y < 0) {
        newBird.y = 0;
        newBird.velocity = 0;
      }
      if (newBird.y + newBird.size > CANVAS_HEIGHT) {
        return { ...prev, isGameOver: true, isPlaying: false };
      }

      // Update pipes
      const newPipes = prev.pipes.map(pipe => ({
        ...pipe,
        x: pipe.x - prev.gameSpeed
      })).filter(pipe => pipe.x + pipe.width > 0);

      // Add new pipes
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < CANVAS_WIDTH - 300) {
        const lastPipe = newPipes[newPipes.length - 1];
        const newPipe: Pipe = {
          x: lastPipe ? lastPipe.x + 300 : CANVAS_WIDTH,
          topHeight: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50,
          bottomY: 0,
          width: PIPE_WIDTH,
          gap: PIPE_GAP,
          passed: false
        };
        newPipes.push(newPipe);
      }

      // Check collisions and scoring
      let newScore = prev.score;
      let isGameOver = false;

      newPipes.forEach(pipe => {
        // Check if bird passed pipe
        if (!pipe.passed && pipe.x + pipe.width < newBird.x) {
          pipe.passed = true;
          newScore++;
        }

        // Check collision with pipes
        if (newBird.x + newBird.size > pipe.x && 
            newBird.x < pipe.x + pipe.width) {
          if (newBird.y < pipe.topHeight || 
              newBird.y + newBird.size > pipe.topHeight + pipe.gap) {
            isGameOver = true;
          }
        }
      });

      return {
        ...prev,
        bird: newBird,
        pipes: newPipes,
        score: newScore,
        isGameOver,
        isPlaying: !isGameOver
      };
    });
  }, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
      const x = (Date.now() * 0.02 + i * 200) % (CANVAS_WIDTH + 100) - 50;
      const y = 50 + i * 30;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
      ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw pipes
    gameState.pipes.forEach(pipe => {
      // Top pipe
      ctx.fillStyle = '#228B22';
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
      
      // Pipe cap
      ctx.fillStyle = '#006400';
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipe.width + 10, 20);

      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, pipe.width, CANVAS_HEIGHT - pipe.topHeight - pipe.gap);
      ctx.fillRect(pipe.x - 5, pipe.topHeight + pipe.gap, pipe.width + 10, 20);
    });

    // Draw bird
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(gameState.bird.x + gameState.bird.size / 2, gameState.bird.y + gameState.bird.size / 2, gameState.bird.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Bird eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(gameState.bird.x + gameState.bird.size / 2 + 8, gameState.bird.y + gameState.bird.size / 2 - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Bird wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(gameState.bird.x + gameState.bird.size / 2 - 5, gameState.bird.y + gameState.bird.size / 2 + 5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = '#000';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score.toString(), CANVAS_WIDTH / 2, 80);

    // Draw high score
    if (gameState.highScore > 0) {
      ctx.font = '24px Arial';
      ctx.fillText(`High Score: ${gameState.highScore}`, CANVAS_WIDTH / 2, 120);
    }

    // Draw game over screen
    if (gameState.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#fff';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
      
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      
      if (gameState.score > gameState.highScore) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('New High Score!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      }
    }

    // Draw pause screen
    if (gameState.isPaused && !gameState.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#fff';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  }, [gameState]);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const score = gameState.score;
    const newHighScore = Math.max(gameState.highScore, score);

    // Update player score
    const newPlayer = {
      ...player,
      score: player.score + score
    };
    setPlayer(newPlayer);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'flappy' as GameType,
      players: [newPlayer],
      winner: score > 0 ? newPlayer : null,
      timestamp: endTime,
      duration,
      score
    };

    GameStorage.addGameResult(gameResult);

    // Update high score
    setGameState(prev => ({
      ...prev,
      highScore: newHighScore
    }));
  }, [gameState.startTime, gameState.score, gameState.highScore, player]);

  const togglePause = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  }, []);

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

  const resetGame = () => {
    initializeGame();
  };

  const newGame = () => {
    setGameState(prev => ({
      ...prev,
      bird: {
        x: 150,
        y: CANVAS_HEIGHT / 2,
        velocity: 0,
        gravity: GRAVITY,
        size: BIRD_SIZE
      },
      pipes: [],
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      score: 0,
      startTime: null
    }));
    setPlayer({ id: '1', name: '', score: 0 });
  };

  useEffect(() => {
    if (gameState.isGameOver) {
      endGame();
    }
  }, [gameState.isGameOver, endGame]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      const gameLoop = (currentTime: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = currentTime;
        }
        

        lastTimeRef.current = currentTime;
        
        updateGame();
        drawGame();
        
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      };
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, updateGame, drawGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent all arrow key scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      
      if (event.code === 'Space') {
        if (gameState.isPlaying && !gameState.isPaused) {
          jump();
        } else if (gameState.isPlaying && gameState.isPaused) {
          togglePause();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isPlaying, gameState.isPaused, jump, togglePause]);

  if (!gameState.isPlaying && !gameState.isGameOver) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🐦 Flappy Bird</h1>
          <p className="text-gray-600">Navigate through pipes without hitting them</p>
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
            <h3 className="text-lg font-medium text-gray-700">How to Play:</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Press SPACE or click to flap</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Avoid hitting pipes and ground</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Score points by passing through pipes</span>
              </div>
            </div>
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
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Left Side - Game Area */}
      <div className="flex-1 flex flex-col p-2">
        {/* Header - Ultra Compact */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/games')}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors px-2 py-1 rounded hover:bg-gray-100"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="text-xs">Back</span>
          </button>
          
          <h1 className="text-lg font-bold text-gray-800">🐦 Flappy Bird</h1>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span className="text-xs">{isFullscreen ? 'Exit' : 'Full'}</span>
            </button>
            
            <button
              onClick={newGame}
              className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 transition-colors px-2 py-1 rounded hover:bg-purple-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="text-xs">New</span>
            </button>
          </div>
        </div>

        {/* Instructions and Controls - Ultra Compact */}
        {gameState.isPlaying && !gameState.isGameOver && (
          <div className="text-center text-xs text-gray-500 mb-1">
            <p>SPACE/Click to flap • Avoid pipes</p>
            <button
              onClick={togglePause}
              className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
            >
              {gameState.isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        )}

        {/* Game Canvas - Centered and Scaled */}
        <div className="flex-1 flex items-center justify-center p-2">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-gray-300 rounded-lg cursor-pointer w-full h-full object-contain"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
            onClick={gameState.isPlaying && !gameState.isPaused ? jump : undefined}
          />
        </div>
      </div>

      {/* Right Side - Score Panel */}
      <div className="w-full lg:w-72 bg-gray-50 border-l border-gray-200 p-3 flex flex-col">
        {/* Score Section */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">Score</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-gray-600 text-sm">Current</span>
              <span className="text-xl font-bold text-blue-600">{gameState.score}</span>
            </div>
            {gameState.highScore > 0 && (
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 text-sm">High</span>
                <span className="text-lg font-bold text-green-600">{gameState.highScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Game Over Section */}
        {gameState.isGameOver && (
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-800 mb-2">Game Over</h2>
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
              <div className="text-center">
                <div className="text-red-600 font-semibold text-sm mb-1">Score: {gameState.score}</div>
                {gameState.score > gameState.highScore && (
                  <div className="text-green-600 text-xs font-medium">🎉 New High!</div>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={resetGame}
                className="w-full py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="w-full py-1 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="mt-auto">
          <h2 className="text-base font-bold text-gray-800 mb-2">Game Info</h2>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={gameState.isPlaying ? 'text-green-600' : 'text-gray-500'}>
                {gameState.isPlaying ? 'Playing' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Paused:</span>
              <span className={gameState.isPaused ? 'text-yellow-600' : 'text-gray-500'}>
                {gameState.isPaused ? 'Yes' : 'No'}
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
