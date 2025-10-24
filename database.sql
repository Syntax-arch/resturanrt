-- Enhanced database schema for real-time features
ALTER TABLE reservations 
ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed',
ADD COLUMN table_number INTEGER,
ADD COLUMN special_requests TEXT,
ADD COLUMN notification_sent BOOLEAN DEFAULT false;

-- Create tables configuration
CREATE TABLE restaurant_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    location VARCHAR(50),
    is_available BOOLEAN DEFAULT true
);

-- Create real-time notifications
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);