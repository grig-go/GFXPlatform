// Temporary test to check venue modal
import { VenueDetailsModal } from "./components/VenueDetailsModal";

export default function TestVenues() {
  return (
    <div>
      <VenueDetailsModal
        venueId="test"
        open={true}
        onOpenChange={() => {}}
      />
    </div>
  );
}
