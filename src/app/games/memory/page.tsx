'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameState {
  cards: Card[];
  flippedCards: number[];
  currentPlayer: number;
  players: Player[];
  isPlaying: boolean;
  isCompleted: boolean;
  startTime: Date | null;
}

const CARD_VALUES = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];
const BOARD_SIZE = 4; // 4x4 grid = 16 cards = 8 pairs

export default function MemoryPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<MemoryGameState>({
    cards: [],
    flippedCards: [],
    currentPlayer: 0,
    players: [],
    isPlaying: false,
    isCompleted: false,
    startTime: null
  });

  const createCards = useCallback((): Card[] => {
    const selectedValues = CARD_VALUES.slice(0, BOARD_SIZE * BOARD_SIZE / 2);
    const cardPairs = [...selectedValues, ...selectedValues];
    
    // Shuffle the cards
    const shuffled = cardPairs
      .map((value, index) => ({ id: index, value, isFlipped: false, isMatched: false }))
      .sort(() => Math.random() - 0.5);
    
    return shuffled;
  }, []);

  const initializePlayers = useCallback((playerNames: string[]): Player[] => {
    return playerNames.map((name, index) => ({
      id: (index + 1).toString(),
      name,
      score: 0
    }));
  }, []);

  const flipCard = useCallback((cardId: number) => {
    if (!gameState.isPlaying || gameState.isCompleted) return;
    
    const card = gameState.cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = gameState.cards.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    );

    const newFlippedCards = [...gameState.flippedCards, cardId];

    setGameState(prev => ({
      ...prev,
      cards: newCards,
      flippedCards: newFlippedCards
    }));

    // Check for match if two cards are flipped
    if (newFlippedCards.length === 2) {
      setTimeout(() => {
        checkForMatch(newFlippedCards);
      }, 1000);
    }
  }, [gameState.isPlaying, gameState.isCompleted, gameState.cards, gameState.flippedCards, checkForMatch]);

  const checkForMatch = useCallback((flippedCardIds: number[]) => {
    const [card1, card2] = flippedCardIds.map(id => gameState.cards.find(c => c.id === id)!);
    
    if (card1.value === card2.value) {
      // Match found
      const newCards = gameState.cards.map(c => 
        flippedCardIds.includes(c.id) ? { ...c, isMatched: true, isFlipped: true } : c
      );
      
      const newPlayers = [...gameState.players];
      newPlayers[gameState.currentPlayer].score += 1;

      const isCompleted = newCards.every(card => card.isMatched);

      setGameState(prev => ({
        ...prev,
        cards: newCards,
        flippedCards: [],
        players: newPlayers,
        isCompleted
      }));

      if (isCompleted) {
        endGame();
      }
    } else {
      // No match, flip cards back
      const newCards = gameState.cards.map(c => 
        flippedCardIds.includes(c.id) ? { ...c, isFlipped: false } : c
      );
      
      const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

      setGameState(prev => ({
        ...prev,
        cards: newCards,
        flippedCards: [],
        currentPlayer: nextPlayer
      }));
    }
  }, [gameState.cards, gameState.currentPlayer, gameState.players, endGame]);

  const startGame = (playerNames: string[]) => {
    if (playerNames.length === 0 || playerNames.some(name => !name.trim())) return;

    const players = initializePlayers(playerNames);
    const cards = createCards();

    setGameState({
      cards,
      flippedCards: [],
      currentPlayer: 0,
      players,
      isPlaying: true,
      isCompleted: false,
      startTime: new Date()
    });
  };

  const endGame = () => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const winner = gameState.players.reduce((max, player) => 
      player.score > max.score ? player : max
    );

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'memory' as GameType,
      players: gameState.players.map(player => ({
        ...player,
        isWinner: player.id === winner.id
      })),
      winner: winner.score > 0 ? winner : null,
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  };

  const resetGame = () => {
    const cards = createCards();
    setGameState(prev => ({
      ...prev,
      cards,
      flippedCards: [],
      currentPlayer: 0,
      players: prev.players.map(player => ({ ...player, score: 0 })),
      isCompleted: false,
      startTime: new Date()
    }));
  };

  const newGame = () => {
    setGameState({
      cards: [],
      flippedCards: [],
      currentPlayer: 0,
      players: [],
      isPlaying: false,
      isCompleted: false,
      startTime: null
    });
  };

  const renderCard = (card: Card) => {
    return (
      <button
        key={card.id}
        onClick={() => flipCard(card.id)}
        disabled={!gameState.isPlaying || gameState.isCompleted || card.isFlipped || card.isMatched}
        className={cn(
          'w-20 h-20 border-2 border-gray-300 rounded-lg font-bold text-2xl transition-all duration-300 transform',
          card.isFlipped || card.isMatched
            ? 'bg-white rotate-y-0'
            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rotate-y-180',
          card.isMatched && 'bg-green-500 border-green-600',
          !gameState.isPlaying || gameState.isCompleted ? 'cursor-default' : 'cursor-pointer hover:scale-105'
        )}
      >
        {(card.isFlipped || card.isMatched) ? card.value : '?'}
      </button>
    );
  };

  if (!gameState.isPlaying && !gameState.isCompleted) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🧠 Memory Match</h1>
          <p className="text-gray-600">Find matching pairs of cards</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Players (1-4)
            </label>
            <select
              value={gameState.players.length}
              onChange={(e) => {
                const count = parseInt(e.target.value);
                setGameState(prev => ({
                  ...prev,
                  players: Array(count).fill(null).map((_, i) => ({ id: (i + 1).toString(), name: '', score: 0 }))
                }));
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={1}>1 Player</option>
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
            </select>
          </div>

          {gameState.players.map((player, index) => (
            <div key={player.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Player {index + 1} Name
              </label>
              <input
                type="text"
                value={player.name}
                onChange={(e) => {
                  const newPlayers = [...gameState.players];
                  newPlayers[index].name = e.target.value;
                  setGameState(prev => ({ ...prev, players: newPlayers }));
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
            onClick={() => startGame(gameState.players.map(p => p.name))}
            disabled={!gameState.players.every(p => p.name.trim())}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all duration-200"
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
          
          <h1 className="text-3xl font-bold text-gray-800">🧠 Memory Match</h1>
          
          <button
            onClick={newGame}
            className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gameState.players.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200',
                gameState.currentPlayer === index && gameState.isPlaying && !gameState.isCompleted
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white'
              )}
            >
              <div className="text-center space-y-2">
                <div className="text-lg font-bold text-gray-800">
                  {player.name}
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {player.score}
                </div>
                <div className="text-sm text-gray-500">Score</div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Player */}
        {gameState.isPlaying && !gameState.isCompleted && (
          <div className="text-center">
            <p className="text-lg text-gray-600">
              <span className="font-medium">{gameState.players[gameState.currentPlayer].name}</span>&apos;s turn
            </p>
          </div>
        )}

        {/* Completed */}
        {gameState.isCompleted && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold text-lg">Game Completed!</span>
            </div>
            
            <div className="text-lg text-gray-600">
              Winner: <span className="font-bold text-gray-800">
                {gameState.players.reduce((max, player) => 
                  player.score > max.score ? player : max
                ).name}
              </span>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors duration-200"
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
        <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
            {gameState.cards.map(card => renderCard(card))}
          </div>
        </div>
      </div>
    </div>
  );
}
