-- Migration: Add TradeScope tables to existing database
-- This works with your existing users table structure

-- Step 1: Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint on google_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_google_id_key" UNIQUE ("google_id");
    END IF;
END $$;

-- Step 2: Create brokers table
CREATE TABLE IF NOT EXISTS "brokers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "broker_name" TEXT NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create trading_accounts table
CREATE TABLE IF NOT EXISTS "trading_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "broker_id" TEXT,
    "account_name" TEXT NOT NULL,
    "account_type" TEXT,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_accounts_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create strategies table
CREATE TABLE IF NOT EXISTS "strategies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create trades table
CREATE TABLE IF NOT EXISTS "trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT,
    "strategy_id" TEXT,
    
    -- Trade Details
    "instrument" VARCHAR(50) NOT NULL,
    "asset_class" VARCHAR(50),
    "trade_type" VARCHAR(10) NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    
    -- Pricing
    "entry_price" DECIMAL(15,4) NOT NULL,
    "exit_price" DECIMAL(15,4),
    "stop_loss" DECIMAL(15,4),
    "take_profit" DECIMAL(15,4),
    
    -- Dates
    "trade_date" TIMESTAMP(3) NOT NULL,
    "entry_date" TIMESTAMP(3),
    "exit_date" TIMESTAMP(3),
    
    -- P&L
    "pnl" DECIMAL(15,2),
    "pnl_percentage" DECIMAL(10,4),
    "pnl_currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "fees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Status
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    
    -- Additional Info
    "process" VARCHAR(50),
    "notes" TEXT,
    "tags" TEXT,
    
    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "brokers_user_id_broker_name_key" ON "brokers"("user_id", "broker_name");
CREATE UNIQUE INDEX IF NOT EXISTS "strategies_user_id_name_key" ON "strategies"("user_id", "name");
CREATE INDEX IF NOT EXISTS "trades_user_id_trade_date_idx" ON "trades"("user_id", "trade_date");
CREATE INDEX IF NOT EXISTS "trades_user_id_status_idx" ON "trades"("user_id", "status");
CREATE INDEX IF NOT EXISTS "trades_instrument_idx" ON "trades"("instrument");

-- Step 7: Add foreign keys
DO $$ 
BEGIN
    -- Brokers foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'brokers_user_id_fkey'
    ) THEN
        ALTER TABLE "brokers" ADD CONSTRAINT "brokers_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Trading accounts foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trading_accounts_user_id_fkey'
    ) THEN
        ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trading_accounts_broker_id_fkey'
    ) THEN
        ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_broker_id_fkey" 
        FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Strategies foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'strategies_user_id_fkey'
    ) THEN
        ALTER TABLE "strategies" ADD CONSTRAINT "strategies_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Trades foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trades_user_id_fkey'
    ) THEN
        ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trades_account_id_fkey'
    ) THEN
        ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_fkey" 
        FOREIGN KEY ("account_id") REFERENCES "trading_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trades_strategy_id_fkey'
    ) THEN
        ALTER TABLE "trades" ADD CONSTRAINT "trades_strategy_id_fkey" 
        FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 8: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Add triggers to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brokers_updated_at ON "brokers";
CREATE TRIGGER update_brokers_updated_at BEFORE UPDATE ON "brokers"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_accounts_updated_at ON "trading_accounts";
CREATE TRIGGER update_trading_accounts_updated_at BEFORE UPDATE ON "trading_accounts"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_strategies_updated_at ON "strategies";
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON "strategies"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trades_updated_at ON "trades";
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON "trades"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'Migration completed successfully!' as status;