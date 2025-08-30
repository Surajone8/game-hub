'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Heart, Maximize2, Minimize2 } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface HangmanGameState {
  word: string;
  guessedLetters: Set<string>;
  wrongGuesses: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isWon: boolean;
  startTime: Date | null;
  category: string;
}

const WORDS_BY_CATEGY = {
  animals: ['ELEPHANT', 'GIRAFFE', 'KANGAROO', 'PENGUIN', 'DOLPHIN', 'BUTTERFLY', 'RHINOCEROS', 'OSTRICH'],
  countries: ['CANADA', 'BRAZIL', 'AUSTRALIA', 'JAPAN', 'EGYPT', 'SWEDEN', 'MEXICO', 'INDIA'],
  food: ['PIZZA', 'SUSHI', 'PASTA', 'BURGER', 'SALAD', 'SANDWICH', 'CURRY', 'TACOS'],
  sports: ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'SWIMMING', 'VOLLEYBALL', 'BASEBALL', 'SOCCER', 'HOCKEY']
};

const MAX_WRONG_GUESSES = 6;

export default function HangmanPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameState, setGameState] = useState<HangmanGameState>({
    word: '',
    guessedLetters: new Set(),
    wrongGuesses: 0,
    isPlaying: false,
    isGameOver: false,
    isWon: false,
    startTime: null,
    category: 'animals'
  });

  const getRandomWord = useCallback((category: string): string => {
    const words = WORDS_BY_CATEGY[category as keyof typeof WORDS_BY_CATEGY] || WORDS_BY_CATEGY.animals;
    return words[Math.floor(Math.random() * words.length)];
  }, []);

  const startGame = useCallback((category: string) => {
    if (player.name.trim()) {
      const word = getRandomWord(category);
      setGameState(prev => ({
        ...prev,
        word,
        guessedLetters: new Set(),
        wrongGuesses: 0,
        isPlaying: true,
        isGameOver: false,
        isWon: false,
        startTime: new Date(),
        category
      }));
    }
  }, [player.name, getRandomWord]);

  const guessLetter = useCallback((letter: string) => {
    if (!gameState.isPlaying || gameState.isGameOver) return;

    const upperLetter = letter.toUpperCase();
    if (gameState.guessedLetters.has(upperLetter)) return;

    setGameState(prev => {
      const newGuessedLetters = new Set(prev.guessedLetters);
      newGuessedLetters.add(upperLetter);

      const isCorrectGuess = prev.word.includes(upperLetter);
      const newWrongGuesses = isCorrectGuess ? prev.wrongGuesses : prev.wrongGuesses + 1;

      // Check if won
      const isWon = Array.from(prev.word).every(char => newGuessedLetters.has(char));
      
      // Check if lost
      const isGameOver = newWrongGuesses >= MAX_WRONG_GUESSES;

      return {
        ...prev,
        guessedLetters: newGuessedLetters,
        wrongGuesses: newWrongGuesses,
        isWon,
        isGameOver,
        isPlaying: !isWon && !isGameOver
      };
    });
  }, [gameState.isPlaying, gameState.isGameOver, gameState.word, gameState.guessedLetters]);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const score = gameState.isWon ? 
      Math.max(1000 - (duration * 2) - (gameState.wrongGuesses * 50), 100) : 0;

    // Update player score
    const newPlayer = {
      ...player,
      score: player.score + score
    };
    setPlayer(newPlayer);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'hangman' as GameType,
      players: [newPlayer],
      winner: gameState.isWon ? newPlayer : null,
      timestamp: endTime,
      duration,
      score,
      mistakes: gameState.wrongGuesses
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.isWon, gameState.wrongGuesses, player]);

  const newGame = () => {
    setGameState(prev => ({
      ...prev,
      word: '',
      guessedLetters: new Set(),
      wrongGuesses: 0,
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
    if (gameState.isGameOver || gameState.isWon) {
      endGame();
    }
  }, [gameState.isGameOver, gameState.isWon, endGame]);

  // Prevent arrow key scrolling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getDisplayWord = () => {
    return gameState.word
      .split('')
      .map(letter => gameState.guessedLetters.has(letter) ? letter : '_')
      .join(' ');
  };

  const getHangmanDrawing = () => {
    const stages = [
      // Stage 0: Empty gallows
      <div key="0" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
      </div>,
      // Stage 1: Head
      <div key="1" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-8 h-8 bg-red-500 rounded-full transform translate-x-1/2"></div>
      </div>,
      // Stage 2: Body
      <div key="2" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-8 h-8 bg-red-500 rounded-full transform translate-x-1/2"></div>
        <div className="absolute top-16 right-0 w-1 h-16 bg-red-500 transform translate-x-1/2"></div>
      </div>,
      // Stage 3: Left arm
      <div key="3" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-8 h-8 bg-red-500 rounded-full transform translate-x-1/2"></div>
        <div className="absolute top-16 right-0 w-1 h-16 bg-red-500 transform translate-x-1/2"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 rotate-45 origin-left"></div>
      </div>,
      // Stage 4: Right arm
      <div key="4" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-8 h-8 bg-red-500 rounded-full transform translate-x-1/2"></div>
        <div className="absolute top-16 right-0 w-1 h-16 bg-red-500 transform translate-x-1/2"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 rotate-45 origin-left"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 -rotate-45 origin-left"></div>
      </div>,
      // Stage 5: Left leg
      <div key="5" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-8 h-8 bg-red-500 rounded-full transform translate-x-1/2"></div>
        <div className="absolute top-16 right-0 w-1 h-16 bg-red-500 transform translate-x-1/2"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 rotate-45 origin-left"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 -rotate-45 origin-left"></div>
        <div className="absolute top-32 right-0 w-1 h-8 bg-red-500 transform translate-x-1/2 rotate-45 origin-top"></div>
      </div>,
      // Stage 6: Right leg (game over)
      <div key="6" className="w-32 h-48 relative">
        <div className="absolute top-0 left-1/2 w-1 h-48 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 left-1/2 w-32 h-1 bg-gray-800 transform -translate-x-1/2"></div>
        <div className="absolute top-0 right-0 w-1 h-8 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-16 h-1 bg-gray-800"></div>
        <div className="absolute top-8 right-0 w-8 h-8 bg-red-500 rounded-full transform translate-x-1/2"></div>
        <div className="absolute top-16 right-0 w-1 h-16 bg-red-500 transform translate-x-1/2"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 rotate-45 origin-left"></div>
        <div className="absolute top-20 right-0 w-8 h-1 bg-red-500 transform translate-x-1/2 -translate-y-1/2 -rotate-45 origin-left"></div>
        <div className="absolute top-32 right-0 w-1 h-8 bg-red-500 transform translate-x-1/2 rotate-45 origin-top"></div>
        <div className="absolute top-32 right-0 w-1 h-8 bg-red-500 transform translate-x-1/2 -rotate-45 origin-top"></div>
      </div>
    ];

    return stages[gameState.wrongGuesses] || stages[0];
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (!gameState.isPlaying && !gameState.isGameOver && !gameState.isWon) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🪢 Hangman</h1>
          <p className="text-gray-600">Guess the word before the hangman is complete</p>
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
            <h3 className="text-lg font-medium text-gray-700">Select Category:</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(WORDS_BY_CATEGY).map((category) => (
                <button
                  key={category}
                  onClick={() => startGame(category)}
                  disabled={!player.name.trim()}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all duration-200',
                    'border-gray-200 bg-white hover:border-purple-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className="text-center space-y-2">
                    <div className="text-lg font-bold capitalize">{category}</div>
                    <div className="text-sm text-gray-500">
                      {WORDS_BY_CATEGY[category as keyof typeof WORDS_BY_CATEGY].length} words
                    </div>
                  </div>
                </button>
              ))}
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
    <div className="h-screen flex flex-col p-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => router.push('/games')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        
        <h1 className="text-xl font-bold text-gray-800">🪢 Hangman</h1>
        
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

      {/* Game Info - Compact */}
      <div className="flex justify-center space-x-6 text-sm mb-2">
        <div className="flex items-center space-x-2">
          <Heart className="w-4 h-4 text-red-500" />
          <span>Lives: {MAX_WRONG_GUESSES - gameState.wrongGuesses}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>{gameState.category}</span>
        </div>
      </div>

      {/* Game Over - Compact */}
      {(gameState.isGameOver || gameState.isWon) && (
        <div className="text-center mb-2">
          <div className={cn(
            'inline-flex items-center space-x-2 px-4 py-2 rounded-full text-white text-sm',
            gameState.isWon 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : 'bg-gradient-to-r from-red-500 to-pink-600'
          )}>
            <span>
              {gameState.isWon ? 'Congratulations! You Won!' : 'Game Over! Word: ' + gameState.word}
            </span>
          </div>
          
          <div className="flex justify-center space-x-2 mt-2">
            <button
              onClick={() => startGame(gameState.category)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={newGame}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              New Game
            </button>
          </div>
        </div>
      )}

      {/* Game Content - Compact Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        {/* Hangman Drawing */}
        <div className="flex justify-center">
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="scale-75 lg:scale-100">
              {getHangmanDrawing()}
            </div>
          </div>
        </div>

        {/* Word and Controls */}
        <div className="space-y-4">
          {/* Word Display */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-gray-700">Guess the Word:</h2>
            <div className="text-2xl lg:text-3xl font-mono font-bold text-purple-600 tracking-widest">
              {getDisplayWord()}
            </div>
          </div>

          {/* Alphabet Grid */}
          {gameState.isPlaying && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 text-center">Click a letter:</h3>
              <div className="grid grid-cols-7 gap-1">
                {alphabet.map((letter) => {
                  const isGuessed = gameState.guessedLetters.has(letter);
                  const isCorrect = gameState.word.includes(letter);
                  const isWrong = isGuessed && !isCorrect;
                  
                  return (
                    <button
                      key={letter}
                      onClick={() => guessLetter(letter)}
                      disabled={isGuessed || !gameState.isPlaying}
                      className={cn(
                        'w-8 h-8 lg:w-10 lg:h-10 rounded font-bold text-sm lg:text-base transition-all duration-200',
                        'border-2 border-gray-300',
                        isGuessed && isCorrect && 'bg-green-500 text-white border-green-500',
                        isGuessed && isWrong && 'bg-red-500 text-white border-red-500',
                        !isGuessed && 'bg-white hover:bg-purple-50 hover:border-purple-400',
                        'disabled:cursor-not-allowed'
                      )}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
