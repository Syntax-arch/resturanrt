-- Admin users table
CREATE TABLE admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff management
CREATE TABLE staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    hourly_rate DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff schedules
CREATE TABLE staff_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES staff(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced reservations with payments
ALTER TABLE reservations 
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN total_amount DECIMAL(10,2),
ADD COLUMN special_requests TEXT,
ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed';

-- Restaurant settings
CREATE TABLE restaurant_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password, role) 
VALUES ('admin', 'admin@restaurant.com', 'admin123', 'super_admin');

-- Insert default restaurant settings
INSERT INTO restaurant_settings (setting_key, setting_value, description) VALUES
('business_hours', '{"monday": {"open": "11:30", "close": "22:00", "closed": false}, "tuesday": {"open": "11:30", "close": "22:00", "closed": false}, "wednesday": {"open": "11:30", "close": "22:00", "closed": false}, "thursday": {"open": "11:30", "close": "22:00", "closed": false}, "friday": {"open": "11:30", "close": "22:00", "closed": false}, "saturday": {"open": "11:30", "close": "22:00", "closed": false}, "sunday": {"open": "11:30", "close": "21:00", "closed": false}}', '営業時間'),
('table_configuration', '{"tables": [{"number": 1, "capacity": 4, "location": "main"}, {"number": 2, "capacity": 4, "location": "main"}, {"number": 3, "capacity": 6, "location": "main"}, {"number": 4, "capacity": 2, "location": "window"}, {"number": 5, "capacity": 8, "location": "private"}]}', 'テーブル設定'),
('pricing', '{"service_charge": 10, "tax_rate": 8, "cancellation_fee": 50}', '料金設定');