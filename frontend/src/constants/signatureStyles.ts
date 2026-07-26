export interface SignatureStyle {
  id: string
  name: string
  fontFamily: string
  preview: string
}

export const SIGNATURE_STYLES: SignatureStyle[] = [
  { id: 'style-1', name: 'Classic Cursive', fontFamily: 'Dancing Script, cursive', preview: 'John Doe' },
  { id: 'style-2', name: 'Bold Signature', fontFamily: 'Pacifico, cursive', preview: 'John Doe' },
  { id: 'style-3', name: 'Elegant Script', fontFamily: 'Great Vibes, cursive', preview: 'John Doe' },
  { id: 'style-4', name: 'Modern Mono', fontFamily: 'Permanent Marker, cursive', preview: 'John Doe' },
]
