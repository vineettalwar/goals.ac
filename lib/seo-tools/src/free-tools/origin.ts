export function originOf(url: string): string {
  return new URL(url).origin;
}
