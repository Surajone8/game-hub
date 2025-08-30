'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Trophy, Maximize2, Minimize2 } from 'lucide-react';
import { Player, GameResult, GameType } from '@/types/game';
import { GameStorage } from '@/utils/storage';
import { cn } from '@/utils/cn';

type CellValue = 'X' | 'O' | null;
type GameStatus = 'setup' | 'playing' | 'finished';

interface TicTacToeState {
  board: CellValue[];
  currentPlayer: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  gameStatus: GameStatus;
  startTime: Date | null;
}

export default function TicTacToePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 }
  ]);
  const [gameState, setGameState] = useState<TicTacToeState>({
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    gameStatus: 'setup',
    startTime: null
  });

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  const checkWinner = (board: CellValue[]): 'X' | 'O' | 'draw' | null => {
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    
    if (board.every(cell => cell !== null)) {
      return 'draw';
    }
    
    return null;
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = name;
    setPlayers(newPlayers);
  };

  const startGame = () => {
    if (players.every(p => p.name.trim())) {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'playing',
        startTime: new Date(),
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null
      }));
    }
  };

  const handleCellClick = (index: number) => {
    if (gameState.gameStatus !== 'playing' || gameState.board[index] !== null) {
      return;
    }

    const newBoard = [...gameState.board];
    newBoard[index] = gameState.currentPlayer;
    
    const winner = checkWinner(newBoard);
    const newGameState: TicTacToeState = {
      ...gameState,
      board: newBoard,
      currentPlayer: gameState.currentPlayer === 'X' ? 'O' : 'X',
      winner,
      gameStatus: winner ? 'finished' : 'playing'
    };

    setGameState(newGameState);

    if (winner) {
      endGame(winner);
    }
  };

  const endGame = (winner: 'X' | 'O' | 'draw') => {
    const endTime = new Date();
    const duration = gameState.startTime 
      ? Math.round((endTime.getTime() - gameState.startTime.getTime()) / 1000)
      : 0;

    const winnerPlayer = winner !== 'draw' ? players[winner === 'X' ? 0 : 1] : null;
    
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
      gameType: 'tictactoe' as GameType,
      players: newPlayers,
      winner: winnerPlayer,
      timestamp: endTime,
      duration
    };

    GameStorage.addGameResult(gameResult);
  };

  const resetGame = () => {
    setGameState({
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      gameStatus: 'playing',
      startTime: new Date()
    });
  };

  const newGame = () => {
    setGameState({
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      gameStatus: 'setup',
      startTime: null
    });
    setPlayers([
      { id: '1', name: '', score: 0 },
      { id: '2', name: '', score: 0 }
    ]);
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

  const getCurrentPlayerName = () => {
    if (gameState.currentPlayer === 'X') {
      return players[0].name || 'Player X';
    }
    return players[1].name || 'Player O';
  };

  const getWinnerName = () => {
    if (gameState.winner === 'draw') return 'Draw';
    if (gameState.winner === 'X') return players[0].name || 'Player X';
    return players[1].name || 'Player O';
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (gameState.gameStatus === 'setup') {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">🎯 Tic Tac Toe</h1>
          <p className="text-gray-600">Enter player names to start the game</p>
        </div>

        <div className="space-y-6">
          {players.map((player, index) => (
            <div key={player.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Player {index + 1} ({index === 0 ? 'X' : 'O'})
              </label>
              <input
                type="text"
                value={player.name}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
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
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
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
      <div className="flex-1 flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/games')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <h1 className="text-xl font-bold text-gray-800">🎯 Tic Tac Toe</h1>
          
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

        {/* Game Board - Centered */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          {/* Player Info */}
          <div className="grid grid-cols-2 gap-6">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all duration-200',
                  gameState.currentPlayer === (index === 0 ? 'X' : 'O') && gameState.gameStatus === 'playing'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-gray-800">
                    {index === 0 ? 'X' : 'O'}
                  </div>
                  <div className="font-medium text-gray-700">{player.name}</div>
                  <div className="text-sm text-gray-500">Score: {player.score}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Game Status */}
          {gameState.gameStatus === 'playing' && (
            <div className="text-center">
                          <p className="text-lg text-gray-600">
              <span className="font-medium">{getCurrentPlayerName()}</span>&apos;s turn
            </p>
            </div>
          )}

          {/* Game Board */}
          <div className="grid grid-cols-3 gap-2 bg-gray-800 p-2 rounded-lg">
            {gameState.board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={gameState.gameStatus !== 'playing' || cell !== null}
                className={cn(
                  'w-20 h-20 bg-white rounded flex items-center justify-center text-3xl font-bold transition-all duration-200',
                  cell === 'X' ? 'text-blue-600' : 'text-red-600',
                  gameState.gameStatus === 'playing' && !cell
                    ? 'hover:bg-gray-100 cursor-pointer'
                    : 'cursor-default'
                )}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Score Panel */}
      <div className="w-full lg:w-80 bg-gray-50 border-l border-gray-200 p-4 flex flex-col">
        {/* Game Info */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Game Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <span className="text-gray-600">Game Status</span>
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                gameState.gameStatus === 'playing' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              )}>
                {gameState.gameStatus === 'playing' ? 'Playing' : 'Setup/Finished'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <span className="text-gray-600">Current Player</span>
              <span className="text-xl font-bold text-purple-600">
                {gameState.gameStatus === 'playing' ? getCurrentPlayerName() : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Game Over Section */}
        {gameState.gameStatus === 'finished' && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Game Result</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="text-center">
                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-green-600 font-semibold mb-1">
                  {gameState.winner === 'draw' ? "It&apos;s a Draw!" : `${getWinnerName()} Wins!`}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={resetGame}
                className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="w-full py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                New Players
              </button>
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="mt-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Game Status</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={gameState.gameStatus === 'playing' ? 'text-green-600' : 'text-gray-500'}>
                {gameState.gameStatus === 'playing' ? 'Playing' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Winner:</span>
              <span className="text-gray-500">
                {gameState.winner === 'draw' ? 'Draw' : gameState.winner || 'None'}
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
