const fs = require('fs');
const path = require('path');

console.log('🚀 Creating VolunteerFlow Project (FIXED VERSION)...\n');

const dirs = [
  'volunteerflow/backend/src',
  'volunteerflow/frontend/src/pages',
  'volunteerflow/frontend/src/styles',
];

console.log('📁 Creating directories...');
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ ${dir}`);
  }
});

const files = {
  'volunteerflow/backend/package.json': `{
  "name": "volunteerflow-backend",
  "version": "1.0.0",
  "description": "Volunteer Management Platform - Backend",
  "main": "dist/index.js",
  "scripts": {
    "dev": "node src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`,

  'volunteerflow/backend/.env': `DATABASE_URL="postgresql://volunteerflow:volunteerflow123@localhost:5432/volunteerflow"
JWT_SECRET="dev-secret-key-change-in-production"
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"`,

  'volunteerflow/backend/src/index.js': `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'VolunteerFlow Backend is running!'
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'VolunteerFlow API v1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

app.listen(PORT, () => {
  console.log('\\n✅ VolunteerFlow Backend Started!');
  console.log(\`🚀 Server: http://localhost:\${PORT}\`);
  console.log(\`🏥 Health: http://localhost:\${PORT}/health\`);
  console.log(\`📚 API: http://localhost:\${PORT}/api\\n\`);
});`,

  'volunteerflow/backend/Dockerfile': `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]`,

  'volunteerflow/frontend/package.json': `{
  "name": "volunteerflow-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.3"
  }
}`,

  'volunteerflow/frontend/.env.local': `NEXT_PUBLIC_API_URL=http://localhost:3001/api`,

  'volunteerflow/frontend/tsconfig.json': `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,

  'volunteerflow/frontend/next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;`,

  'volunteerflow/frontend/tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,

  'volunteerflow/frontend/postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

  'volunteerflow/frontend/src/pages/index.tsx': `import React from 'react';
import Head from 'next/head';

export default function Home() {
  const [apiStatus, setApiStatus] = React.useState('Checking...');

  React.useEffect(() => {
    fetch('http://localhost:3001/health')
      .then(res => res.json())
      .then(data => setApiStatus('✅ Connected'))
      .catch(() => setApiStatus('❌ Backend not running'));
  }, []);

  return (
    <>
      <Head>
        <title>VolunteerFlow</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white', padding: '20px' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            VolunteerFlow
          </h1>
          <p style={{ fontSize: '1.5rem', marginBottom: '2rem', opacity: 0.9 }}>
            Volunteer Management Platform
          </p>
          <div style={{
            padding: '1rem 2rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            marginBottom: '2rem'
          }}>
            <p>Backend API: {apiStatus}</p>
          </div>
          <button style={{
            background: 'white',
            color: '#667eea',
            padding: '1rem 2rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            Get Started
          </button>
        </div>
      </div>
    </>
  );
}`,

  'volunteerflow/frontend/src/pages/_app.tsx': `import '@/styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}`,

  'volunteerflow/frontend/src/styles/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}`,

  'volunteerflow/frontend/Dockerfile': `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]`,

  'volunteerflow/docker-compose.yml': `version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: volunteerflow-db
    environment:
      POSTGRES_USER: volunteerflow
      POSTGRES_PASSWORD: volunteerflow123
      POSTGRES_DB: volunteerflow
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    container_name: volunteerflow-backend
    environment:
      NODE_ENV: development
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - db

  frontend:
    build: ./frontend
    container_name: volunteerflow-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:`,

  'volunteerflow/README.md': `# VolunteerFlow

Volunteer Management Platform

## 🚀 Quick Start (WITHOUT Docker)

### Backend
\`\`\`powershell
cd backend
npm install
npm start
\`\`\`

### Frontend (in new terminal)
\`\`\`powershell
cd frontend
npm install
npm run dev
\`\`\`

### Access
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health

## 🐳 With Docker (Optional)

\`\`\`powershell
docker-compose up --build
\`\`\`

## ✅ Verify It Works

1. Backend: Open http://localhost:3001/health
   - Should see: {"status":"ok"}

2. Frontend: Open http://localhost:3000
   - Should see: VolunteerFlow homepage with green checkmark

## 📁 Project Structure

\`\`\`
volunteerflow/
├── backend/         # Express API
├── frontend/        # Next.js App
└── docker-compose.yml
\`\`\`

## 🛠️ Tech Stack

- Backend: Node.js + Express
- Frontend: Next.js + React
- Database: PostgreSQL (optional)`,

  'volunteerflow/.gitignore': `node_modules/
.env
.env.local
dist/
.next/
*.log
.DS_Store`,
};

console.log('\n📝 Creating files...');
Object.entries(files).forEach(([filePath, content]) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✓ ${filePath}`);
});

console.log('\n✅ Project created successfully!');
console.log('\n📦 Next: Create ZIP file with archiver');