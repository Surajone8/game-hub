'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Crown } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type Color = 'white' | 'black';

interface ChessPiece {
  type: PieceType;
  color: Color;
  hasMoved?: boolean;
}

interface Position {
  row: number;
  col: number;
}

interface ChessGameState {
  board: (ChessPiece | null)[][];
  selectedPiece: Position | null;
  currentPlayer: Color;
  isPlaying: boolean;
  isCompleted: boolean;
  winner: Color | null;
  startTime: Date | null;
}

const BOARD_SIZE = 8;

const PIECE_SYMBOLS = {
  white: {
    pawn: '♙',
    rook: '♖',
    knight: '♘',
    bishop: '♗',
    queen: '♕',
    king: '♔'
  },
  black: {
    pawn: '♟',
    rook: '♜',
    knight: '♞',
    bishop: '♝',
    queen: '♛',
    king: '♚'
  }
};

export default function ChessPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 }
  ]);
  const [gameState, setGameState] = useState<ChessGameState>({
    board: [],
    selectedPiece: null,
    currentPlayer: 'white',
    isPlaying: false,
    isCompleted: false,
    winner: null,
    startTime: null
  });

  const initializeBoard = useCallback((): (ChessPiece | null)[][] => {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    // Set up pawns
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[1][col] = { type: 'pawn', color: 'black' };
      board[6][col] = { type: 'pawn', color: 'white' };
    }
    
    // Set up other pieces
    const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[0][col] = { type: backRow[col], color: 'black' };
      board[7][col] = { type: backRow[col], color: 'white' };
    }
    
    return board;
  }, []);



  const isValidPawnMove = useCallback((piece: ChessPiece, from: Position, to: Position, board: (ChessPiece | null)[][]): boolean => {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    
    // Forward move
    if (from.col === to.col && !board[to.row][to.col]) {
      if (to.row === from.row + direction) return true;
      if (from.row === startRow && to.row === from.row + 2 * direction && !board[from.row + direction][from.col]) {
        return true;
      }
    }
    
    // Capture move
    if (Math.abs(to.col - from.col) === 1 && to.row === from.row + direction) {
      return board[to.row][to.col] !== null;
    }
    
    return false;
  }, []);

  const isValidRookMove = useCallback((piece: ChessPiece, from: Position, to: Position, board: (ChessPiece | null)[][]): boolean => {
    if (from.row !== to.row && from.col !== to.col) return false;
    
    const rowDir = from.row === to.row ? 0 : (to.row > from.row ? 1 : -1);
    const colDir = from.col === to.col ? 0 : (to.col > from.col ? 1 : -1);
    
    let currentRow = from.row + rowDir;
    let currentCol = from.col + colDir;
    
    while (currentRow !== to.row || currentCol !== to.col) {
      if (board[currentRow][currentCol] !== null) return false;
      currentRow += rowDir;
      currentCol += colDir;
    }
    
    return true;
  }, []);

  const isValidKnightMove = useCallback((piece: ChessPiece, from: Position, to: Position): boolean => {
    const deltaRow = Math.abs(to.row - from.row);
    const deltaCol = Math.abs(to.col - from.col);
    return (deltaRow === 2 && deltaCol === 1) || (deltaRow === 1 && deltaCol === 2);
  }, []);

  const isValidBishopMove = useCallback((piece: ChessPiece, from: Position, to: Position, board: (ChessPiece | null)[][]): boolean => {
    if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) return false;
    
    const rowDir = to.row > from.row ? 1 : -1;
    const colDir = to.col > from.col ? 1 : -1;
    
    let currentRow = from.row + rowDir;
    let currentCol = from.col + colDir;
    
    while (currentRow !== to.row && currentCol !== to.col) {
      if (board[currentRow][currentCol] !== null) return false;
      currentRow += rowDir;
      currentCol += colDir;
    }
    
    return true;
  }, []);

  const isValidQueenMove = useCallback((piece: ChessPiece, from: Position, to: Position, board: (ChessPiece | null)[][]): boolean => {
    return isValidRookMove(piece, from, to, board) || isValidBishopMove(piece, from, to, board);
  }, [isValidRookMove, isValidBishopMove]);

  const isValidKingMove = useCallback((piece: ChessPiece, from: Position, to: Position): boolean => {
    const deltaRow = Math.abs(to.row - from.row);
    const deltaCol = Math.abs(to.col - from.col);
    return deltaRow <= 1 && deltaCol <= 1;
  }, []);

  const isValidMove = useCallback((piece: ChessPiece, from: Position, to: Position, board: (ChessPiece | null)[][]): boolean => {
    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    switch (piece.type) {
      case 'pawn':
        return isValidPawnMove(piece, from, to, board);
      case 'rook':
        return isValidRookMove(piece, from, to, board);
      case 'knight':
        return isValidKnightMove(piece, from, to);
      case 'bishop':
        return isValidBishopMove(piece, from, to, board);
      case 'queen':
        return isValidQueenMove(piece, from, to, board);
      case 'king':
        return isValidKingMove(piece, from, to);
      default:
        return false;
    }
  }, [isValidPawnMove, isValidRookMove, isValidKnightMove, isValidBishopMove, isValidQueenMove, isValidKingMove]);

  const endGame = useCallback(() => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const winnerPlayer = gameState.winner === 'white' ? players[0] : players[1];
    
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
      gameType: 'chess' as GameType,
      players: newPlayers,
      winner: winnerPlayer,
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  }, [gameState.startTime, gameState.winner, players]);

  const isCheck = useCallback((board: (ChessPiece | null)[][], color: Color): boolean => {
    // Find king position
    let kingPos: Position | null = null;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          kingPos = { row, col };
          break;
        }
      }
      if (kingPos) break;
    }
    
    if (!kingPos) return false;
    
    // Check if any opponent piece can attack the king
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.color !== color) {
          if (isValidMove(piece, { row, col }, kingPos, board)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [isValidMove]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState.isPlaying || gameState.isCompleted) return;

    const piece = gameState.board[row][col];
    
    if (gameState.selectedPiece) {
      // Move piece
      const selectedPiece = gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col];
      if (selectedPiece && isValidMove(selectedPiece, gameState.selectedPiece, { row, col }, gameState.board)) {
        const newBoard = gameState.board.map(row => [...row]);
        
        // Check for pawn promotion
        let promotedPiece = selectedPiece;
        if (selectedPiece.type === 'pawn' && ((selectedPiece.color === 'white' && row === 0) || (selectedPiece.color === 'black' && row === 7))) {
          promotedPiece = { type: 'queen', color: selectedPiece.color };
        }
        
        newBoard[row][col] = promotedPiece;
        newBoard[gameState.selectedPiece.row][gameState.selectedPiece.col] = null;
        
        const nextPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
        
        // Check for checkmate or stalemate
        const isCheckmate = isCheck(newBoard, nextPlayer);
        const isCompleted = isCheckmate;
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          selectedPiece: null,
          currentPlayer: nextPlayer,
          isCompleted,
          winner: isCheckmate ? gameState.currentPlayer : null
        }));
        
        if (isCompleted) {
          endGame();
        }
      } else {
        setGameState(prev => ({ ...prev, selectedPiece: null }));
      }
    } else if (piece && piece.color === gameState.currentPlayer) {
      // Select piece
      setGameState(prev => ({ ...prev, selectedPiece: { row, col } }));
    }
  }, [gameState.isPlaying, gameState.isCompleted, gameState.board, gameState.selectedPiece, gameState.currentPlayer, isValidMove, isCheck, endGame]);

  const startGame = () => {
    if (players.every(p => p.name.trim())) {
      setGameState({
        board: initializeBoard(),
        selectedPiece: null,
        currentPlayer: 'white',
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
      currentPlayer: 'white',
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
      currentPlayer: 'white',
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
    const isLightSquare = (row + col) % 2 === 0;
    
    return (
      <button
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        disabled={!gameState.isPlaying || gameState.isCompleted}
        className={cn(
          'w-12 h-12 flex items-center justify-center text-2xl font-bold transition-all duration-200',
          isLightSquare ? 'bg-yellow-100' : 'bg-yellow-800',
          isSelected && 'ring-2 ring-blue-500 ring-opacity-50',
          !gameState.isPlaying || gameState.isCompleted ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
        )}
      >
        {piece && (
          <span className={piece.color === 'white' ? 'text-white' : 'text-black'}>
            {PIECE_SYMBOLS[piece.color][piece.type]}
          </span>
        )}
      </button>
    );
  };

  if (!gameState.isPlaying && !gameState.isCompleted) {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">♟️ Chess</h1>
          <p className="text-gray-600">Strategic board game for two players</p>
        </div>

        <div className="space-y-6">
          {players.map((player, index) => (
            <div key={player.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Player {index + 1} ({index === 0 ? 'White' : 'Black'})
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
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-700 hover:to-yellow-700 transition-all duration-200"
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
          
          <h1 className="text-3xl font-bold text-gray-800">♟️ Chess</h1>
          
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
                gameState.currentPlayer === (index === 0 ? 'white' : 'black') && gameState.isPlaying && !gameState.isCompleted
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              )}
            >
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-gray-800">
                  {index === 0 ? '♔' : '♚'}
                </div>
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
              <span className="font-medium">{players[gameState.currentPlayer === 'white' ? 0 : 1].name}</span>&apos;s turn
            </p>
          </div>
        )}

        {/* Game Over */}
        {gameState.isCompleted && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
              <Crown className="w-5 h-5" />
              <span className="font-semibold text-lg">
                {gameState.winner ? `${players[gameState.winner === 'white' ? 0 : 1].name} Wins!` : "It&apos;s a Draw!"}
              </span>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
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
        <div className="bg-yellow-900 p-4 rounded-lg border-2 border-yellow-700">
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
