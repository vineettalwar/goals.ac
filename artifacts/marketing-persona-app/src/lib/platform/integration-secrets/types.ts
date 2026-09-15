export type SaveStripeCredentialsInput = {
  secretKey?: string;
  webhookSecret?: string;
  priceGrowthMonthly?: string | null;
  priceScaleMonthly?: string | null;
  updatedBy: number;
};

export type SaveResendCredentialsInput = {
  apiKey?: string;
  fromEmail?: string | null;
  updatedBy: number;
};

export type SaveUnsplashCredentialsInput = {
  accessKey?: string;
  updatedBy: number;
};

export type SavePexelsCredentialsInput = {
  apiKey?: string;
  updatedBy: number;
};

export type SaveLinkedInCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

export type SaveTwitterCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

export type SaveMetaCredentialsInput = {
  appId?: string | null;
  appSecret?: string;
  updatedBy: number;
};

export type SaveBlueskyCredentialsInput = {
  clientName?: string | null;
  privateKeyJwk?: string;
  updatedBy: number;
};

export type SaveBingWebmasterCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};
