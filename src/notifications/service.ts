/**
 * Notification service — sends email notifications for expense events.
 * In this demo the service is mocked (no real email sent).
 * All methods return a simulated success result.
 */

export type NotificationEvent =
  | 'expense_submitted'
  | 'expense_approved'
  | 'expense_rejected'
  | 'expense_paid';

export interface NotificationResult {
  sent: boolean;
  to: string;
  event: NotificationEvent;
  timestamp: Date;
}

const TEMPLATES: Record<NotificationEvent, (data: Record<string, string>) => string> = {
  expense_submitted: (d) =>
    `Hello ${d.approverName}, ${d.employeeName} submitted expense "${d.description}" for $${d.amount}. Please review.`,
  expense_approved: (d) =>
    `Hello ${d.employeeName}, your expense "${d.description}" of $${d.amount} has been approved.`,
  expense_rejected: (d) =>
    `Hello ${d.employeeName}, your expense "${d.description}" of $${d.amount} was rejected. Reason: ${d.reason ?? 'No reason given'}.`,
  expense_paid: (d) =>
    `Hello ${d.employeeName}, your expense "${d.description}" of $${d.amount} has been paid.`,
};

export class NotificationService {
  private sent: NotificationResult[] = [];

  async send(
    to: string,
    event: NotificationEvent,
    data: Record<string, string>,
  ): Promise<NotificationResult> {
    const message = TEMPLATES[event](data);
    // In production: call SendGrid / SES / SMTP here
    console.log(`[NotificationService] Email to ${to}: ${message}`);

    const result: NotificationResult = {
      sent: true,
      to,
      event,
      timestamp: new Date(),
    };
    this.sent.push(result);
    return result;
  }

  getSentNotifications(): NotificationResult[] {
    return [...this.sent];
  }

  clearSent(): void {
    this.sent = [];
  }
}

export const notificationService = new NotificationService();
