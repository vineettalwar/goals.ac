export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const TONE_PRESETS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "conversational", label: "Conversational" },
] as const;

export const READING_LEVELS = [
  { value: "general", label: "General (accessible to everyone)" },
  { value: "intermediate", label: "Intermediate (assumes some domain knowledge)" },
  { value: "expert", label: "Expert (deep technical audience)" },
] as const;

export const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch",
  "Swedish", "Norwegian", "Danish", "Polish", "Japanese", "Korean",
  "Chinese (Simplified)", "Chinese (Traditional)",
];

export const WORD_COUNT_PRESETS = [
  { label: "Short", value: 400 },
  { label: "Medium", value: 800 },
  { label: "Long", value: 1500 },
];

export const TIMEZONE_OPTIONS = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

export const RUN_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${hour.toString().padStart(2, "0")}:00`,
}));

export const DEFAULT_AUTOPILOT = {
  enabled: false,
  cadence: "daily" as const,
  timezone: "UTC",
  publishMode: "draft" as const,
  preferredRunHour: 9,
  autoQueueOpportunities: true,
  opportunityScoreThreshold: 60,
};

export const DEFAULT_VISIBILITY = {
  llmTrackingEnabled: false,
  geoReauditEnabled: false,
};
