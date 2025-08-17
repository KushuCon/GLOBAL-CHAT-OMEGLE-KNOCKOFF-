-- Add status column to track user states
ALTER TABLE queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'WAITING';
ALTER TABLE queue ADD COLUMN IF NOT EXISTS room_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
