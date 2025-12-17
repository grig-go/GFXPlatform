import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState } from "react";
import { TeamStatsModal } from "./TeamStatsModal";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    short_name?: string;
    abbreviation?: string;
    logo_url?: string;
    city?: string;
    country?: string;
    venue?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      text?: string;
    };
  };
}

export function TeamCard({ team }: TeamCardProps) {
  const primaryColor = team.colors?.primary || '#000000';
  const showShortName = team.short_name && team.short_name !== team.name;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    console.log('Team card clicked:', team.id);
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
      >
        <Card 
          className="h-full relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
          onClick={handleCardClick}
        >
          {/* Accent stripe */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: primaryColor }}
          />
          
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Team Logo */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-100 flex items-center justify-center p-2 shadow-sm">
                  {team.logo_url ? (
                    <ImageWithFallback
                      src={team.logo_url}
                      alt={team.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center text-white text-xl font-semibold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {team.abbreviation?.[0] || team.name[0]}
                    </div>
                  )}
                </div>
                {/* Color indicator dot */}
                <div 
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>

              {/* Team Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {team.name}
                    </h3>
                    {showShortName && (
                      <p className="text-sm text-muted-foreground">
                        ({team.short_name})
                      </p>
                    )}
                  </div>
                  
                  {team.abbreviation && (
                    <Badge 
                      variant="secondary"
                      className="flex-shrink-0"
                      style={{ 
                        borderColor: primaryColor,
                        borderWidth: '1px'
                      }}
                    >
                      {team.abbreviation}
                    </Badge>
                  )}
                </div>

                {/* Location */}
                {(team.city || team.country) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {team.city && team.country 
                        ? `${team.city}, ${team.country}`
                        : team.city || team.country}
                    </span>
                  </div>
                )}

                {/* Venue */}
                {team.venue && (
                  <div className="text-xs text-muted-foreground truncate">
                    🏟️ {team.venue}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <TeamStatsModal 
        teamId={team.id}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}