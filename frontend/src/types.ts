export interface User {
  id: string
  name: string
  email: string
  initials: string
  nik: string
  verified: boolean
  avatarColor: string
  role: string
  accessRole: 'user' | 'manager' | 'supervisor'
  external?: boolean
}

export interface AuditLogEntry {
  id: string
  event: string
  user: User | null
  timestamp: Date | string
  ip: string
  documentId?: string
  documentName?: string
  metadata?: {
    certId?: string
    algorithm?: string
    baselineHash?: string
    reason?: string
    action?: string
  }
}

export interface Marker {
  id: string
  x: number
  y: number
  width: number
  height: number
  page: number
  type: 'signature' | 'initials' | 'date' | 'text'
  assignedTo: User
  signed: boolean
  signedAt?: Date | string
  signature?: string
  metadata?: {
    signerId?: string
    signerEmail?: string
    timestamp?: string
    ip?: string
    certId?: string
    algorithm?: string
    baselineHash?: string
  }
}

export interface Document {
  id: string
  name: string
  category: string
  size: string
  status: 'pending_supervisor' | 'pending_manager' | 'signed' | 'draft' | 'rejected' | 'locked'
  sender: User
  recipients: User[]
  uploadedAt: Date | string
  updatedAt: Date | string
  baselineHash?: string
  markers: Marker[]
  auditLog: AuditLogEntry[]
  downloadUrl?: string
  pageCount?: number
}

export type UserRole = 'user' | 'supervisor' | 'manager'

export interface AppState {
  currentUser: User | null
  isAuthenticated: boolean
  mfaVerified: boolean
  dukcapilVerified: boolean
}

export interface SignatureData {
  type: 'draw' | 'upload' | 'style'
  dataUrl: string
  styleName?: string
}

export interface VerificationResult {
  valid: boolean
  documentName: string
  storedHash: string
  computedHash: string
  signers: Array<{
    user: User
    signedAt: string
    certId: string
    ip: string
    valid: boolean
  }>
  tamperedAt?: string
}
