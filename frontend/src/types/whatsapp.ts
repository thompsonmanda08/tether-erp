export interface WhatsAppConfig {
  id?: string;
  phoneNumber: string;
  access_token: string;
  businessAccountId: string;
  webhookUrl?: string;
  active?: boolean;
}
