"""
Database setup script for LaTeX Note App

This script creates the necessary tables in Supabase for the notes functionality.
You can run this script to set up database schema, or you can execute
the SQL commands directly in the Supabase dashboard.
"""

-- Create the notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    latex_content TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own notes
CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own notes
CREATE POLICY "Users can insert own notes" ON notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own notes
CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own notes
CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE
    ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
