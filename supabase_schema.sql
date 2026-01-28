-- Medguardian Database Schema Initialization for Supabase SQL Editor

-- 1. Users table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128),
    role VARCHAR(20) DEFAULT 'senior',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}'::jsonb,
    emergency_contact_id INTEGER
);

-- 2. Medication table
CREATE TABLE IF NOT EXISTS medication (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    instructions TEXT,
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_taken TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    barcode VARCHAR(100),
    reference_image_path TEXT,
    visual_fingerprint TEXT, -- NEW V2.0 ORB Descriptors
    pill_count INTEGER DEFAULT 0,
    notification_time TIME,
    reminder_times JSONB DEFAULT '[]'::jsonb,
    stock_threshold INTEGER DEFAULT 5
);

-- 3. Medication Log table
CREATE TABLE IF NOT EXISTS medication_log (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER REFERENCES medication(id) ON DELETE CASCADE,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(50),
    confidence FLOAT,
    verified BOOLEAN DEFAULT FALSE,
    image_path TEXT,
    notes TEXT
);

-- 4. Medication Interaction table
CREATE TABLE IF NOT EXISTS medication_interaction (
    id SERIAL PRIMARY KEY,
    med1_id INTEGER REFERENCES medication(id) ON DELETE CASCADE,
    med2_id INTEGER REFERENCES medication(id) ON DELETE CASCADE,
    severity VARCHAR(20),
    description TEXT,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Snooze Log table
CREATE TABLE IF NOT EXISTS snooze_log (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER REFERENCES medication(id) ON DELETE CASCADE,
    snoozed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remind_at TIMESTAMP,
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE
);

-- 6. Relations (Caregiver/Senior)
CREATE TABLE IF NOT EXISTS caregiver_senior (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    senior_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Test User (Optional)
-- Password is 'password123' (hashed)
-- INSERT INTO "user" (username, email, password_hash, role) 
-- VALUES ('testsenior', 'senior@example.com', 'pbkdf2:sha256:600000$u0T6xY1y$6e7b...', 'senior');
