'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Crown } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

type Color = 'red' | 'black';

interface CheckerPiece {
  color: Color;
  isKing: boolean;
}

interface Position {
  row: number;
  col: number;
}

interface CheckersGameState {
  board: (CheckerPiece | null)[][];
  selectedPiece: Position | null;
  currentPlayer: Color;
  isPlaying: boolean;
  isCompleted: boolean;
  winner: Color | null;
  startTime: Date | null;
}

const BOARD_SIZE = 8;

export default function CheckersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 }
  ]);
  const [gameState, setGameState] = useState<CheckersGameState>({
    board: [],
    selectedPiece: null,
    currentPlayer: 'red',
    isPlaying: false,
    isCompleted: false,
    winner: null,
    startTime: null
  });

  const initializeBoard = useCallback((): (CheckerPiece | null)[][] => {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    // Place red pieces (top)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { color: 'red', isKing: false };
        }
      }
    }
    
    // Place black pieces (bottom)
    for (let row = 5; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { color: 'black', isKing: false };
        }
      }
    }
    
    return board;
  }, []);

  const getValidMoves = useCallback((piece: CheckerPiece, position: Position, board: (CheckerPiece | null)[][]): Position[] => {
    const moves: Position[] = [];
    const directions = piece.isKing ? [-1, 1] : piece.color === 'red' ? [1] : [-1];
    
    for (const rowDir of directions) {
      for (const colDir of [-1, 1]) {
        // Check regular moves
        const newRow = position.row + rowDir;
        const newCol = position.col + colDir;
        
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
          if (!board[newRow][newCol]) {
            moves.push({ row: newRow, col: newCol });
          }
        }
        
        // Check jump moves
        const jumpRow = position.row + 2 * rowDir;
        const jumpCol = position.col + 2 * colDir;
        
        if (jumpRow >= 0 && jumpRow < BOARD_SIZE && jumpCol >= 0 && jumpCol < BOARD_SIZE) {
          const middlePiece = board[newRow][newCol];
          if (middlePiece && middlePiece.color !== piece.color && !board[jumpRow][jumpCol]) {
            moves.push({ row: jumpRow, col: jumpCol });
          }
        }
      }
    }
    
    return moves;
  }, []);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const winnerPlayer = gameState.winner === 'red' ? players[0] : players[1];
    
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
      gameType: 'checkers' as GameType,
      players: newPlayers,
      winner: winnerPlayer,
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.winner, players]);

  const hasValidMoves = useCallback((color: Color, board: (CheckerPiece | null)[][]): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color) {
          const moves = getValidMoves(piece, { row, col }, board);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }, [getValidMoves]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState.isPlaying || gameState.isCompleted) return;

    const piece = gameState.board[row][col];
    
    if (gameState.selectedPiece) {
      // Move piece
      const selectedPiece = gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col];
      if (selectedPiece) {
        const validMoves = getValidMoves(selectedPiece, gameState.selectedPiece, gameState.board);
        const isJump = Math.abs(row - gameState.selectedPiece.row) === 2;
        
        if (validMoves.some(move => move.row === row && move.col === col)) {
          const newBoard = gameState.board.map(row => [...row]);
          
          // Move the piece
          newBoard[row][col] = selectedPiece;
          newBoard[gameState.selectedPiece.row][gameState.selectedPiece.col] = null;
          
          // Remove captured piece if it's a jump
          if (isJump) {
            const capturedRow = (gameState.selectedPiece.row + row) / 2;
            const capturedCol = (gameState.selectedPiece.col + col) / 2;
            newBoard[capturedRow][capturedCol] = null;
          }
          
          // Check for king promotion
          if ((selectedPiece.color === 'red' && row === BOARD_SIZE - 1) || 
              (selectedPiece.color === 'black' && row === 0)) {
            newBoard[row][col] = { ...selectedPiece, isKing: true };
          }
          
          const nextPlayer = gameState.currentPlayer === 'red' ? 'black' : 'red';
          
          // Check if game is over
          const isCompleted = !hasValidMoves(nextPlayer, newBoard);
          const winner = isCompleted ? gameState.currentPlayer : null;
          
          setGameState(prev => ({
            ...prev,
            board: newBoard,
            selectedPiece: null,
            currentPlayer: nextPlayer,
            isCompleted,
            winner
          }));
          
          if (isCompleted) {
            endGame();
          }
        } else {
          setGameState(prev => ({ ...prev, selectedPiece: null }));
        }
      }
    } else if (piece && piece.color === gameState.currentPlayer) {
      // Select piece
      setGameState(prev => ({ ...prev, selectedPiece: { row, col } }));
    }
  }, [gameState.isPlaying, gameState.isCompleted, gameState.board, gameState.selectedPiece, gameState.currentPlayer, getValidMoves, hasValidMoves, endGame]);

  const startGame = () => {
    if (players.every(p => p.name.trim())) {
      setGameState({
        board: initializeBoard(),
        selectedPiece: null,
        currentPlayer: 'red',
        isPlaying: true,
        isCompleted: false,
        winner: null,
        startTime: new Date()
      });
    }
  };

  const resetGame = () => {
    setGameState({
      board: initializeBoard(),
      selectedPiece: null,
      currentPlayer: 'red',
      isPlaying: true,
      isCompleted: false,
      winner: null,
      startTime: new Date()
    });
  };

  const newGame = () => {
    setGameState({
      board: [],
      selectedPiece: null,
      currentPlayer: 'red',
      isPlaying: false,
      isCompleted: false,
      winner: null,
      startTime: null
    });
    setPlayers([
      { id: '1', name: '', score: 0 },
      { id: '2', name: '', score: 0 }
    ]);
  };

  const renderCell = (row: number, col: number) => {
    const piece = gameState.board[row][col];
    const isSelected = gameState.selectedPiece?.row === row && gameState.selectedPiece?.col === col;
    const isDarkSquare = (row + col) % 2 === 1;
    
    if (!isDarkSquare) {
      return (
        <div
          key={`${row}-${col}`}
          className="w-12 h-12 bg-red-100"
        />
      );
    }
    
    const isValidMove = gameState.selectedPiece && piece === null;
    const selectedPiece = gameState.selectedPiece ? gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col] : null;
    
    return (
      <button
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        disabled={!gameState.isPlaying || gameState.isCompleted}
        className={cn(
          'w-12 h-12 flex items-center justify-center transition-all duration-200',
          isDarkSquare ? 'bg-red-800' : 'bg-red-100',
          isSelected && 'ring-2 ring-yellow-400 ring-opacity-50',
          isValidMove && selectedPiece && 'bg-green-600 bg-opacity-50',
          !gameState.isPlaying || gameState.isCompleted ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
        )}
      >
        {piece && (
          <div className={cn(
            'w-8 h-8 rounded-full border-2 border-white flex items-center justify-center',
            piece.color === 'red' ? 'bg-red-600' : 'bg-black'
          )}>
            {piece.isKing && (
              <div className="text-white text-xs">♔</div>
            )}
          </div>
        )}
      </button>
    );
  };

  if (!gameState.isPlaying && !gameState.isCompleted) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🔴 Checkers</h1>
          <p className="text-gray-600">Classic checkers game with jumping moves</p>
        </div>

        <div className="space-y-6">
          {players.map((player, index) => (
            <div key={player.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Player {index + 1} ({index === 0 ? 'Red' : 'Black'})
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
            className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-700 hover:to-pink-700 transition-all duration-200"
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
          
          <h1 className="text-3xl font-bold text-gray-800">🔴 Checkers</h1>
          
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
                gameState.currentPlayer === (index === 0 ? 'red' : 'black') && gameState.isPlaying && !gameState.isCompleted
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white'
              )}
            >
              <div className="text-center space-y-2">
                <div className={cn(
                  'w-8 h-8 rounded-full mx-auto',
                  index === 0 ? 'bg-red-600' : 'bg-black'
                )}></div>
                <div className="font-medium text-gray-700">{player.name}</div>
                <div className="text-sm text-gray-500">Score: {player.score}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Game Status */}
        {gameState.isPlaying && !gameState.isCompleted && (
          <div className="text-center">
            <p className="text-lg text-gray-600">
              <span className="font-medium">{players[gameState.currentPlayer === 'red' ? 0 : 1].name}</span>&apos;s turn
            </p>
          </div>
        )}

        {/* Game Over */}
        {gameState.isCompleted && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
              <Crown className="w-5 h-5" />
              <span className="font-semibold text-lg">
                {gameState.winner ? `${players[gameState.winner === 'red' ? 0 : 1].name} Wins!` : "It&apos;s a Draw!"}
              </span>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
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
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-red-900 p-4 rounded-lg border-2 border-red-700">
          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
            {Array.from({ length: BOARD_SIZE }, (_, row) =>
              Array.from({ length: BOARD_SIZE }, (_, col) => renderCell(row, col))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
