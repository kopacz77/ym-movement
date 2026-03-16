declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_REDIRECT_URI?: string;
    TOKEN_ENCRYPTION_KEY?: string;
    INSTRUCTOR_EMAIL?: string;
    RESEND_API_KEY?: string;
    NEXT_PUBLIC_BASE_URL?: string;
    ENABLE_AUTH_BYPASS?: string;
    ANALYZE?: string;
  }
}
