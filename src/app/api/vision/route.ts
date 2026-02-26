import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Vision AI API route for receipt analysis.
 * Receives an image URL (from Firebase Storage), calls Vision API,
 * and returns parsed amount and date from the receipt.
 */
export async function POST(req: NextRequest) {
    try {
        const { imageUrl } = await req.json();
        if (!imageUrl) {
            return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_VISION_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Vision API key not configured' }, { status: 500 });
        }

        const visionRes = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        {
                            image: { source: { imageUri: imageUrl } },
                            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
                        },
                    ],
                }),
            }
        );

        if (!visionRes.ok) {
            const err = await visionRes.text();
            return NextResponse.json({ error: 'Vision API error', details: err }, { status: 500 });
        }

        const visionData = await visionRes.json();
        const fullText: string =
            visionData.responses?.[0]?.textAnnotations?.[0]?.description ?? '';

        // Parse amount (R$ XX,XX or XX.XX)
        const amountMatches = fullText.match(/R\$\s*(\d{1,6}[.,]\d{2})/gi);
        let amount: number | null = null;
        if (amountMatches && amountMatches.length > 0) {
            // Take the largest amount (often the total)
            const amounts = amountMatches.map((m) => {
                const num = m.replace(/R\$\s*/, '').replace(',', '.');
                return parseFloat(num);
            });
            amount = Math.max(...amounts);
        }

        // Parse date (DD/MM/YYYY)
        const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
        const date = dateMatch?.[0] ?? null;

        return NextResponse.json({ amount, date, fullText: fullText.slice(0, 500) });
    } catch (error) {
        console.error('Vision API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
