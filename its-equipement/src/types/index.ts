export type QuoteRequestStatus = typeof import('@/constants').QUOTE_REQUEST_STATUS[keyof typeof import('@/constants').QUOTE_REQUEST_STATUS]
export type QuoteStatus = typeof import('@/constants').QUOTE_STATUS[keyof typeof import('@/constants').QUOTE_STATUS]
export type OrderStatus = typeof import('@/constants').ORDER_STATUS[keyof typeof import('@/constants').ORDER_STATUS]
export type PaymentStatus = typeof import('@/constants').PAYMENT_STATUS[keyof typeof import('@/constants').PAYMENT_STATUS]
export type PaymentType = typeof import('@/constants').PAYMENT_TYPE[keyof typeof import('@/constants').PAYMENT_TYPE]
export type DeliveryStatus = typeof import('@/constants').DELIVERY_STATUS[keyof typeof import('@/constants').DELIVERY_STATUS]
export type PaymentMethod = typeof import('@/constants').PAYMENT_METHOD[keyof typeof import('@/constants').PAYMENT_METHOD]
export type AdminRole = typeof import('@/constants').ADMIN_ROLE[keyof typeof import('@/constants').ADMIN_ROLE]
export type UploadEntityType = typeof import('@/constants').UPLOAD_ENTITY_TYPE[keyof typeof import('@/constants').UPLOAD_ENTITY_TYPE]
export type SettingType = typeof import('@/constants').SETTING_TYPE[keyof typeof import('@/constants').SETTING_TYPE]
export type NotificationStatus = typeof import('@/constants').NOTIFICATION_STATUS[keyof typeof import('@/constants').NOTIFICATION_STATUS]
export type NotificationChannel = typeof import('@/constants').NOTIFICATION_CHANNEL[keyof typeof import('@/constants').NOTIFICATION_CHANNEL]
export type NotificationType = typeof import('@/constants').NOTIFICATION_TYPE[keyof typeof import('@/constants').NOTIFICATION_TYPE]
export type StockMovementType = typeof import('@/constants').STOCK_MOVEMENT_TYPE[keyof typeof import('@/constants').STOCK_MOVEMENT_TYPE]
export type PersonalizationOptionType = typeof import('@/constants').PERSONALIZATION_OPTION_TYPE[keyof typeof import('@/constants').PERSONALIZATION_OPTION_TYPE]
export type AdminAction = typeof import('@/constants').ADMIN_ACTION[keyof typeof import('@/constants').ADMIN_ACTION]

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
