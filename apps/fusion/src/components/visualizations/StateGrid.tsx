interface StateGridProps {
  chamber: 'house' | 'senate';
}

// House: All 435 seats
const houseStates = [
  { state: 'CA', rating: 'safe-dem' },
  { state: 'NY', rating: 'safe-dem' },
  { state: 'TX', rating: 'safe-rep' },
  { state: 'FL', rating: 'safe-rep' },
  { state: 'PA', rating: 'likely-dem' },
  { state: 'OH', rating: 'likely-rep' },
  { state: 'IL', rating: 'safe-dem' },
  { state: 'MI', rating: 'lean-dem' },
  { state: 'NC', rating: 'lean-rep' },
  { state: 'GA', rating: 'lean-rep' },
  { state: 'NJ', rating: 'safe-dem' },
  { state: 'VA', rating: 'likely-dem' },
  { state: 'WA', rating: 'safe-dem' },
  { state: 'MA', rating: 'safe-dem' },
  { state: 'AZ', rating: 'toss-up' },
  { state: 'TN', rating: 'safe-rep' },
  { state: 'IN', rating: 'safe-rep' },
  { state: 'MO', rating: 'likely-rep' },
  { state: 'MD', rating: 'safe-dem' },
  { state: 'WI', rating: 'toss-up' },
  { state: 'CO', rating: 'likely-dem' },
  { state: 'MN', rating: 'likely-dem' },
  { state: 'SC', rating: 'safe-rep' },
  { state: 'AL', rating: 'safe-rep' },
  { state: 'LA', rating: 'safe-rep' },
  { state: 'KY', rating: 'safe-rep' },
  { state: 'OR', rating: 'likely-dem' },
  { state: 'OK', rating: 'safe-rep' },
  { state: 'CT', rating: 'safe-dem' },
  { state: 'UT', rating: 'safe-rep' },
  { state: 'IA', rating: 'likely-rep' },
  { state: 'NV', rating: 'toss-up' },
  { state: 'AR', rating: 'safe-rep' },
  { state: 'MS', rating: 'safe-rep' },
  { state: 'KS', rating: 'safe-rep' },
  { state: 'NM', rating: 'likely-dem' },
  { state: 'NE', rating: 'safe-rep' },
  { state: 'ID', rating: 'safe-rep' },
  { state: 'WV', rating: 'safe-rep' },
  { state: 'HI', rating: 'safe-dem' },
  { state: 'NH', rating: 'likely-dem' },
  { state: 'ME', rating: 'likely-dem' },
  { state: 'RI', rating: 'safe-dem' },
  { state: 'MT', rating: 'lean-rep' },
  { state: 'DE', rating: 'safe-dem' },
  { state: 'SD', rating: 'safe-rep' },
  { state: 'ND', rating: 'safe-rep' },
  { state: 'AK', rating: 'safe-rep' },
  { state: 'VT', rating: 'safe-dem' },
  { state: 'WY', rating: 'safe-rep' },
];

// Senate: Only states with seats up for election
const senateStates = [
  { state: 'FL', rating: 'safe-rep' },
  { state: 'IN', rating: 'safe-rep' },
  { state: 'MO', rating: 'safe-rep' },
  { state: 'MS', rating: 'safe-rep' },
  { state: 'ND', rating: 'safe-rep' },
  { state: 'NE', rating: 'safe-rep' },
  { state: 'TN', rating: 'safe-rep' },
  { state: 'TX', rating: 'safe-rep' },
  { state: 'UT', rating: 'safe-rep' },
  { state: 'WV', rating: 'safe-rep' },
  { state: 'WY', rating: 'safe-rep' },
  { state: 'AZ', rating: 'lean-rep' },
  { state: 'CA', rating: 'safe-dem' },
  { state: 'DE', rating: 'safe-dem' },
  { state: 'HI', rating: 'safe-dem' },
  { state: 'MD', rating: 'safe-dem' },
  { state: 'MA', rating: 'safe-dem' },
  { state: 'MI', rating: 'likely-dem' },
  { state: 'MN', rating: 'safe-dem' },
  { state: 'MT', rating: 'lean-rep' },
  { state: 'NV', rating: 'toss-up' },
  { state: 'NM', rating: 'safe-dem' },
  { state: 'NY', rating: 'safe-dem' },
  { state: 'OH', rating: 'likely-rep' },
  { state: 'PA', rating: 'likely-dem' },
  { state: 'RI', rating: 'safe-dem' },
  { state: 'VA', rating: 'safe-dem' },
  { state: 'VT', rating: 'safe-dem' },
  { state: 'WA', rating: 'safe-dem' },
  { state: 'WI', rating: 'toss-up' },
];

export function StateGrid({ chamber }: StateGridProps) {
  const states = chamber === 'senate' ? senateStates : houseStates;
  
  // Count seats by party for Senate
  const repCount = senateStates.filter(s => s.rating.includes('rep')).length;
  const demCount = senateStates.filter(s => s.rating.includes('dem') || s.rating === 'toss-up').length;

  const getBackgroundColor = (rating: string) => {
    switch (rating) {
      case 'safe-dem':
      case 'likely-dem':
      case 'lean-dem':
        return 'bg-[#60a5fa]'; // Bright blue
      case 'safe-rep':
      case 'likely-rep':
      case 'lean-rep':
        return 'bg-[#ef4444]'; // Bright red
      case 'toss-up':
        return 'bg-[#d1d5db]'; // Gray
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-3 text-sm text-gray-700">
        {chamber === 'house' ? (
          null
        ) : (
          null
        )}
      </div>
      
      {/* State Grid */}
      <div className="flex flex-wrap gap-1.5">
        {states.map(({ state, rating }) => (
          <div
            key={state}
            className={`${getBackgroundColor(rating)} text-white w-9 h-7 flex items-center justify-center rounded text-xs`}
          >
            {state}
          </div>
        ))}
      </div>
    </div>
  );
}
