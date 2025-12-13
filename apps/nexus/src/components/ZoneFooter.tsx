import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "./ui/button";

const neighboringZones = [
  { name: "Security Checkpoint A", type: "Security" },
  { name: "Food Court A", type: "Amenities" },
  { name: "Retail A", type: "Shopping" },
  { name: "Immigration Hall A", type: "Processing" }
];

interface ZoneFooterProps {
  onNavigateToMain: () => void;
}

export function ZoneFooter({
  onNavigateToMain,
}: ZoneFooterProps) {
  return null;
}