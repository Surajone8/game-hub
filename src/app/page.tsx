import Link from 'next/link';
import { Gamepad2, Users, Trophy, Zap } from 'lucide-react';
import { GAMES } from '@/constants/games';

export default function HomePage() {
  const featuredGames = GAMES.slice(0, 3);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome to GameHub
          </h1>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Discover a collection of classic and modern games, all beautifully designed 
            with a focus on user experience and multiplayer fun.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/games"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Gamepad2 className="w-5 h-5 mr-2" />
            Start Playing
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center justify-center px-8 py-4 font-semibold rounded-lg border-2 transition-all duration-200"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--card-foreground)',
              borderColor: 'var(--border)'
            }}
          >
            <Trophy className="w-5 h-5 mr-2" />
            View History
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
            <Gamepad2 className="w-8 h-8" style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--card-foreground)' }}>Multiple Games</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>From classic board games to modern arcade experiences</p>
        </div>
        
        <div className="text-center p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
            <Users className="w-8 h-8" style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--card-foreground)' }}>Multiplayer Support</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>Play with friends and family in real-time</p>
        </div>
        
        <div className="text-center p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border" style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
            <Zap className="w-8 h-8" style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--card-foreground)' }}>Fast & Responsive</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>Optimized for smooth gameplay on all devices</p>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--card-foreground)' }}>Featured Games</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>Try out some of our most popular games</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {featuredGames.map((game) => (
            <Link
              key={game.type}
              href={game.route}
              className="group block rounded-xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 border"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <div className="p-6 text-center">
                <div className="text-4xl mb-4">{game.icon}</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600 transition-colors" style={{ color: 'var(--card-foreground)' }}>
                  {game.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>{game.description}</p>
                <div className="inline-flex items-center text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  Play Now
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="text-center">
          <Link
            href="/games"
            className="inline-flex items-center justify-center px-6 py-3 font-medium rounded-lg transition-colors duration-200"
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)'
            }}
          >
            View All Games
          </Link>
        </div>
      </section>
    </div>
  );
}
