export function queueOpportunityErrorMessage(error?: string): string {
  if (!error) return "Failed to queue";
  if (error.includes("No content strategy")) {
    return "Generate a 30-day content strategy first, then queue this idea.";
  }
  if (error.includes("Access denied")) {
    return "You do not have permission to queue ideas for this project.";
  }
  return error;
}
