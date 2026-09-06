export type IntegrationFieldStatus = {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour: string | null;
};

export type PlatformBedrockStatus = {
  managedByEnv: boolean;
  envVars: string[];
  accessKeyId: { configured: boolean; source: "db" | "env" | null; lastFour: string | null };
  secretAccessKey: { configured: boolean; source: "db" | "env" | null; lastFour: string | null };
  hasSessionToken: boolean;
  region: { configured: boolean; value: string | null; source: "db" | "env" | null };
  model: { configured: boolean; value: string | null; source: "db" | "env" | null };
  configured: boolean;
  grantedOrganizations: Array<{ id: number; name: string }>;
};

export type PlatformIntegrationStatus = {
  stripe: {
    managedByEnv: boolean;
    envVars: string[];
    connectAvailable: boolean;
    connect: {
      connected: boolean;
      accountId: string | null;
      livemode: boolean | null;
      connectedAt: string | null;
      lastFour: string | null;
    };
    secretKey: IntegrationFieldStatus;
    webhookSecret: IntegrationFieldStatus;
    priceGrowthMonthly: { configured: boolean; value: string | null; source: "db" | "env" | null };
    priceScaleMonthly: { configured: boolean; value: string | null; source: "db" | "env" | null };
  };
  resend: {
    managedByEnv: boolean;
    envVars: string[];
    apiKey: IntegrationFieldStatus;
    fromEmail: { configured: boolean; value: string | null; source: "db" | "env" | null };
  };
  unsplash: {
    managedByEnv: boolean;
    envVars: string[];
    accessKey: IntegrationFieldStatus;
  };
  pexels: {
    managedByEnv: boolean;
    envVars: string[];
    apiKey: IntegrationFieldStatus;
  };
  linkedin: {
    managedByEnv: boolean;
    envVars: string[];
    clientId: { configured: boolean; value: string | null; source: "db" | "env" | null };
    clientSecret: IntegrationFieldStatus;
  };
  twitter: {
    managedByEnv: boolean;
    envVars: string[];
    clientId: { configured: boolean; value: string | null; source: "db" | "env" | null };
    clientSecret: IntegrationFieldStatus;
  };
  meta: {
    managedByEnv: boolean;
    envVars: string[];
    appId: { configured: boolean; value: string | null; source: "db" | "env" | null };
    appSecret: IntegrationFieldStatus;
  };
  bluesky: {
    managedByEnv: boolean;
    envVars: string[];
    clientName: { configured: boolean; value: string | null; source: "db" | "env" | null };
    privateKeyJwk: IntegrationFieldStatus;
  };
  bedrock: PlatformBedrockStatus;
};
