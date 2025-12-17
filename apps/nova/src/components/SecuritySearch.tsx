import { CryptoSearch } from "./CryptoSearch";
import { StockSearch } from "./StockSearch";

interface SecuritySearchProps {
  onStockAdded?: () => void;
  onAddSecurity?: () => void;
  existingSymbols?: string[];
  filterType?: 'EQUITY_INDEX' | 'CRYPTO';
  buttonText?: string;
}

export function SecuritySearch({
  onStockAdded,
  onAddSecurity,
  filterType,
  buttonText
}: SecuritySearchProps) {
  // Callback to trigger when item is added
  const handleAdded = () => {
    if (onStockAdded) onStockAdded();
    if (onAddSecurity) onAddSecurity();
  };

  // Render the appropriate component based on filterType
  if (filterType === 'CRYPTO') {
    return (
      <CryptoSearch 
        onCryptoAdded={handleAdded}
        buttonText={buttonText || "Add Crypto"}
      />
    );
  }
  
  // Default to stock/ETF search (EQUITY_INDEX or no filterType)
  return (
    <StockSearch 
      onStockAdded={handleAdded}
      buttonText={buttonText || "Add Stock / ETF"}
    />
  );
}
