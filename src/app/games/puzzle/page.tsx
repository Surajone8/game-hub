'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Shuffle, Trophy } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface PuzzleGameState {
  board: number[];
  size: number;
  moves: number;
  isPlaying: boolean;
  isCompleted: boolean;
  startTime: Date | null;
}

const PUZZLE_SIZE = 3; // 3x3 puzzle
const TOTAL_TILES = PUZZLE_SIZE * PUZZLE_SIZE;

export default function PuzzlePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>({ id: '1', name: '', score: 0 });
  const [gameState, setGameState] = useState<PuzzleGameState>({
    board: [],
    size: PUZZLE_SIZE,
    moves: 0,
    isPlaying: false,
    isCompleted: false,
    startTime: null
  });

  const createSolvedBoard = useCallback((): number[] => {
    return Array.from({ length: TOTAL_TILES }, (_, i) => i);
  }, []);

  const shuffleBoard = useCallback((board: number[]): number[] => {
    const shuffled = [...board];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const isSolvable = useCallback((board: number[]): boolean => {
    let inversions = 0;
    for (let i = 0; i < board.length - 1; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (board[i] !== 0 && board[j] !== 0 && board[i] > board[j]) {
          inversions++;
        }
      }
    }
    return inversions % 2 === 0;
  }, []);

  const getValidMoves = useCallback((emptyIndex: number): number[] => {
    const moves: number[] = [];
    const row = Math.floor(emptyIndex / PUZZLE_SIZE);
    const col = emptyIndex % PUZZLE_SIZE;

    // Check all four directions
    if (row > 0) moves.push(emptyIndex - PUZZLE_SIZE); // Up
    if (row < PUZZLE_SIZE - 1) moves.push(emptyIndex + PUZZLE_SIZE); // Down
    if (col > 0) moves.push(emptyIndex - 1); // Left
    if (col < PUZZLE_SIZE - 1) moves.push(emptyIndex + 1); // Right

    return moves;
  }, []);

  const moveTile = useCallback((index: number) => {
    if (!gameState.isPlaying || gameState.isCompleted) return;

    const emptyIndex = gameState.board.indexOf(0);
    const validMoves = getValidMoves(emptyIndex);

    if (validMoves.includes(index)) {
      const newBoard = [...gameState.board];
      [newBoard[emptyIndex], newBoard[index]] = [newBoard[index], newBoard[emptyIndex]];

      const newMoves = gameState.moves + 1;
      const isCompleted = newBoard.every((tile, i) => tile === i);

      setGameState(prev => ({
        ...prev,
        board: newBoard,
        moves: newMoves,
        isCompleted
      }));

      if (isCompleted) {
        endGame();
      }
    }
  }, [gameState.isPlaying, gameState.isCompleted, gameState.board, gameState.moves, getValidMoves]);

  const startNewGame = useCallback(() => {
    let shuffledBoard: number[];
    do {
      shuffledBoard = shuffleBoard(createSolvedBoard());
    } while (!isSolvable(shuffledBoard));

    setGameState({
      board: shuffledBoard,
      size: PUZZLE_SIZE,
      moves: 0,
      isPlaying: true,
      isCompleted: false,
      startTime: new Date()
    });
  }, [shuffleBoard, createSolvedBoard, isSolvable]);

  const startGame = () => {
    if (!player.name.trim()) return;
    startNewGame();
  };

  const endGame = () => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    // Calculate score based on moves and time
    const baseScore = 1000;
    const movePenalty = gameState.moves * 10;
    const timePenalty = Math.floor(duration / 10);
    const finalScore = Math.max(0, baseScore - movePenalty - timePenalty);

    // Save game result
    const gameResult: GameResult = {
      id: Date.now().toString(),
      gameType: 'puzzle' as GameType,
      players: [{ ...player, score: finalScore }],
      winner: null, // Single player game
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  };

  const newGame = () => {
    setPlayer({ id: '1', name: '', score: 0 });
    setGameState({
      board: [],
      size: PUZZLE_SIZE,
      moves: 0,
      isPlaying: false,
      isCompleted: false,
      startTime: null
    });
  };

  const renderTile = (value: number, index: number) => {
    const isEmpty = value === 0;
    const emptyIndex = gameState.board.indexOf(0);
    const validMoves = getValidMoves(emptyIndex);
    const isMovable = validMoves.includes(index);

    return (
      <button
        key={index}
        onClick={() => moveTile(index)}
        disabled={!gameState.isPlaying || gameState.isCompleted || isEmpty}
        className={cn(
          'w-16 h-16 border-2 border-gray-300 rounded-lg font-bold text-lg transition-all duration-200',
          isEmpty 
            ? 'bg-gray-100 cursor-default' 
            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700',
          isMovable && gameState.isPlaying && !gameState.isCompleted && !isEmpty && 'ring-2 ring-yellow-400 ring-opacity-50',
          !gameState.isPlaying || gameState.isCompleted ? 'cursor-default' : 'cursor-pointer'
        )}
      >
        {isEmpty ? '' : value}
      </button>
    );
  };

  if (!gameState.isPlaying && !gameState.isCompleted) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🧩 Sliding Puzzle</h1>
          <p className="text-gray-600">Arrange the tiles in the correct order</p>
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
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
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
          
          <h1 className="text-3xl font-bold text-gray-800">🧩 Sliding Puzzle</h1>
          
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
            <div className="text-2xl font-bold text-gray-800">{gameState.moves}</div>
            <div className="text-sm text-gray-600">Moves</div>
          </div>
          
          {gameState.isPlaying && !gameState.isCompleted && (
            <button
              onClick={startNewGame}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          )}
        </div>

        {/* Completed */}
        {gameState.isCompleted && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold text-lg">Puzzle Completed!</span>
            </div>
            
            <div className="text-lg text-gray-600">
              Moves: <span className="font-bold text-gray-800">{gameState.moves}</span>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={startNewGame}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
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
        {gameState.isPlaying && !gameState.isCompleted && (
          <div className="text-center text-sm text-gray-500">
            <p>Click on tiles adjacent to the empty space to move them</p>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${PUZZLE_SIZE}, 1fr)` }}>
            {gameState.board.map((tile, index) => renderTile(tile, index))}
          </div>
        </div>
      </div>
    </div>
  );
}
