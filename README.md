# School Management System

A full-stack, AI-powered School Management System built with Next.js, MongoDB, and OpenRouter AI.

## Features

### 🎯 Core Features
- **Admin Panel** (Principal + Teachers)
- **Teacher Portal** with AI-powered tools
- **Student Portal** with performance tracking
- **Parent Portal** with child monitoring
- **Campus/Class/Section Management**
- **Role-based Authentication** (NextAuth + JWT)

### 🤖 AI Features (OpenRouter Integration)
- **AI Paper Generation** - Generate MCQs, short questions, long questions, and full exam papers
- **AI Auto-Grading** - Automated grading with explanations
- **Student Performance Forecast** - Predict future performance based on past data
- **AI Insights for Principal** - Weak subjects, weak teachers, class improvement suggestions
- **Early Warning System** - Detect at-risk students
- **AI Homework Generator** - Generate practice questions
- **Syllabus Delay Detection** - Track and alert on syllabus progress

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, ShadCN UI
- **Database**: MongoDB Atlas
- **Authentication**: NextAuth.js (JWT)
- **AI**: OpenRouter (Free Models)
  - meta-llama/llama-3.1-8b-instruct
  - mistralai/mistral-7b-instruct
  - google/gemma-7b
  - qwen/qwen-2.5-7b-instruct

## Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- OpenRouter API key (get one at https://openrouter.ai)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   
   📖 **See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed instructions**
   
   **Quick Setup Options:**
   
   **Option A: MongoDB Atlas (Cloud - Recommended)**
   1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register)
   2. Create a free cluster (M0 Sandbox)
   3. Create a database user (Security → Database Access)
   4. Whitelist your IP (Security → Network Access → Add IP Address → Allow from anywhere for dev)
   5. Get connection string (Connect → Connect your application)
   6. Format: `mongodb+srv://username:password@cluster.mongodb.net/school_management`
   
   **Option B: Local MongoDB**
   1. Install MongoDB locally (macOS: `brew install mongodb-community`)
   2. Start MongoDB: `brew services start mongodb-community`
   3. Connection string: `mongodb://localhost:27017/school_management`
   
   **Using TablePlus?** ✅ Yes! TablePlus fully supports MongoDB. See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for TablePlus connection instructions.

4. **Set up environment variables**
   ```bash
   # Create .env file
   touch .env
   ```

   Edit `.env` and add your credentials:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school_management
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   OPENROUTER_API_KEY=your-openrouter-api-key
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   JWT_SECRET=your-jwt-secret-key
   ```
   
   **For Local Development:**
   You can use simple values (they're required but don't need to be secure for local dev):
   ```env
   NEXTAUTH_SECRET=local-dev-secret-key-12345
   JWT_SECRET=local-jwt-secret-12345
   ```
   
   **For Production:**
   Generate secure random strings:
   ```bash
   openssl rand -base64 32
   ```
   
   **Note:** `NEXTAUTH_SECRET` is required even for local development as it's used in authentication middleware.

5. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

   This will create:
   - 1 Principal
   - 2 Teachers
   - 2 Students
   - 1 Parent
   - 1 Admin
   - Sample schools, classes, sections, and subjects

   **Default password for all users**: `password123`

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment on Vercel

### Step 1: Prepare Your Repository
1. Push your code to GitHub/GitLab/Bitbucket
2. Ensure all environment variables are documented in `.env.example`

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your repository
5. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables
In Vercel project settings, add all environment variables from your `.env` file:

- `MONGODB_URI`
- `NEXTAUTH_URL` (set to your Vercel domain, e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET` (generate a secure random string)
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL` (https://openrouter.ai/api/v1)
- `JWT_SECRET` (generate a secure random string)

### Step 4: Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be live at `https://your-app.vercel.app`

### Step 5: Update MongoDB Atlas
1. Go to MongoDB Atlas dashboard
2. Add your Vercel domain to the IP whitelist (or allow all IPs: `0.0.0.0/0`)
3. Update connection string if needed

## Project Structure

```
school-management-system/
├── app/
│   ├── admin/          # Admin portal pages
│   ├── teacher/        # Teacher portal pages
│   ├── student/        # Student portal pages
│   ├── parent/         # Parent portal pages
│   ├── api/            # API routes
│   │   ├── auth/       # NextAuth routes
│   │   └── ai/         # AI endpoints
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/             # ShadCN UI components
│   └── providers.tsx
├── lib/
│   ├── models/         # Mongoose models
│   ├── ai.ts           # OpenRouter AI utilities
│   ├── auth.ts         # NextAuth configuration
│   ├── db.ts           # MongoDB connection
│   └── middleware.ts   # Route protection
├── scripts/
│   └── seed.ts         # Database seeding script
└── types/
    └── next-auth.d.ts  # TypeScript definitions
```

## API Routes

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

### AI Endpoints
- `POST /api/ai/generate-paper` - Generate exam paper
- `POST /api/ai/grade` - AI grading
- `POST /api/ai/forecast` - Performance forecast
- `POST /api/ai/insights` - Generate insights
- `POST /api/ai/homework` - Generate homework questions

### Data Endpoints
- `GET/POST /api/grades` - Manage grades
- `GET/POST /api/attendance` - Manage attendance
- `GET/POST /api/homework` - Manage homework

## Usage

### For Administrators
1. Login at `/admin/login`
2. Manage schools, campuses, classes, and sections
3. Assign teachers to classes
4. View AI-generated insights and early warnings

### For Teachers
1. Login at `/teacher/login`
2. Manage student grades
3. Generate exam papers using AI
4. Use AI grading assistant
5. Track syllabus progress
6. Assign homework (with AI generation)
7. Mark attendance

### For Students
1. Login at `/student/login`
2. View grades and performance
3. Check AI performance forecast
4. View attendance record
5. Access homework and study materials
6. Track syllabus progress

### For Parents
1. Login at `/parent/login`
2. Monitor child's performance
3. View homework assignments
4. Receive weak subject alerts
5. Check attendance warnings
6. Communicate with teachers

## AI Models Used

The system uses OpenRouter's free models with automatic fallback:
1. **Primary**: meta-llama/llama-3.1-8b-instruct
2. **Fallback 1**: mistralai/mistral-7b-instruct
3. **Fallback 2**: google/gemma-7b
4. **Fallback 3**: qwen/qwen-2.5-7b-instruct

If one model fails, the system automatically tries the next one.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |

## Database Management with TablePlus

**Yes, you can use TablePlus!** TablePlus has excellent MongoDB support.

### Connecting TablePlus to MongoDB

1. **For MongoDB Atlas:**
   - Open TablePlus → Create new connection → MongoDB
   - Host: Your cluster hostname (e.g., `cluster0.xxxxx.mongodb.net`)
   - Port: `27017`
   - User: Your database username
   - Password: Your database password
   - Database: `school_management`
   - ✅ **Enable SSL** (required for Atlas)

2. **For Local MongoDB:**
   - Host: `localhost`
   - Port: `27017`
   - Database: `school_management`
   - ❌ **Disable SSL** (not needed for local)

3. **Features in TablePlus:**
   - Browse collections (users, students, teachers, etc.)
   - Edit documents directly
   - Run MongoDB queries
   - Export/Import data
   - Visual database structure

📖 **See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed TablePlus setup instructions**

## Troubleshooting

### MongoDB Connection Issues
- Ensure your MongoDB Atlas cluster is running
- Check IP whitelist settings (Network Access in Atlas)
- Verify connection string format
- For TablePlus: Make sure SSL is enabled for Atlas, disabled for local

### OpenRouter API Issues
- Verify your API key is correct
- Check API rate limits
- Ensure you have credits/quota available

### Authentication Issues
- Clear browser cookies
- Check `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation
- Review the code comments

## Acknowledgments

- Next.js team for the amazing framework
- ShadCN for the UI components
- OpenRouter for AI capabilities
- MongoDB for the database solution

---

**Built with ❤️ for educational institutions**

