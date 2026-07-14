import { z } from "zod";

export const goalSchema = z.object({
  objective: z.enum(["traffic", "leads", "sales", "authority"]),
  targetMetric: z.string().min(5, "Describe what success looks like"),
});

export const schema = z.object({
  name: z.string().min(1, "Company name is required"),
  websiteUrl: z.string().url("Enter a valid URL (include https://)"),
  industry: z.string().min(1, "Select an industry"),
  description: z.string().min(20, "Describe your company in a few sentences"),
  targetAudience: z.string().min(20, "Describe who your customers are"),
  primaryLanguage: z.string().min(2).optional(),
});

export type FormData = z.infer<typeof schema>;

export const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "Healthcare",
  "Finance / Fintech",
  "Education",
  "Marketing / Agency",
  "Real Estate",
  "Legal",
  "Consulting",
  "Logistics / Supply Chain",
  "Manufacturing",
  "Non-profit",
  "Other",
] as const;

export type GoalIntent = {
  objective: "traffic" | "leads" | "sales" | "authority";
  targetMetric: string;
};
