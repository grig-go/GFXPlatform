import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { User, MapPin, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { PlayerStatsModal } from "./PlayerStatsModal";

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    nationality?: string;
    nationality_code?: string;
    date_of_birth?: string;
    jersey_number?: number;
    position?: string;
    photo_url?: string;
    sports_teams?: {
      id: string;
      name: string;
      short_name?: string;
      abbreviation?: string;
      logo_url?: string;
      colors?: {
        primary?: string;
        secondary?: string;
        text?: string;
      };
    };
  };
}

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string | undefined): number | null => {
  if (!dateOfBirth) return null;
  const age = Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age;
};

// Helper function to get position color
const getPositionColor = (position: string | undefined): string => {
  if (!position) return 'bg-gray-500';
  
  const pos = position.toUpperCase();
  if (pos === 'GK' || pos === 'GOALKEEPER') return 'bg-yellow-500';
  if (pos === 'DF' || pos === 'DEFENDER' || pos.includes('BACK')) return 'bg-blue-500';
  if (pos === 'MF' || pos === 'MIDFIELDER' || pos.includes('MID')) return 'bg-green-500';
  if (pos === 'FW' || pos === 'FORWARD' || pos === 'STRIKER' || pos.includes('ATTACK')) return 'bg-red-500';
  
  return 'bg-gray-500';
};

// Helper function to format position display
const formatPosition = (position: string | undefined): string => {
  if (!position) return 'N/A';
  
  const pos = position.toUpperCase();
  if (pos === 'GOALKEEPER') return 'GK';
  if (pos === 'DEFENDER') return 'DF';
  if (pos === 'MIDFIELDER') return 'MF';
  if (pos === 'FORWARD' || pos === 'STRIKER') return 'FW';
  
  return position;
};

export function PlayerCard({ player }: PlayerCardProps) {
  const age = calculateAge(player.date_of_birth);
  const teamColors = player.sports_teams?.colors;
  const primaryColor = teamColors?.primary || '#000000';
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card 
        className="relative overflow-hidden transition-all duration-300 hover:shadow-lg"
        style={{
          borderTop: `3px solid ${primaryColor}`
        }}
      >
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, transparent 100%)`
          }}
        />
        
        <CardContent className="p-4 relative cursor-pointer" onClick={() => setIsModalOpen(true)}>
          <div className="flex items-start gap-4">
            {/* Player Photo */}
            <div className="flex-shrink-0">
              <div className="relative">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.name}
                    className="w-20 h-20 rounded-full object-cover border-2"
                    style={{ borderColor: primaryColor }}
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div 
                  className={`${player.photo_url ? 'hidden' : ''} w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2`}
                  style={{ borderColor: primaryColor }}
                >
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                
                {/* Jersey Number Badge */}
                {player.jersey_number && (
                  <div 
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-sm font-bold">{player.jersey_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate mb-1">{player.name}</h3>
              
              {/* Position Badge */}
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  className={`${getPositionColor(player.position)} text-white border-0`}
                >
                  {formatPosition(player.position)}
                </Badge>
                
                {age !== null && (
                  <span className="text-sm text-muted-foreground">
                    {age} years
                  </span>
                )}
              </div>

              {/* Team Info */}
              {player.sports_teams && (
                <div className="flex items-center gap-2 mb-2">
                  {player.sports_teams.logo_url && (
                    <img
                      src={player.sports_teams.logo_url}
                      alt={player.sports_teams.name}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span className="text-sm text-muted-foreground truncate">
                    {player.sports_teams.short_name || player.sports_teams.name}
                  </span>
                </div>
              )}

              {/* Nationality */}
              {player.nationality && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {player.nationality_code && (
                      <span className="mr-1">
                        {player.nationality_code}
                      </span>
                    )}
                    {player.nationality}
                  </span>
                </div>
              )}

              {/* Date of Birth */}
              {player.date_of_birth && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(player.date_of_birth).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Stats Modal */}
      <PlayerStatsModal
        playerId={parseInt(player.id, 10)}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </motion.div>
  );
}