// Deklarasi minimal web-push 4 (paketnya belum menyertakan tipe).
declare module 'web-push' {
  export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } }
  export type SendResult = { statusCode: number; body: string; headers: Record<string, string> }
  export class WebPushError extends Error {
    statusCode: number
    body: string
    endpoint: string
  }
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  export function sendNotification(subscription: PushSubscription, payload?: string | Buffer, options?: { TTL?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high'; topic?: string }): Promise<SendResult>
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string }
}
