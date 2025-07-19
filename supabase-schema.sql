-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_path TEXT,
    version VARCHAR(10),
    effective_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks with embeddings (768 dimensions for Nomic)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768), -- Nomic embeddings dimension
    chunk_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index for fast similarity search
CREATE INDEX ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Queries table for analytics
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    query_text TEXT NOT NULL,
    response_text TEXT,
    sources JSONB,
    response_time_ms INTEGER,
    feedback_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('loan_officer', 'compliance_analyst', 'manager', 'admin')),
    department TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);

-- Function to search for similar documents using cosine similarity
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  document_type text,
  document_title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    d.document_type,
    d.title as document_title,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND d.status = 'active'
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE(
  total_documents bigint,
  total_chunks bigint,
  document_types jsonb,
  avg_chunks_per_doc numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(dc.id) as total_chunks,
    jsonb_agg(DISTINCT d.document_type) as document_types,
    ROUND(COUNT(dc.id)::numeric / COUNT(DISTINCT d.id), 2) as avg_chunks_per_doc
  FROM documents d
  LEFT JOIN document_chunks dc ON d.id = dc.document_id
  WHERE d.status = 'active';
$$;

-- Function to get user query analytics
CREATE OR REPLACE FUNCTION get_query_analytics(
  start_date timestamp DEFAULT NOW() - INTERVAL '30 days',
  end_date timestamp DEFAULT NOW()
)
RETURNS TABLE(
  total_queries bigint,
  avg_response_time numeric,
  queries_per_day numeric,
  top_users jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) as total_queries,
    ROUND(AVG(queries.response_time_ms), 2) as avg_response_time,
    ROUND(COUNT(*)::numeric / EXTRACT(days FROM (end_date - start_date)), 2) as queries_per_day,
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_stats.user_id,
        'query_count', user_stats.query_count
      )
    ) as top_users
  FROM (
    SELECT 
      user_id,
      COUNT(*) as query_count
    FROM queries
    WHERE created_at BETWEEN start_date AND end_date
    GROUP BY user_id
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) user_stats
  JOIN queries ON queries.user_id = user_stats.user_id
  WHERE queries.created_at BETWEEN start_date AND end_date;
$$;

-- Row Level Security (RLS) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for documents (admins can manage, others can read active documents)
CREATE POLICY "Enable read access for active documents" ON documents
FOR SELECT USING (status = 'active');

CREATE POLICY "Enable full access for admins" ON documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Policies for document_chunks (follow document access)
CREATE POLICY "Enable read access for document chunks" ON document_chunks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = document_chunks.document_id 
    AND documents.status = 'active'
  )
);

-- Policies for queries (users can read their own, admins can read all)
CREATE POLICY "Users can read own queries" ON queries
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own queries" ON queries
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all queries" ON queries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Policies for users
CREATE POLICY "Users can read own profile" ON users
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can manage users" ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- Indexes for performance
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_created_at ON queries(created_at);
CREATE INDEX idx_users_role ON users(role);

-- Insert default admin user (update with real values)
INSERT INTO users (email, role, department, permissions) VALUES (
  'admin@bank.com',
  'admin',
  'IT',
  '{"full_access": true, "manage_users": true, "manage_documents": true}'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample document types for validation
INSERT INTO documents (title, document_type, status, metadata) VALUES 
  ('Sample Loan Handbook', 'loan_handbook', 'active', '{"version": "1.0", "sample": true}'),
  ('Sample Regulatory Manual', 'regulatory_manual', 'active', '{"version": "1.0", "sample": true}'),
  ('Sample Policy Document', 'policy_document', 'active', '{"version": "1.0", "sample": true}')
ON CONFLICT DO NOTHING; 