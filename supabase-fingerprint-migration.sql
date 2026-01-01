-- Add fingerprint/biometric support for students
-- Run this SQL in your Supabase SQL Editor

-- Student biometric data table to store WebAuthn credentials
CREATE TABLE IF NOT EXISTS student_biometric_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE, -- WebAuthn credential ID
  public_key TEXT NOT NULL, -- Base64 encoded public key
  counter BIGINT DEFAULT 0, -- Signature counter for security
  device_name TEXT, -- Optional: device name for user reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_biometric_data_student_id ON student_biometric_data(student_id);
CREATE INDEX idx_student_biometric_data_credential_id ON student_biometric_data(credential_id);

-- Add comment
COMMENT ON TABLE student_biometric_data IS 'Stores WebAuthn biometric credentials (fingerprint/face) for students to enable biometric-based attendance marking';

