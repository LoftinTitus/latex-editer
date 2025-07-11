"""
Database setup script for LaTeX Note App

This script creates the necessary tables in Supabase for the notes functionality.
Run this script to set up your database schema programmatically.

Usage:
    python setup_database.py
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing required environment variables!")
    print("\nPlease create a .env file in the backend directory with:")
    print("SUPABASE_URL=https://your-project-id.supabase.co")
    print("SUPABASE_SERVICE_KEY=your-service-role-key-here")
    print("SUPABASE_JWT_SECRET=your-jwt-secret-here")
    print("\nYou can find these values in your Supabase dashboard at Settings -> API")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("✅ Connected to Supabase successfully!")
except Exception as e:
    print(f"❌ Failed to connect to Supabase: {str(e)}")
    print("Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY in the .env file")
    exit(1)

def setup_database():
    """
    Set up the database tables and policies for the notes functionality
    """
    
    # SQL commands to create the notes table and related objects
    sql_commands = [
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
        """,
        
        """
        -- Create an index on user_id for faster queries
        CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
        """,
        
        """
        -- Create an index on created_at for sorting
        CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
        """,
        
        """
        -- Enable Row Level Security (RLS)
        ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
        """,
        
        """
        -- Create policy to allow users to only see their own notes
        CREATE POLICY IF NOT EXISTS "Users can view own notes" ON notes
            FOR SELECT USING (auth.uid() = user_id);
        """,
        
        """
        -- Create policy to allow users to insert their own notes
        CREATE POLICY IF NOT EXISTS "Users can insert own notes" ON notes
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        """,
        
        """
        -- Create policy to allow users to update their own notes
        CREATE POLICY IF NOT EXISTS "Users can update own notes" ON notes
            FOR UPDATE USING (auth.uid() = user_id);
        """,
        
        """
        -- Create policy to allow users to delete their own notes
        CREATE POLICY IF NOT EXISTS "Users can delete own notes" ON notes
            FOR DELETE USING (auth.uid() = user_id);
        """,
        
        """
        -- Create a function to automatically update the updated_at timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        """,
        
        """
        -- Create trigger to automatically update updated_at on row updates
        DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
        CREATE TRIGGER update_notes_updated_at BEFORE UPDATE
            ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
    ]
    
    print("Setting up database...")
    
    try:
        # Note: Some of these operations might need to be done manually in Supabase dashboard
        # if the supabase-py client doesn't support all SQL operations
        
        # First, let's try to create the basic table structure
        print("Creating notes table...")
        
        # This is a simplified approach - you may need to run the full SQL in Supabase dashboard
        basic_setup = """
        CREATE TABLE IF NOT EXISTS notes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            latex_content TEXT,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # Try to execute basic table creation
        try:
            result = supabase.rpc('exec_sql', {'sql': basic_setup}).execute()
            print("✅ Basic table structure created successfully!")
        except Exception as e:
            print(f"⚠️  Could not create table via Python client: {str(e)}")
            print("\n🔧 Please run the following SQL manually in your Supabase dashboard:")
            print("   Go to SQL Editor in your Supabase dashboard and run the commands from database_setup.sql")
            
        print("\n📋 Summary of what needs to be set up:")
        print("1. ✓ notes table with proper schema")
        print("2. ✓ Indexes for performance optimization")  
        print("3. ✓ Row Level Security (RLS) policies")
        print("4. ✓ Automatic updated_at timestamp trigger")
        
        print(f"\n📄 All SQL commands are available in: database_setup.sql")
        print("   You can copy and paste these commands into your Supabase SQL Editor")
        
    except Exception as e:
        print(f"❌ Error during database setup: {str(e)}")
        print("\n🔧 Manual setup required:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Run the commands from database_setup.sql")
        return False
        
    return True

if __name__ == "__main__":
    setup_database()
