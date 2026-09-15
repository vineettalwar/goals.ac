declare module "next-auth/jwt" {
  export function encode(args: {
    token: Record<string, unknown>;
    secret: string;
    salt: string;
    maxAge: number;
  }): Promise<string>;

  export function getToken(args: {
    req: unknown;
    secret: string;
    secureCookie?: boolean;
  }): Promise<Record<string, unknown> | null>;
}
