# Banking RAG Knowledge Base

A cost-effective AI-powered assistant for banking professionals that provides accurate, contextual answers about loan products, regulatory requirements, and internal banking policies.

## 🏗️ Architecture Overview

This system leverages:
- **Next.js 14** with TypeScript for the frontend
- **Supabase** with PostgreSQL + pgvector for vector storage
- **LangChain** for RAG orchestration
- **Groq** LLM for fast, cost-effective inference
- **Local Nomic embeddings** via Ollama for privacy and cost savings
- **Tailwind CSS** for modern, responsive UI

## 💰 Cost Optimization

This setup achieves **~85% cost reduction** compared to premium alternatives:

| Component | Premium Setup | Our Setup | Savings |
|-----------|---------------|-----------|---------|
| LLM | GPT-4 ($0.03/1K tokens) | Groq ($0.0007/1K tokens) | 95% |
| Embeddings | OpenAI ($0.0001/1K tokens) | Local Ollama (Free) | 100% |
| Vector DB | Pinecone ($70/month) | Supabase ($25/month) | 65% |
| **Total** | **$800-1,200/month** | **$150-200/month** | **80%+** |

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and npm
2. **Ollama** installed locally
3. **Supabase** account
4. **Groq** API key

### 1. Install Ollama and Nomic Embeddings

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# Pull the Nomic embedding model
ollama pull nomic-embed-text
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Go to SQL Editor and run the schema:

```sql
-- Copy and paste the contents of supabase-schema.sql
-- This will create all tables, indexes, and functions
```

3. Enable the pgvector extension in your Supabase project

### 3. Environment Configuration

Copy the environment template and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Update `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# LLM Configuration
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL_NAME=llama-3.3-70b-versatile

# Ollama Configuration (Local Nomic Embeddings)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### 4. Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📊 Features

### Core Functionality

- **🔍 Intelligent Document Search**: Table-aware chunking preserves banking document structure
- **💬 Natural Language Chat**: Banking-specific prompts and context awareness
- **📈 Loan Calculations**: Integrated calculation engine with current rates
- **⚖️ Compliance Checking**: Regulatory compliance analysis and recommendations
- **📚 Source Citations**: Transparent source references with confidence scores

### Banking-Specific Features

- **Role-Based Context**: Different experiences for loan officers, compliance analysts, and managers
- **Table Preservation**: Maintains rate sheets, amortization tables, and policy matrices
- **Cross-Reference Tracking**: Keeps "See Section X.X" references intact
- **Version Control**: Track document versions and effective dates
- **Audit Trails**: Complete query logging for compliance

### Advanced Capabilities

- **Multi-Query Types**: General questions, compliance checks, loan calculations
- **Advanced Mode**: Detailed parameter control for power users
- **Real-Time Processing**: Streaming responses with typing indicators
- **Mobile Responsive**: Optimized for tablets and phones
- **Cost Monitoring**: Built-in analytics for API usage and costs

## 🏛️ Banking Document Types Supported

- **Loan Handbooks**: PDF/DOCX with complex tables and calculations
- **Regulatory Manuals**: Multi-section compliance documents
- **Policy Documents**: Internal banking policies and procedures
- **Rate Sheets**: Current lending rates and terms
- **Compliance Matrices**: Regulatory requirement mappings
- **Forms**: Fillable PDFs and structured templates

## 📤 Document Upload & Processing

### Supported Formats
- PDF (up to 10MB)
- DOCX/DOC
- TXT
- CSV (for rate sheets)

### Processing Pipeline
1. **Text Extraction**: OCR and text parsing
2. **Table-Aware Chunking**: Preserves table structure and headers
3. **Embedding Generation**: Local Nomic embeddings via Ollama
4. **Vector Storage**: Efficient storage in Supabase with pgvector
5. **Indexing**: HNSW indexing for fast similarity search

### Upload via API

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@loan_handbook.pdf" \
  -F "documentType=loan_handbook" \
  -F "version=2.1" \
  -F "effectiveDate=2024-01-01"
```

## 💬 Chat API Usage

### General Query

```bash
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "question": "What are the current rates for 30-year mortgages?",
    "queryType": "general",
    "context": {
      "user_role": "loan_officer"
    }
  }'
```

### Compliance Check

```bash
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Does our current lending practice comply with TRID requirements?",
    "queryType": "compliance",
    "regulations": ["TRID", "Regulation Z"]
  }'
```

### Loan Calculation

```bash
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Calculate monthly payment",
    "queryType": "loan_calculation",
    "loanAmount": 250000,
    "loanTerm": 360,
    "loanType": "conventional_mortgage"
  }'
```

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── chat/         # Chat endpoints
│   │   └── documents/    # Document management
│   ├── admin/            # Admin dashboard
│   └── page.tsx          # Main chat interface
├── components/           # React components
│   ├── chat/            # Chat interface components
│   ├── admin/           # Admin components
│   └── ui/              # Reusable UI components
├── lib/                  # Core libraries
│   ├── embeddings.ts    # Ollama integration
│   ├── document-processor.ts # Document processing
│   ├── rag-chains.ts    # LangChain RAG implementation
│   └── supabase.ts      # Database client
├── types/               # TypeScript definitions
└── utils/               # Utility functions
```

### Key Components

- **BankingDocumentProcessor**: Table-aware document chunking
- **BankingRAGChain**: Core RAG implementation with banking context
- **ComplianceRAGChain**: Specialized compliance checking
- **LoanCalculatorRAGChain**: Loan calculation with rate lookup
- **ChatInterface**: Main user interface component

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run type-check
```

## 🔒 Security & Compliance

### Data Protection
- End-to-end encryption for all data
- Row-level security (RLS) in Supabase
- Local embedding processing (data never leaves your infrastructure)
- Audit trails for all queries and document access

### Banking Compliance
- SOC 2 Type II ready architecture
- GDPR compliance for data handling
- FFIEC guidelines adherence
- Audit logging for regulatory requirements

### User Management
- Role-based access control (RBAC)
- Department-level permissions
- Activity tracking and session management

## 📈 Performance & Monitoring

### Expected Performance
- **Query Response**: <3 seconds (95th percentile)
- **Document Processing**: <5 minutes per 100-page document
- **Concurrent Users**: 50+ supported
- **Similarity Search**: <100ms average

### Monitoring
```bash
# View system health
curl http://localhost:3000/api/admin/system-health

# Check document statistics
curl http://localhost:3000/api/analytics/usage

# Monitor costs
curl http://localhost:3000/api/analytics/costs
```

## 🛠️ Troubleshooting

### Common Issues

**Ollama Connection Error**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama service
brew services restart ollama
```

**Supabase Connection Error**
- Verify environment variables are set correctly
- Check if pgvector extension is enabled
- Ensure Row Level Security policies are configured

**Document Processing Fails**
- Check file size (max 10MB)
- Verify file format is supported
- Check Ollama embedding service availability

**Groq API Rate Limits**
- Monitor API usage in Groq dashboard
- Implement request queuing for high-traffic periods
- Consider upgrading Groq plan for higher limits

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
DEBUG=banking-rag:*
```

## 🚀 Deployment

### Vercel Deployment

```bash
# Build the application
npm run build

# Deploy to Vercel
vercel deploy
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
# ... other production variables
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting guide above
- Review the API documentation

## 🎯 Roadmap

- [ ] Multi-language support (Spanish)
- [ ] Voice input/output capabilities
- [ ] Advanced analytics dashboard
- [ ] Integration with core banking systems
- [ ] Automated compliance reporting
- [ ] Mobile app development

---

**Built with ❤️ for banking professionals who deserve better tools.**
