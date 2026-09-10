export interface LeadLineItem {
  id: string;
  product_item: string;
  quantity: number;
  unit_price_estimate?: number;
  specifications?: string;
}

/**
 * Strips HTML comment JSON tags (e.g. <!-- LINE_ITEMS_JSON: ... -->)
 * and repetitive auto-generated Line Item blocks from raw specifications text.
 */
export function cleanSpecifications(rawSpecs?: string | null): string {
  if (!rawSpecs) return '';

  // 1. Remove JSON comment tag
  let clean = rawSpecs.replace(/<!-- LINE_ITEMS_JSON:[\s\S]*?-->/g, '').trim();

  // 2. If it contains auto-generated Line Item # text, extract General Terms & Notes if present, or clean up line item text
  if (clean.includes('General Terms & Notes:')) {
    const parts = clean.split('General Terms & Notes:');
    clean = parts[parts.length - 1].trim();
  } else if (clean.startsWith('Line Item #')) {
    // Strip out standard auto-generated Line Item # text blocks so raw text doesn't clutter user input
    clean = clean
      .replace(/Line Item #\d+:[^\n]*\n- Quantity:[^\n]*\n- Est\. Unit Price:[^\n]*\n- Specs:[^\n]*/gi, '')
      .replace(/Line Item #\d+:[^\n]*/gi, '')
      .trim();
  }

  return clean;
}

export function parseLineItemsFromLead(lead: {
  product_item: string;
  quantity: number;
  unit_price_estimate?: number | null;
  specifications?: string | null;
}): LeadLineItem[] {
  if (lead?.specifications && lead.specifications.includes('<!-- LINE_ITEMS_JSON:')) {
    try {
      const match = lead.specifications.match(/<!-- LINE_ITEMS_JSON:\s*([\s\S]*?)\s*-->/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse line items JSON:', e);
    }
  }

  // Fallback to single item from lead columns
  return [
    {
      id: '1',
      product_item: lead?.product_item || '',
      quantity: lead?.quantity || 1,
      unit_price_estimate: lead?.unit_price_estimate != null ? Number(lead.unit_price_estimate) : undefined,
      specifications: cleanSpecifications(lead?.specifications),
    },
  ];
}

export function formatLineItemsToPayload(items: LeadLineItem[], generalNotes: string = '') {
  if (!items || items.length === 0) {
    return {
      product_item: 'Unspecified Item',
      quantity: 1,
      unit_price_estimate: undefined,
      specifications: cleanSpecifications(generalNotes),
    };
  }

  const primary = items[0];
  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalVal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price_estimate) || 0),
    0
  );
  const avgUnitPrice = totalQty > 0 && totalVal > 0 ? totalVal / totalQty : primary.unit_price_estimate;

  const itemSummaryTitle =
    items.length === 1
      ? primary.product_item || 'Procurement Item'
      : `${primary.product_item || 'Item'} (+${items.length - 1} additional item${items.length > 2 ? 's' : ''})`;

  const formattedSpecsText = items
    .map(
      (it, idx) =>
        `Line Item #${idx + 1}: ${it.product_item || 'N/A'}\n- Quantity: ${it.quantity} unit(s)\n- Est. Unit Price: ${
          it.unit_price_estimate ? `₹${Number(it.unit_price_estimate).toLocaleString('en-IN')}` : 'TBD'
        }${it.specifications ? `\n- Specs: ${it.specifications}` : ''}`
    )
    .join('\n\n');

  const cleanGeneralNotes = cleanSpecifications(generalNotes);
  const jsonTag = `<!-- LINE_ITEMS_JSON: ${JSON.stringify(items)} -->`;
  const combinedSpecs = `${formattedSpecsText}${cleanGeneralNotes ? `\n\nGeneral Terms & Notes:\n${cleanGeneralNotes}` : ''}\n\n${jsonTag}`;

  return {
    product_item: itemSummaryTitle,
    quantity: totalQty > 0 ? totalQty : 1,
    unit_price_estimate: avgUnitPrice && avgUnitPrice > 0 ? avgUnitPrice : undefined,
    specifications: combinedSpecs,
  };
}

/**
 * Format line items & specifications cleanly for human-readable outputs (Email, WhatsApp, UI display)
 * without exposing raw HTML comments or JSON tags.
 */
export function formatReadableSpecifications(lead: {
  product_item: string;
  quantity: number;
  unit_price_estimate?: number | null;
  specifications?: string | null;
}): string {
  if (!lead) return 'Standard specifications';
  const items = parseLineItemsFromLead(lead);
  const cleanNotes = cleanSpecifications(lead.specifications);

  if (items.length === 1 && !lead.specifications?.includes('<!-- LINE_ITEMS_JSON:')) {
    return cleanNotes || lead.specifications || 'Standard specifications';
  }

  const lines = items.map((it, idx) => {
    let line = `${idx + 1}. ${it.product_item} (Qty: ${it.quantity})`;
    if (it.unit_price_estimate) {
      line += ` — Est. Price: ₹${Number(it.unit_price_estimate).toLocaleString('en-IN')}`;
    }
    if (it.specifications?.trim()) {
      line += `\n   Specs: ${it.specifications.trim()}`;
    }
    return line;
  });

  let result = lines.join('\n');
  if (cleanNotes) {
    result += `\n\nNotes / Terms:\n${cleanNotes}`;
  }

  return result;
}
