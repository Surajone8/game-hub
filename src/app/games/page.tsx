import { GAMES } from '@/constants/games';
import Link from 'next/link';
import { Users, Gamepad2 } from 'lucide-react';

export default function GamesPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--card-foreground)' }}>All Games</h1>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
          Choose from our collection of carefully crafted games. Each game is designed 
          with modern aesthetics and smooth gameplay in mind.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <Link
            key={game.type}
            href={game.route}
            className="group block rounded-xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="p-6">
              <div className="text-center space-y-4">
                <div className="text-5xl">{game.icon}</div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold group-hover:text-purple-600 transition-colors" style={{ color: 'var(--card-foreground)' }}>
                    {game.name}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {game.description}
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {game.minPlayers === game.maxPlayers 
                        ? `${game.minPlayers} player${game.minPlayers > 1 ? 's' : ''}`
                        : `${game.minPlayers}-${game.maxPlayers} players`
                      }
                    </span>
                  </div>
                  
                  {game.isMultiplayer && (
                    <div className="flex items-center space-x-1" style={{ color: 'var(--primary)' }}>
                      <Gamepad2 className="w-4 h-4" />
                      <span>Multiplayer</span>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <div className="inline-flex items-center font-medium group-hover:text-purple-700 transition-colors" style={{ color: 'var(--primary)' }}>
                    Play Now
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center pt-8">
        <div className="inline-flex items-center space-x-2" style={{ color: 'var(--muted-foreground)' }}>
          <Gamepad2 className="w-5 h-5" />
          <span>More games coming soon!</span>
        </div>
      </div>
    </div>
  );
}
