import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    sessionToken?: string;
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      createdAt?: string;
      role?: string;
    };
  }
  interface User {
    sessionToken?: string;
    createdAt?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionToken?: string;
    createdAt?: string;
    role?: string;
  }
}
