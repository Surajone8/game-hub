'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface WordleGameState {
  targetWord: string;
  guesses: string[];
  currentGuess: string;
  isPlaying: boolean;
  isGameOver: boolean;
  isWon: boolean;
  startTime: Date | null;
  maxGuesses: number;
}

const WORDS = [
  'APPLE', 'BEACH', 'CHAIR', 'DREAM', 'EARTH', 'FLAME', 'GRAPE', 'HOUSE',
  'IMAGE', 'JUICE', 'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PEACE',
  'QUEEN', 'RADIO', 'SMILE', 'TABLE', 'UNITY', 'VOICE', 'WATER', 'YOUTH',
  'ZEBRA', 'BRAIN', 'CLOUD', 'DANCE', 'EAGLE', 'FROST', 'GREEN', 'HEART'
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

export default function WordlePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameState, setGameState] = useState<WordleGameState>({
    targetWord: '',
    guesses: [],
    currentGuess: '',
    isPlaying: false,
    isGameOver: false,
    isWon: false,
    startTime: null,
    maxGuesses: MAX_GUESSES
  });

  const getRandomWord = useCallback((): string => {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }, []);

  const startGame = useCallback(() => {
    if (player.name.trim()) {
      const targetWord = getRandomWord();
      setGameState(prev => ({
        ...prev,
        targetWord,
        guesses: [],
        currentGuess: '',
        isPlaying: true,
        isGameOver: false,
        isWon: false,
        startTime: new Date()
      }));
    }
  }, [player.name, getRandomWord]);

  const handleKeyPress = useCallback((key: string) => {
    if (!gameState.isPlaying || gameState.isGameOver) return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACKSPACE') {
      setGameState(prev => ({
        ...prev,
        currentGuess: prev.currentGuess.slice(0, -1)
      }));
    } else if (key.length === 1 && /^[A-Z]$/.test(key)) {
      if (gameState.currentGuess.length < WORD_LENGTH) {
        setGameState(prev => ({
          ...prev,
          currentGuess: prev.currentGuess + key
        }));
      }
    }
  }, [gameState.isPlaying, gameState.isGameOver, gameState.currentGuess]);

  const submitGuess = useCallback(() => {
    if (gameState.currentGuess.length !== WORD_LENGTH) return;

    const newGuesses = [...gameState.guesses, gameState.currentGuess];
    const isWon = gameState.currentGuess === gameState.targetWord;
    const isGameOver = isWon || newGuesses.length >= MAX_GUESSES;

    setGameState(prev => ({
      ...prev,
      guesses: newGuesses,
      currentGuess: '',
      isWon,
      isGameOver,
      isPlaying: !isGameOver
    }));
  }, [gameState.currentGuess, gameState.guesses, gameState.targetWord]);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const score = gameState.isWon ? 
      Math.max(1000 - (duration * 2) - (gameState.guesses.length * 100), 100) : 0;

    // Update player score
    const newPlayer = {
      ...player,
      score: player.score + score
    };
    setPlayer(newPlayer);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'wordle' as GameType,
      players: [newPlayer],
      winner: gameState.isWon ? newPlayer : null,
      timestamp: endTime,
      duration,
      score,
      moves: gameState.guesses.length
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.isWon, gameState.guesses.length, player]);

  const newGame = () => {
    setGameState(prev => ({
      ...prev,
      targetWord: '',
      guesses: [],
      currentGuess: '',
      isPlaying: false,
      isGameOver: false,
      isWon: false,
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
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent arrow key scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
      
      if (event.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (event.key === 'Backspace') {
        handleKeyPress('BACKSPACE');
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        handleKeyPress(event.key.toUpperCase());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  const getLetterStatus = (letter: string, position: number, guess: string): 'correct' | 'present' | 'absent' => {
    if (letter === gameState.targetWord[position]) {
      return 'correct';
    }
    if (gameState.targetWord.includes(letter)) {
      // Check if this letter appears fewer times in the guess than in the target
      const targetCount = (gameState.targetWord.match(new RegExp(letter, 'g')) || []).length;
      const guessCount = (guess.match(new RegExp(letter, 'g')) || []).length;
      const correctPositions = guess.split('').filter((l, i) => l === letter && l === gameState.targetWord[i]).length;
      
      if (correctPositions + (guessCount - correctPositions) <= targetCount) {
        return 'present';
      }
    }
    return 'absent';
  };

  const getLetterColor = (status: 'correct' | 'present' | 'absent'): string => {
    switch (status) {
      case 'correct': return 'bg-green-500 text-white';
      case 'present': return 'bg-yellow-500 text-white';
      case 'absent': return 'bg-gray-500 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const renderGuess = (guess: string, isCurrent: boolean = false) => {
    const letters = isCurrent ? guess.padEnd(WORD_LENGTH, ' ').split('') : guess.split('');
    
    return (
      <div className="flex gap-2">
        {letters.map((letter, index) => {
          const isEmpty = letter === ' ';
          const status = !isEmpty && !isCurrent ? getLetterStatus(letter, index, guess) : undefined;
          
          return (
            <div
              key={index}
                              className={cn(
                  'w-16 h-16 border-2 flex items-center justify-center text-2xl font-bold rounded transition-all duration-300',
                  isEmpty && 'border-gray-300 bg-white',
                  !isEmpty && !isCurrent && getLetterColor(status!),
                  !isEmpty && isCurrent && 'border-gray-400 bg-white',
                  isCurrent && index === guess.length && 'animate-pulse'
                )}
            >
              {letter}
            </div>
          );
        })}
      </div>
    );
  };

  if (!gameState.isPlaying && !gameState.isGameOver && !gameState.isWon) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">📝 Wordle</h1>
          <p className="text-gray-600">Guess the five-letter word in six tries</p>
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
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Green: Letter is in the correct position</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Yellow: Letter is in the word but wrong position</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span>Gray: Letter is not in the word</span>
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
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/games')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <h1 className="text-xl font-bold text-gray-800">📝 Wordle</h1>
          
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

        {/* Instructions - Ultra Compact */}
        {gameState.isPlaying && (
          <div className="text-center text-xs text-gray-500 mb-1">
            <p>Type & Enter • {MAX_GUESSES} tries</p>
          </div>
        )}

        {/* Game Board - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-1">
          {/* Previous Guesses */}
          {gameState.guesses.map((guess, index) => (
            <div key={index} className="flex justify-center">
              {renderGuess(guess)}
            </div>
          ))}

          {/* Current Guess */}
          {gameState.isPlaying && (
            <div className="flex justify-center">
              {renderGuess(gameState.currentGuess, true)}
            </div>
          )}

          {/* Empty Rows */}
          {Array.from({ length: MAX_GUESSES - gameState.guesses.length - (gameState.isPlaying ? 1 : 0) }).map((_, index) => (
            <div key={`empty-${index}`} className="flex justify-center">
              <div className="flex gap-0.5">
                {Array.from({ length: WORD_LENGTH }).map((_, letterIndex) => (
                  <div
                    key={letterIndex}
                    className="w-10 h-10 border-2 border-gray-300 bg-white rounded"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Virtual Keyboard - Bottom */}
        {gameState.isPlaying && (
          <div className="space-y-1 mt-2">
            <div className="flex justify-center gap-1">
              {'QWERTYUIOP'.split('').map(letter => (
                <button
                  key={letter}
                  onClick={() => handleKeyPress(letter)}
                  className="w-7 h-8 bg-gray-200 hover:bg-gray-300 rounded font-medium text-xs transition-colors"
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-1">
              {'ASDFGHJKL'.split('').map(letter => (
                <button
                  key={letter}
                  onClick={() => handleKeyPress(letter)}
                  className="w-7 h-8 bg-gray-200 hover:bg-gray-300 rounded font-medium text-xs transition-colors"
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-1">
              <button
                onClick={() => handleKeyPress('ENTER')}
                className="w-10 h-8 bg-green-500 hover:bg-green-600 text-white rounded font-medium text-xs transition-colors"
              >
                ENTER
              </button>
              {'ZXCVBNM'.split('').map(letter => (
                <button
                  key={letter}
                  onClick={() => handleKeyPress(letter)}
                  className="w-7 h-8 bg-gray-200 hover:bg-gray-300 rounded font-medium text-xs transition-colors"
                >
                  {letter}
                </button>
              ))}
              <button
                onClick={() => handleKeyPress('BACKSPACE')}
                className="w-10 h-8 bg-red-500 hover:bg-red-600 text-white rounded font-medium text-xs transition-colors"
              >
                ←
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Score Panel */}
      <div className="w-full lg:w-72 bg-gray-50 border-l border-gray-200 p-3 flex flex-col">
        {/* Game Info */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">Game Info</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-gray-600 text-sm">Guesses</span>
              <span className="text-lg font-bold text-blue-600">{gameState.guesses.length}/{MAX_GUESSES}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-gray-600 text-sm">Length</span>
              <span className="text-lg font-bold text-purple-600">{WORD_LENGTH}</span>
            </div>
          </div>
        </div>

        {/* Game Over Section */}
        {(gameState.isGameOver || gameState.isWon) && (
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-800 mb-2">Game Result</h2>
            <div className={cn(
              'border rounded p-2 mb-2',
              gameState.isWon 
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            )}>
              <div className="text-center">
                {gameState.isWon ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-green-600 font-semibold text-sm mb-1">Congratulations!</div>
                    <div className="text-green-600 text-xs">Won in {gameState.guesses.length} guesses!</div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                    <div className="text-red-600 font-semibold text-sm mb-1">Game Over!</div>
                    <div className="text-red-600 text-xs">Word: {gameState.targetWord}</div>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={startGame}
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
          <h2 className="text-base font-bold text-gray-800 mb-2">Game Status</h2>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={gameState.isPlaying ? 'text-green-600' : 'text-gray-500'}>
                {gameState.isPlaying ? 'Playing' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current:</span>
              <span className="text-gray-500 font-mono text-xs">
                {gameState.currentGuess || 'Empty'}
              </span>
            </div>
            {gameState.startTime && (
              <div className="flex justify-between">
                <span>Started:</span>
                <span className="text-gray-500 text-xs">
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
