export const WEEK_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function eachDayInMonth(month: Date): Date[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1));
}

export function aiProviderUnavailableMessage(activeProvider: string): string {
  switch (activeProvider) {
    case "gemini":
      return "No Gemini API key configured. Add your key in Integrations → AI.";
    case "bedrock":
      return "AWS Bedrock is not configured. Add your credentials in Integrations → AI.";
    case "anthropic":
      return "No Anthropic API key configured. Add your key in Integrations → AI.";
    case "openai":
      return "No OpenAI API key configured. Add your key in Integrations → AI.";
    case "ollama":
      return "Ollama is not reachable. Start Ollama locally or update your Ollama URL in Integrations → AI.";
    default:
      return "No AI provider is configured. Check Integrations → AI.";
  }
}
