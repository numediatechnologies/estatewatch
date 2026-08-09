export interface ContactMessage {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  enquiry: string;
  message: string;
  website?: string;
}

export async function sendContactMessage(payload: ContactMessage): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: result.error || 'Your message could not be sent.' };
    return result;
  } catch {
    return { success: false, error: 'The contact service is unavailable. Please call or WhatsApp us.' };
  }
}
