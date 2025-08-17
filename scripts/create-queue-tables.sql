-- Create queue table for 1-1 chat matching
CREATE TABLE IF NOT EXISTS queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  language TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_rooms table for paired users
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  user1_username TEXT NOT NULL,
  user2_username TEXT NOT NULL,
  language TEXT NOT NULL,
  is_one_on_one BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_code ON chat_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON queue(user_id);
