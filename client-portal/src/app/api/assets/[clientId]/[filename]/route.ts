import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function GET(
  request: Request,
  { params }: { params: { clientId: string; filename: string } }
) {
  try {
    const { clientId, filename } = await params
    const supabase = createClient()
    
    // Controleer authenticatie
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Controleer of de user toegang heeft tot deze client
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', clientId)
      .eq('email', user.email)
      .maybeSingle()
    
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Controleer of het bestand bestaat
    const filePath = path.join(__dirname, `../../../src/assets/clients/${clientId}/${filename}`)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Bepaal content type op basis van extensie
    const ext = path.extname(filename).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    }
    
    const contentType = contentTypes[ext] || 'application/octet-stream'
    
    // Lees en serveer het bestand
    const fileBuffer = fs.readFileSync(filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving asset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
