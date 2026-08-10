import { ScannedFile } from './projectScanner';

export interface TechStackAnalysis {
  frameworks: string[];
  languages: string[];
  databases: string[];
  authProviders: string[];
  externalServices: string[];
  dependencies: { name: string; version: string; type: 'production' | 'dev' }[];
}

export class DependencyAnalyzer {
  static analyze(files: ScannedFile[]): TechStackAnalysis {
    const frameworks = new Set<string>();
    const languages = new Set<string>();
    const databases = new Set<string>();
    const authProviders = new Set<string>();
    const externalServices = new Set<string>();
    const dependencies: { name: string; version: string; type: 'production' | 'dev' }[] = [];

    // Collect languages from files
    for (const f of files) {
      if (f.language && f.language !== 'Text') {
        const baseLang = f.language.split(' ')[0];
        languages.add(baseLang);
      }
    }

    // 1. Analyze package.json
    const packageJsonFile = files.find(f => f.name === 'package.json');
    if (packageJsonFile && packageJsonFile.content) {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        const deps = { ...pkg.dependencies };
        const devDeps = { ...pkg.devDependencies };

        for (const [name, version] of Object.entries(deps)) {
          dependencies.push({ name, version: String(version), type: 'production' });
          this.detectTechFromPackageName(name, frameworks, databases, authProviders, externalServices);
        }

        for (const [name, version] of Object.entries(devDeps)) {
          dependencies.push({ name, version: String(version), type: 'dev' });
          this.detectTechFromPackageName(name, frameworks, databases, authProviders, externalServices);
        }
      } catch (e) {
        // Corrupted package.json, fallback scan
      }
    }

    // 2. Scan file content for Python, Java, Go, etc.
    for (const f of files) {
      const content = f.content.toLowerCase();
      if (f.name === 'requirements.txt' || f.extension === '.py') {
        if (content.includes('django')) frameworks.add('Django');
        if (content.includes('flask')) frameworks.add('Flask');
        if (content.includes('fastapi')) frameworks.add('FastAPI');
        if (content.includes('psycopg2') || content.includes('sqlalchemy')) databases.add('PostgreSQL');
        if (content.includes('pymongo')) databases.add('MongoDB');
      }

      if (f.extension === '.java' || f.name === 'pom.xml') {
        if (content.includes('springframework') || content.includes('spring-boot')) frameworks.add('Spring Boot');
      }

      if (f.extension === '.go' || f.name === 'go.mod') {
        if (content.includes('gin-gonic')) frameworks.add('Gin');
        if (content.includes('fiber')) frameworks.add('Fiber');
      }

      // Detect DBs & Auth from code imports if not caught yet
      if (content.includes('firebase')) authProviders.add('Firebase Auth');
      if (content.includes('supabase')) authProviders.add('Supabase Auth');
      if (content.includes('@auth0') || content.includes('auth0')) authProviders.add('Auth0');
      if (content.includes('jsonwebtoken') || content.includes('jwt')) authProviders.add('JWT Auth');
      if (content.includes('next-auth')) authProviders.add('NextAuth.js');
      if (content.includes('mongoose') || content.includes('mongodb')) databases.add('MongoDB');
      if (content.includes('pg') || content.includes('postgres') || content.includes('prisma')) databases.add('PostgreSQL');
      if (content.includes('redis') || content.includes('ioredis')) databases.add('Redis');
      if (content.includes('mysql') || content.includes('mysql2')) databases.add('MySQL');
    }

    return {
      frameworks: Array.from(frameworks),
      languages: Array.from(languages),
      databases: Array.from(databases),
      authProviders: Array.from(authProviders),
      externalServices: Array.from(externalServices),
      dependencies
    };
  }

  private static detectTechFromPackageName(
    name: string,
    frameworks: Set<string>,
    databases: Set<string>,
    authProviders: Set<string>,
    externalServices: Set<string>
  ) {
    if (name === 'react' || name === 'react-dom') frameworks.add('React');
    if (name === 'next') frameworks.add('Next.js');
    if (name === 'express') frameworks.add('Express.js');
    if (name === 'vue') frameworks.add('Vue.js');
    if (name === 'nuxt') frameworks.add('Nuxt.js');
    if (name === '@angular/core') frameworks.add('Angular');
    if (name === 'svelte' || name === '@sveltejs/kit') frameworks.add('Svelte');
    if (name === 'tailwindcss') frameworks.add('Tailwind CSS');
    if (name === 'vite') frameworks.add('Vite');

    // Databases
    if (name === 'mongoose' || name === 'mongodb') databases.add('MongoDB');
    if (name === 'pg' || name === '@prisma/client') databases.add('PostgreSQL');
    if (name === 'redis' || name === 'ioredis') databases.add('Redis');
    if (name === 'mysql' || name === 'mysql2') databases.add('MySQL');
    if (name === 'sqlite3' || name === 'better-sqlite3') databases.add('SQLite');

    // Auth
    if (name === 'firebase' || name === 'firebase-admin') authProviders.add('Firebase Auth');
    if (name === 'next-auth') authProviders.add('NextAuth.js');
    if (name === 'jsonwebtoken') authProviders.add('JWT Auth');
    if (name === '@supabase/supabase-js') authProviders.add('Supabase Auth');

    // External Services
    if (name === 'axios') externalServices.add('HTTP Client (Axios)');
    if (name === 'stripe') externalServices.add('Stripe Payments');
    if (name === 'openai') externalServices.add('OpenAI API');
    if (name === '@google/generative-ai') externalServices.add('Gemini AI API');
  }
}
