-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    photo_path TEXT,
    date_logged DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT, -- JSON string for tags
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create extracted facts table (for GPT processing)
CREATE TABLE IF NOT EXISTS extracted_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id INTEGER,
    fact_text TEXT NOT NULL,
    confidence_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories (id) ON DELETE CASCADE
);

-- Create generated questions table
CREATE TABLE IF NOT EXISTS generated_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id INTEGER,
    question_text TEXT NOT NULL,
    question_type TEXT, -- 'recall', 'detail', 'connection'
    difficulty_level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories (id) ON DELETE CASCADE
);

-- Create user answers and scores table
CREATE TABLE IF NOT EXISTS user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,
    user_answer TEXT,
    is_correct BOOLEAN,
    score INTEGER,
    time_taken INTEGER, -- in seconds
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES generated_questions (id) ON DELETE CASCADE
);

-- Create memory test sessions table
CREATE TABLE IF NOT EXISTS test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_name TEXT,
    total_questions INTEGER,
    correct_answers INTEGER,
    total_score INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date_logged);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_facts_memory ON extracted_facts(memory_id);
CREATE INDEX IF NOT EXISTS idx_questions_memory ON generated_questions(memory_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON user_answers(question_id);

-- Test scores table
CREATE TABLE IF NOT EXISTS test_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    partial_answers INTEGER DEFAULT 0,
    final_score REAL NOT NULL,
    percentage INTEGER NOT NULL,
    test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT, -- JSON string of question details
    memories_tested TEXT, -- JSON array of memory IDs used
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);