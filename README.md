# 🏦 Loan Agent System

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-DB-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An AI-powered conversational loan application system with multi-agent architecture for automated loan underwriting. Built with Next.js, TypeScript, and Groq's Llama 3.3 70B.

## 🎯 **Features**

- 🤖 **AI-Powered Chatbot** - Natural conversation flow using Llama 3.3 70B
- 🔐 **KYC Verification** - Automated PAN verification with mock database
- 📊 **Credit Assessment** - Real-time credit score checking
- ⚖️ **Rule-Based Underwriting** - Intelligent loan approval engine
- 📄 **PDF Generation** - Professional sanction letter generation
- 🎨 **Modern UI** - Clean, responsive interface with Tailwind CSS
- 🔒 **Secure Authentication** - Supabase Auth with Google OAuth
- 💾 **Database Integration** - PostgreSQL via Supabase

---

## 🏗️ **Architecture**

### **Multi-Agent System**

```
User Input → Master Agent (Orchestrator) → Worker Agents
                     ↓
            ┌────────┴────────┐
            ↓                 ↓
    ┌───────────────┐   ┌─────────────┐
    │  KYC Agent    │   │Credit Agent │
    └───────────────┘   └─────────────┘
            ↓                 ↓
    ┌───────────────────────────────┐
    │   Underwriting Agent          │
    │   (Rule-Based Decision)       │
    └───────────────────────────────┘
            ↓
    ┌───────────────────────────────┐
    │   Document Generation Agent   │
    │   (PDF Sanction Letter)       │
    └───────────────────────────────┘
```

### **Tech Stack**

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Backend:**
- Next.js API Routes (Serverless)
- Groq API (Llama 3.3 70B)
- Supabase (PostgreSQL + Auth + Storage)

**Libraries:**
- `groq-sdk` - LLM integration
- `pdfkit` - PDF generation
- `@supabase/ssr` - Supabase client
- `date-fns` - Date utilities
- `uuid` - Unique ID generation

---

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+ 
- npm or yarn
- Supabase account
- Groq API key

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/vidushim03/loan-agent-system.git
cd loan-agent-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env.local` file:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq API (for Llama 3.3 70B)
GROQ_API_KEY=your_groq_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Get your keys:**
- Supabase: https://supabase.com → Project Settings → API
- Groq: https://console.groq.com → API Keys

4. **Set up Supabase database**

Run the SQL schema in Supabase SQL Editor:
```bash
# Copy and paste the contents of supabase-schema.sql
# in Supabase Dashboard → SQL Editor
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```

---

## 📁 **Project Structure**

```
loan-agent-system/
├── app/
│   ├── api/                    # API routes
│   │   ├── chat/               # Main chat endpoint
│   │   └── agents/             # Agent endpoints
│   │       ├── kyc/
│   │       ├── credit/
│   │       ├── underwriting/
│   │       └── document/
│   ├── (auth)/                 # Auth pages
│   │   ├── login/
│   │   └── signup/
│   └── (protected)/            # Protected routes
│       ├── chat/               # Chat interface
│       └── applications/       # Applications dashboard
├── components/
│   ├── chat/                   # Chat UI components
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── agents/                 # Agent logic
│   │   ├── kyc-agent.ts
│   │   ├── credit-agent.ts
│   │   ├── underwriting-agent.ts
│   │   └── orchestrator.ts
│   ├── mock-data/              # Mock databases
│   │   ├── kyc-database.ts
│   │   └── credit-database.ts
│   ├── supabase/               # Supabase clients
│   ├── utils/                  # Utilities
│   │   ├── calculations.ts
│   │   └── pdf-generator.ts
│   └── groq.ts                 # Groq LLM client
├── types/
│   └── index.ts                # TypeScript types
└── README.md
```

---

## 🎮 **Usage**

### **Test the System**

Use these test PAN numbers:

**✅ Approved Profiles:**
- `GOODPAN123` - Excellent credit (790)
- `ABCDE1234F` - Excellent credit (820)
- `FGHIJ5678K` - Good credit (720)

**⚠️ Average Profiles:**
- `BADPAN456` - Fair credit (680)
- `KLMNO9012P` - Fair credit (670)

**❌ Rejected Profiles:**
- `KYCFAIL789` - KYC pending
- `BBBBB2222B` - Poor credit (620)

### **Sample Conversation Flow**

```
Agent: Welcome to QuickLoan! Please provide your PAN number.
User: GOODPAN123

Agent: ✅ KYC Verified! Welcome Rohan Gupta! 
       Are you Salaried or Self-Employed?
User: Salaried

Agent: What is your monthly income?
User: 75000

Agent: How much loan do you need?
User: I need 500000 for wedding, 36 months tenure

Agent: Any existing EMIs?
User: 12000

Agent: 📊 Fetching credit score...
       ✅ Credit Score: 790 (Very Good)
       
       🎉 Congratulations! Your loan is APPROVED!
       💰 Amount: ₹5,00,000
       📊 Interest: 11.5%
       💳 EMI: ₹16,680/month
```

---

## 🔧 **API Endpoints**

### **Chat API**
```bash
POST /api/chat
```
Process user messages and orchestrate conversation

### **KYC Verification**
```bash
POST /api/agents/kyc
Body: { "pan": "GOODPAN123" }
```

### **Credit Check**
```bash
POST /api/agents/credit
Body: { "pan": "GOODPAN123" }
```

### **Underwriting Decision**
```bash
POST /api/agents/underwriting
Body: { "loanData": {...}, "userId": "..." }
```

### **Document Generation**
```bash
POST /api/agents/document
Body: { "applicationId": "...", "customerName": "...", ... }
```

📚 **Full API Documentation:** See [API_ROUTES.md](./API_ROUTES.md)

---

## ⚙️ **Business Rules**

The system applies these rules for loan approval:

| Rule | Requirement |
|------|------------|
| **Age** | 21 - 60 years |
| **Min Income (Salaried)** | ₹25,000/month |
| **Min Income (Self-Employed)** | ₹40,000/month |
| **Credit Score** | ≥ 650 |
| **DTI Ratio** | ≤ 50% |
| **Defaults** | No recent defaults |
| **Max Loan** | 10x monthly income (salaried) |

---

## 📊 **Database Schema**

### **Main Tables**

1. **loan_applications** - Store all loan applications
2. **conversation_logs** - Track chat messages
3. **kyc_verifications** - Cache KYC results

Full schema: [supabase-schema.sql](./supabase-schema.sql)

---

## 🧪 **Testing**

### **Run Tests**
```bash
# Verify setup
bash verify-setup.sh

# Test imports
npx ts-node test-imports.ts

# Test API endpoints
npm run test
```

### **Manual Testing**
```bash
# Test KYC endpoint
curl -X POST http://localhost:3000/api/agents/kyc \
  -H "Content-Type: application/json" \
  -d '{"pan":"GOODPAN123"}'

# Test Credit endpoint
curl -X POST http://localhost:3000/api/agents/credit \
  -H "Content-Type: application/json" \
  -d '{"pan":"GOODPAN123"}'
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

**Import errors:**
```bash
# Restart TypeScript server in VSCode
Cmd + Shift + P → "TypeScript: Restart TS Server"
```

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Database connection:**
```bash
# Check .env.local has correct Supabase credentials
# Run SQL schema in Supabase dashboard
```

📚 **Full Troubleshooting Guide:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📈 **Roadmap**

- [x] Multi-agent architecture
- [x] Rule-based underwriting
- [x] KYC & Credit verification
- [x] PDF document generation
- [ ] Frontend chat UI
- [ ] User authentication
- [ ] Application dashboard
- [ ] Email notifications
- [ ] Advanced ML model
- [ ] Production deployment

---

## 🤝 **Contributing**

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 **Author**

Vidushi Maheshwari

- GitHub: [@vidushim03](https://github.com/vidushim03)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

---

## 🙏 **Acknowledgments**

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Groq](https://groq.com/) - LLM inference
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📞 **Support**

If you have any questions or issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Read the [API Documentation](./API_ROUTES.md)
3. Open an [Issue](https://github.com/vidushim03/loan-agent-system/issues)

---

## ⭐ **Show Your Support**

Give a ⭐️ if this project helped you!

---

## 📸 **Screenshots**

_Coming soon..._

---

Made with care by Vidushi Maheshwari
