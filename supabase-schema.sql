-- ============================================================
-- R66SLOT AUCTION SYSTEM - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE auction_status AS ENUM (
  'draft', 'scheduled', 'active', 'ended', 'sold', 'cancelled', 'unsold'
);

CREATE TYPE auction_condition AS ENUM (
  'new_sealed', 'new_open_box', 'used_like_new', 'used_good', 'used_fair', 'for_parts'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'refunded'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE bidder_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  r66_customer_id TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  is_banned       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bidder_r66_id ON bidder_profiles(r66_customer_id);

CREATE TABLE auction_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auctions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  description_html  TEXT,
  category_id       UUID REFERENCES auction_categories(id),
  brand             TEXT,
  scale             TEXT,
  condition         auction_condition NOT NULL DEFAULT 'new_sealed',
  images            JSONB DEFAULT '[]',
  starting_price    DECIMAL(10,2) NOT NULL,
  reserve_price     DECIMAL(10,2),
  current_price     DECIMAL(10,2) NOT NULL,
  bid_increment     DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  bid_count         INT DEFAULT 0,
  status            auction_status NOT NULL DEFAULT 'draft',
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  original_end_time TIMESTAMPTZ NOT NULL,
  anti_snipe_seconds INT DEFAULT 30,
  winner_id         UUID REFERENCES bidder_profiles(id),
  winner_notified   BOOLEAN DEFAULT FALSE,
  featured          BOOLEAN DEFAULT FALSE,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX idx_auctions_category ON auctions(category_id);
CREATE INDEX idx_auctions_slug ON auctions(slug);

CREATE TABLE bids (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id   UUID NOT NULL REFERENCES bidder_profiles(id),
  amount      DECIMAL(10,2) NOT NULL,
  is_winning  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bids_auction ON bids(auction_id, amount DESC);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);

CREATE TABLE watchlist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bidder_id   UUID NOT NULL REFERENCES bidder_profiles(id) ON DELETE CASCADE,
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bidder_id, auction_id)
);

CREATE TABLE auction_payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id            UUID NOT NULL REFERENCES auctions(id),
  bidder_id             UUID NOT NULL REFERENCES bidder_profiles(id),
  amount                DECIMAL(10,2) NOT NULL,
  currency              TEXT DEFAULT 'ZAR',
  stripe_payment_intent TEXT,
  stripe_session_id     TEXT,
  status                payment_status DEFAULT 'pending',
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bidder_id   UUID NOT NULL REFERENCES bidder_profiles(id) ON DELETE CASCADE,
  auction_id  UUID REFERENCES auctions(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_bidder ON notifications(bidder_id, read, created_at DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Place a bid with concurrency safety and anti-sniping
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_new_bid bids%ROWTYPE;
  v_previous_winner UUID;
  v_time_remaining INTERVAL;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;

  IF v_auction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;
  IF v_auction.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is not active');
  END IF;
  IF NOW() > v_auction.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has ended');
  END IF;
  IF NOW() < v_auction.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has not started');
  END IF;
  IF p_amount < v_auction.current_price + v_auction.bid_increment THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Bid must be at least %s', v_auction.current_price + v_auction.bid_increment));
  END IF;
  IF EXISTS (SELECT 1 FROM bidder_profiles WHERE id = p_bidder_id AND is_banned = TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not permitted to bid');
  END IF;

  -- Get previous winner for outbid notification
  SELECT bidder_id INTO v_previous_winner FROM bids
    WHERE auction_id = p_auction_id AND is_winning = TRUE LIMIT 1;

  -- Clear previous winning bid
  UPDATE bids SET is_winning = FALSE WHERE auction_id = p_auction_id AND is_winning = TRUE;

  -- Insert new bid
  INSERT INTO bids (auction_id, bidder_id, amount, is_winning)
  VALUES (p_auction_id, p_bidder_id, p_amount, TRUE)
  RETURNING * INTO v_new_bid;

  -- Update auction price and count
  UPDATE auctions SET current_price = p_amount, bid_count = bid_count + 1, updated_at = NOW()
  WHERE id = p_auction_id;

  -- Anti-sniping: extend if bid in final N seconds
  v_time_remaining := v_auction.ends_at - NOW();
  IF v_time_remaining < (v_auction.anti_snipe_seconds || ' seconds')::INTERVAL THEN
    UPDATE auctions SET ends_at = NOW() + (v_auction.anti_snipe_seconds || ' seconds')::INTERVAL
    WHERE id = p_auction_id;
  END IF;

  -- Outbid notification
  IF v_previous_winner IS NOT NULL AND v_previous_winner != p_bidder_id THEN
    INSERT INTO notifications (bidder_id, auction_id, type, title, message)
    VALUES (v_previous_winner, p_auction_id, 'outbid', 'You have been outbid!',
      format('Someone bid R%s on "%s"', p_amount, v_auction.title));
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'bid_id', v_new_bid.id, 'amount', v_new_bid.amount,
    'new_price', p_amount, 'bid_count', v_auction.bid_count + 1);
END;
$$;

-- Close expired auctions
CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_auction RECORD;
  v_closed_count INT := 0;
  v_winning_bid RECORD;
BEGIN
  FOR v_auction IN
    SELECT * FROM auctions WHERE status = 'active' AND ends_at <= NOW() FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_winning_bid FROM bids
      WHERE auction_id = v_auction.id AND is_winning = TRUE LIMIT 1;

    IF v_winning_bid IS NOT NULL THEN
      IF v_auction.reserve_price IS NOT NULL AND v_winning_bid.amount < v_auction.reserve_price THEN
        UPDATE auctions SET status = 'unsold', updated_at = NOW() WHERE id = v_auction.id;
      ELSE
        UPDATE auctions SET status = 'ended', winner_id = v_winning_bid.bidder_id, updated_at = NOW()
        WHERE id = v_auction.id;

        INSERT INTO notifications (bidder_id, auction_id, type, title, message)
        VALUES (v_winning_bid.bidder_id, v_auction.id, 'winner',
          'You won the auction!',
          format('You won "%s" with a bid of R%s. Please complete payment.', v_auction.title, v_winning_bid.amount));

        INSERT INTO auction_payments (auction_id, bidder_id, amount)
        VALUES (v_auction.id, v_winning_bid.bidder_id, v_winning_bid.amount);
      END IF;
    ELSE
      UPDATE auctions SET status = 'unsold', updated_at = NOW() WHERE id = v_auction.id;
    END IF;

    v_closed_count := v_closed_count + 1;
  END LOOP;

  RETURN jsonb_build_object('closed', v_closed_count);
END;
$$;

-- Activate scheduled auctions
CREATE OR REPLACE FUNCTION activate_scheduled_auctions()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE v_activated INT := 0;
BEGIN
  UPDATE auctions SET status = 'active', updated_at = NOW()
  WHERE status = 'scheduled' AND starts_at <= NOW();
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  RETURN jsonb_build_object('activated', v_activated);
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- SEED CATEGORIES
-- ============================================================
INSERT INTO auction_categories (name, slug, sort_order) VALUES
  ('1:32 Slot Cars', '1-32-slot-cars', 1),
  ('1:24 Slot Cars', '1-24-slot-cars', 2),
  ('Parts & Accessories', 'parts-accessories', 3),
  ('Track & Sets', 'track-sets', 4),
  ('Controllers', 'controllers', 5),
  ('Collectibles', 'collectibles', 6);
