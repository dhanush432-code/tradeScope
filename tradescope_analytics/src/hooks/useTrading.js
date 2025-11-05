import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../components/contexts/AuthUserContext";
import { TradingService } from "../services/tradingService";
// <-- NEW IMPORT: Gate API calls

// Custom hook for trading operations
export const useTrading = () => {
  const { isAuthenticated } = useAuth(); // Get authentication status

  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState({
    trades: false,
    accounts: false,
    brokers: false,
    strategies: false,
    portfolio: false,
    analytics: false,
  });
  const [error, setError] = useState(null);

  // --- Utility to ensure calls only run when authenticated ---

  // Load trading accounts
  const loadAccounts = useCallback(async () => {
    if (!isAuthenticated) return; // <-- GATED
    setLoading((prev) => ({ ...prev, accounts: true }));
    try {
      const result = await TradingService?.getTradingAccounts();
      if (result?.success) {
        setAccounts(result?.data || []);
        setError(null);
      } else {
        setError(result?.error || "Failed to load accounts");
      }
    } catch (err) {
      setError("Failed to load trading accounts");
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  }, [isAuthenticated]); // <-- DEPENDENCY ADDED

  // Load trades with filters
  const loadTrades = useCallback(
    async (filters = {}) => {
      if (!isAuthenticated) return; // <-- GATED
      setLoading((prev) => ({ ...prev, trades: true }));
      try {
        const result = await TradingService?.getTrades(filters);
        if (result?.success) {
          setTrades(result?.data || []);
          setError(null);
        } else {
          setError(result?.error || "Failed to load trades");
        }
      } catch (err) {
        setError("Failed to load trades");
      } finally {
        setLoading((prev) => ({ ...prev, trades: false }));
      }
    },
    [isAuthenticated]
  ); // <-- DEPENDENCY ADDED

  // Create new trade (No gating needed here, as it's triggered manually)
  const createTrade = useCallback(
    async (tradeData) => {
      if (!isAuthenticated)
        return { success: false, error: "User not authenticated" };
      try {
        // ... (existing logic)
        const result = await TradingService?.createTrade(tradeData);
        if (result?.success) {
          setTrades((prev) => [result?.data, ...prev]);
          setError(null);
          return { success: true, data: result?.data };
        } else {
          setError(result?.error || "Failed to create trade");
          return { success: false, error: result?.error };
        }
      } catch (err) {
        const errorMsg = "Failed to create trade";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [isAuthenticated]
  ); // <-- DEPENDENCY ADDED

  // Update trade (Ensure manual CRUD actions are gated)
  const updateTrade = useCallback(
    async (tradeId, updates) => {
      if (!isAuthenticated)
        return { success: false, error: "User not authenticated" };
      // ... (existing logic)
      try {
        const result = await TradingService?.updateTrade(tradeId, updates);
        // ...
        return { success: true, data: result?.data };
      } catch (err) {
        const errorMsg = "Failed to update trade";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [isAuthenticated]
  );

  // Close trade (Ensure manual CRUD actions are gated)
  const closeTrade = useCallback(
    async (tradeId, exitPrice) => {
      if (!isAuthenticated)
        return { success: false, error: "User not authenticated" };
      // ... (existing logic)
      try {
        const result = await TradingService?.closeTrade(tradeId, exitPrice);
        // ...
        return { success: true, data: result?.data };
      } catch (err) {
        const errorMsg = "Failed to close trade";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [isAuthenticated]
  );

  // Delete trade (Ensure manual CRUD actions are gated)
  const deleteTrade = useCallback(
    async (tradeId) => {
      if (!isAuthenticated)
        return { success: false, error: "User not authenticated" };
      // ... (existing logic)
      try {
        const result = await TradingService?.deleteTrade(tradeId);
        // ...
        return { success: true };
      } catch (err) {
        const errorMsg = "Failed to delete trade";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [isAuthenticated]
  );

  // Load brokers
  const loadBrokers = useCallback(async () => {
    if (!isAuthenticated) return; // <-- GATED
    setLoading((prev) => ({ ...prev, brokers: true }));
    try {
      const result = await TradingService?.getBrokers();
      // ...
    } catch (err) {
      setError("Failed to load brokers");
    } finally {
      setLoading((prev) => ({ ...prev, brokers: false }));
    }
  }, [isAuthenticated]); // <-- DEPENDENCY ADDED

  // Add broker
  const addBroker = useCallback(
    async (brokerData) => {
      if (!isAuthenticated)
        return { success: false, error: "User not authenticated" };
      // ... (existing logic)
      try {
        const result = await TradingService?.addBroker(brokerData);
        // ...
        return { success: true, data: result?.data };
      } catch (err) {
        const errorMsg = "Failed to add broker";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [isAuthenticated]
  );

  // Load strategies
  const loadStrategies = useCallback(async () => {
    if (!isAuthenticated) return; // <-- GATED
    setLoading((prev) => ({ ...prev, strategies: true }));
    try {
      const result = await TradingService?.getStrategies();
      // ...
    } catch (err) {
      setError("Failed to load strategies");
    } finally {
      setLoading((prev) => ({ ...prev, strategies: false }));
    }
  }, [isAuthenticated]); // <-- DEPENDENCY ADDED

  // Load portfolio summary
  const loadPortfolio = useCallback(async () => {
    if (!isAuthenticated) return; // <-- GATED
    setLoading((prev) => ({ ...prev, portfolio: true }));
    try {
      const result = await TradingService?.getPortfolioSummary();
      // ...
    } catch (err) {
      setError("Failed to load portfolio");
    } finally {
      setLoading((prev) => ({ ...prev, portfolio: false }));
    }
  }, [isAuthenticated]); // <-- DEPENDENCY ADDED

  // Load analytics data
  const loadAnalytics = useCallback(
    async (filters = {}) => {
      if (!isAuthenticated) return; // <-- GATED
      setLoading((prev) => ({ ...prev, analytics: true }));
      try {
        const result = await TradingService?.getAnalyticsData(filters);
        // ...
      } catch (err) {
        setError("Failed to load analytics");
      } finally {
        setLoading((prev) => ({ ...prev, analytics: false }));
      }
    },
    [isAuthenticated]
  ); // <-- DEPENDENCY ADDED

  // --- Real-time Subscriptions (REMOVED) ---
  useEffect(() => {
    // WARNING: Supabase real-time logic has been REMOVED.
    // This hook is now static and relies on the user to reload the dashboard
    // or trigger explicit load functions after a CRUD operation.
    // If you need real-time updates, you must implement WebSockets/SSE on the backend
    // and replace this useEffect block with that custom solution.

    if (!isAuthenticated) {
      // Clear data when logged out
      setTrades([]);
      setPortfolio(null);
      setAnalytics([]);
    }

    // We intentionally return a cleanup function that does nothing for the old channels
    return () => {};
  }, [isAuthenticated]); // <-- Run when auth status changes

  return {
    // ... (rest of the returned object remains the same)
    trades,
    accounts,
    brokers,
    strategies,
    portfolio,
    analytics,
    loading,
    error,
    loadAccounts,
    loadTrades,
    createTrade,
    updateTrade,
    closeTrade,
    deleteTrade,
    loadBrokers,
    addBroker,
    loadStrategies,
    loadPortfolio,
    loadAnalytics,
    clearError: () => setError(null),
  };
};

export default useTrading;
