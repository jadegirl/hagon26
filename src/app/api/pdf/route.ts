export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const dataUrl = formData.get('dataUrl');
    const filename = formData.get('filename');

    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:application/pdf')) {
      return new Response('Invalid payload', { status: 400 });
    }

    const safeName =
      typeof filename === 'string' && filename.trim()
        ? filename.replace(/[\\/:*?"<>|]/g, '_')
        : 'contract.pdf';

    const base64 = dataUrl.split(',')[1] || '';
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Failed to generate PDF', { status: 500 });
  }
}

