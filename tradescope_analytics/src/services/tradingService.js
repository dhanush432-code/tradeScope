// src/services/tradingService.js

// --- Custom Backend Configuration ---
const API_URL = import.meta.env.VITE_API_URL;
// Assuming these services still exist and handle non-DB logic
import UpstoxService from './upstoxService'; 
import BrokerCredentialService from './brokerCredentialService'; 

const fetchConfig = {
    headers: { 'Content-Type': 'application/json' },
    // Essential for sending the session cookie set by Passport
    credentials: 'include', 
};

// Helper function to handle fetch errors and status checks
const handleResponse = async (response) => {
    if (response.status === 401) {
        // Session expired, force logout/redirect if necessary, though AuthContext should catch this on /me call.
        throw new Error('Unauthorized or Session Expired');
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Server error' }));
        throw new Error(errorData.message || `API call failed with status: ${response.status}`);
    }
    return response.json();
};


// Trading Service for TradeScope - Custom Backend Implementation
export class TradingService {
  
  // ===================================================
  // ACCOUNTS & BROKERS
  // ===================================================

  // Maps to: GET /api/trading/accounts
  static async getTradingAccounts() {
    try {
      const response = await fetch(`${API_URL}/api/trading/accounts`, fetchConfig);
      const data = await handleResponse(response);
      
      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { success: false, data: [], error: error?.message || 'Failed to fetch trading accounts' };
    }
  }

  // Maps to: GET /api/brokers
  static async getBrokers() {
    try {
      const response = await fetch(`${API_URL}/api/brokers`, fetchConfig);
      const data = await handleResponse(response);
      
      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { success: false, data: [], error: error?.message || 'Failed to fetch brokers' };
    }
  }

  // Maps to: POST /api/brokers
  static async addBroker(brokerData) {
    try {
      // NOTE: This complex logic (credential storing, connection testing)
      // should ideally be moved entirely to the Express backend.
      // If BrokerCredentialService is a separate local file, keep it, but 
      // replace all its internal Supabase calls too (requires another refactor).
      
      const response = await fetch(`${API_URL}/api/brokers`, {
          ...fetchConfig,
          method: 'POST',
          body: JSON.stringify(brokerData)
      });
      
      const data = await handleResponse(response);
      
      return { success: true, data, error: null };

    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to add broker' };
    }
  }
  
  // Maps to: POST /api/trading/account
  static async createTradingAccountFromBroker(brokerId, brokerData) {
    // This logic should now be handled server-side within the addBroker endpoint,
    // but if needed as a separate client call:
    try {
      const response = await fetch(`${API_URL}/api/trading/account`, {
          ...fetchConfig,
          method: 'POST',
          body: JSON.stringify({ brokerId, brokerData })
      });
      
      const data = await handleResponse(response);
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to create trading account' };
    }
  }
  
  // Maps to: GET /api/brokers/status
  static async getBrokerStatus() {
     try {
      // NOTE: This method combines data from local services (UpstoxService)
      // and a new backend endpoint for credentials/status check. 
      // You must decide if all status checks move server-side.
      
      const response = await fetch(`${API_URL}/api/brokers/status`, fetchConfig);
      const data = await handleResponse(response);

      // Merge local Upstox status if necessary, or ensure the backend handles Upstox.
      // const upstoxStatus = await UpstoxService?.getConnectionStatus(); 
      // data.upstox = upstoxStatus; 
      
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to get broker status' };
    }
  }

  // ===================================================
  // TRADES
  // ===================================================

  // Maps to: GET /api/trades?filters...
  static async getTrades(filters = {}) {
    try {
      // Convert filters object to URL search params
      const params = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_URL}/api/trades?${params}`, fetchConfig);
      const data = await handleResponse(response);
      
      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { success: false, data: [], error: error?.message || 'Failed to fetch trades' };
    }
  }

  // Maps to: POST /api/trades
  static async createTrade(tradeData) {
    try {
      const response = await fetch(`${API_URL}/api/trades`, {
          ...fetchConfig,
          method: 'POST',
          body: JSON.stringify(tradeData)
      });
      const data = await handleResponse(response);
      
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to create trade' };
    }
  }

  // Maps to: PUT /api/trades/:tradeId
  static async updateTrade(tradeId, updates) {
    try {
      const response = await fetch(`${API_URL}/api/trades/${tradeId}`, {
          ...fetchConfig,
          method: 'PUT',
          body: JSON.stringify(updates)
      });
      const data = await handleResponse(response);
      
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to update trade' };
    }
  }

  // Maps to: POST /api/trades/close/:tradeId
  static async closeTrade(tradeId, exitPrice, closedAt = new Date()) {
    try {
      const response = await fetch(`${API_URL}/api/trades/close/${tradeId}`, {
          ...fetchConfig,
          method: 'POST',
          body: JSON.stringify({ exitPrice, closedAt })
      });
      const data = await handleResponse(response);
      
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to close trade' };
    }
  }

  // Maps to: DELETE /api/trades/:tradeId
  static async deleteTrade(tradeId) {
    try {
      const response = await fetch(`${API_URL}/api/trades/${tradeId}`, {
          ...fetchConfig,
          method: 'DELETE'
      });
      await handleResponse(response); // No data returned on delete
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to delete trade' };
    }
  }

  // ===================================================
  // ANALYTICS & PORTFOLIO
  // ===================================================
  
  // Maps to: GET /api/portfolio/summary
  static async getPortfolioSummary() {
    try {
      const response = await fetch(`${API_URL}/api/portfolio/summary`, fetchConfig);
      const data = await handleResponse(response);
      
      return { success: true, data: data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to fetch portfolio summary' };
    }
  }

  // Maps to: GET /api/analytics/data?filters...
  static async getAnalyticsData(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_URL}/api/analytics/data?${params}`, fetchConfig);
      const data = await handleResponse(response);

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { success: false, data: [], error: error?.message || 'Failed to fetch analytics data' };
    }
  }

  // Maps to: GET /api/strategies
  static async getStrategies() {
    try {
      const response = await fetch(`${API_URL}/api/strategies`, fetchConfig);
      const data = await handleResponse(response);

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { success: false, data: [], error: error?.message || 'Failed to fetch strategies' };
    }
  }

  // ===================================================
  // SYNC & REAL-TIME (Requires significant backend rework)
  // ===================================================

  // Maps to: POST /api/sync/brokers
  static async syncFromBrokers() {
    try {
      // The complex broker loop logic MUST be moved to the backend.
      const response = await fetch(`${API_URL}/api/sync/brokers`, {
          ...fetchConfig,
          method: 'POST'
      });
      const data = await handleResponse(response);
      
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error?.message || 'Failed to sync broker data' };
    }
  }
  
  // NOTE: Real-time subscriptions (subscribeToTrades, subscribeToAnalytics)
  // cannot use standard fetch/Express. They require WebSockets (Socket.io) 
  // or Server-Sent Events (SSE) implemented on your custom Express backend.
  static subscribeToTrades(callback) {
    console.warn("Real-time trades subscription requires custom WebSocket/SSE backend implementation.");
    return { unsubscribe: () => {} }; // Return a dummy object
  }

  static subscribeToAnalytics(callback) {
    console.warn("Real-time analytics subscription requires custom WebSocket/SSE backend implementation.");
    return { unsubscribe: () => {} };
  }

  static unsubscribe(channel) {
    console.warn("Unsubscribe method depends on your new real-time solution (WebSocket/SSE).");
  }
}

export default TradingService;