
export function isRateLimitError(error: any): boolean {
  if (error?.error?.status === 'RESOURCE_EXHAUSTED' || error?.error?.code === 429) {
    return true;
  }
  if (error instanceof Error && (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota'))) {
    return true;
  }
  return false;
}

export function generatePlaceholderAvatar(id: string, name: string): string {
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return h;
  };
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
    "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef"
  ];
  const color = colors[Math.abs(hash(id)) % colors.length];
  const initial = (name ? name.trim().charAt(0) : 'C').toUpperCase();
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="${color}" />
  <text x="50%" y="50%" font-family="'Cairo', 'Inter', sans-serif" font-size="50" fill="white" text-anchor="middle" dominant-baseline="central">${initial}</text>
</svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function dataUriToGeminiPart(dataUri: string): { inlineData: { mimeType: string; data: string } } | null {
    const parts = dataUri.split(',');
    if (parts.length < 2) {
        console.error("Malformed data URI for image attachment.");
        return null;
    }
    const meta = parts[0];
    const data = parts[1];
    const mimeTypeMatch = meta?.match(/:(.*?);/);
    
    if (!mimeTypeMatch || !mimeTypeMatch[1] || !data) {
        console.error("Could not extract mimeType and data from data URI.");
        return null;
    }

    return {
        inlineData: {
            mimeType: mimeTypeMatch[1],
            data: data
        }
    };
}
