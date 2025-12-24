import { useState, useEffect } from "react";
import { getEdgeFunctionUrl } from "./supabase/config";
import { getAccessToken } from "./supabase";

export interface FinanceDataStats {
  totalSecurities: number;
  stockCount: number;
  etfCount: number;
  cryptoCount: number;
  hasLivePrices: boolean;
  hasAnalystRatings: boolean;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
}

export function useFinanceData() {
  const [stats, setStats] = useState<FinanceDataStats>({
    totalSecurities: 0,
    stockCount: 0,
    etfCount: 0,
    cryptoCount: 0,
    hasLivePrices: false,
    hasAnalystRatings: false,
    lastUpdated: new Date().toISOString(),
    loading: true,
    error: null,
  });

  const fetchFinanceData = async () => {
    try {
      // Fetch from finance_dashboard edge function
      const token = await getAccessToken();
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/stocks'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let stockCount = 0;
      let etfCount = 0;
      let cryptoCount = 0;
      let hasLivePrices = false;
      let hasAnalystRatings = false;

      if (response.ok) {
        const data = await response.json();
        const securities = data.stocks || [];
        
        // Count by type
        securities.forEach((sec: any) => {
          const type = sec.type?.toUpperCase() || 'EQUITY';
          if (type === 'CRYPTO' || type === 'CRYPTOCURRENCY') {
            cryptoCount++;
          } else if (type === 'ETF') {
            etfCount++;
          } else {
            // EQUITY, INDEX, us_equity, or anything else counts as stock
            stockCount++;
          }
        });
        
        // Check if we have live prices (at least one security has a price)
        hasLivePrices = securities.some((sec: any) => sec.price !== undefined && sec.price !== null && sec.price > 0);
        
        // Check if we have analyst ratings
        hasAnalystRatings = securities.some((sec: any) => sec.rating !== undefined && sec.rating !== null);
      }

      const totalSecurities = stockCount + etfCount + cryptoCount;

      setStats({
        totalSecurities,
        stockCount,
        etfCount,
        cryptoCount,
        hasLivePrices,
        hasAnalystRatings,
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching finance data:", error);
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  useEffect(() => {
    fetchFinanceData();

    // Refresh every 5 minutes to match the dashboard
    const interval = setInterval(() => {
      fetchFinanceData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { stats, refresh: fetchFinanceData };
}