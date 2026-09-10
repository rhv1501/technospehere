import { NextRequest, NextResponse } from 'next/server';
import { ensureLeadRfqPdfInSupabase } from '@/actions/rfqPdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isDownload = searchParams.get('download') === '1';

    const pdfResult = await ensureLeadRfqPdfInSupabase(id);

    if (!pdfResult.success || !pdfResult.buffer) {
      return NextResponse.json(
        { error: pdfResult.error || 'Failed to generate PDF' },
        { status: 500 }
      );
    }

    const dispositionType = isDownload ? 'attachment' : 'inline';
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set(
      'Content-Disposition',
      `${dispositionType}; filename="${pdfResult.fileName || 'RFQ.pdf'}"`
    );
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new NextResponse(new Uint8Array(pdfResult.buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('API Error streaming RFQ PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error generating PDF' },
      { status: 500 }
    );
  }
}
