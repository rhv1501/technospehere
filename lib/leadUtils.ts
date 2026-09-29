export interface LeadLineItem {
  id: string;
  product_item: string;
  quantity: number;
  unit_price_estimate?: number;
  specifications?: string;
}

export interface EndUserDetails {
  company_name?: string;
  address?: string;
  contact_number?: string;
  email?: string;
  website?: string;
  phone_number?: string;
}

export function formatEndUserDetailsToComment(endUser?: EndUserDetails | null): string {
  if (!endUser) return '';
  const hasContent = Object.values(endUser).some((v) => v && typeof v === 'string' && v.trim());
  if (!hasContent) return '';
  return `<!-- END_USER_DETAILS: ${JSON.stringify(endUser)} -->`;
}

export function parseEndUserDetailsFromLead(lead?: { remarks?: string | null; specifications?: string | null } | null): EndUserDetails | null {
  if (!lead) return null;
  const rawText = (lead.remarks || '') + '\n' + (lead.specifications || '');
  if (rawText.includes('<!-- END_USER_DETAILS:')) {
    try {
      const match = rawText.match(/<!-- END_USER_DETAILS:\s*([\s\S]*?)\s*-->/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.error('Error parsing END_USER_DETAILS:', e);
    }
  }
  return null;
}

/**
 * Strips HTML comment JSON tags (e.g. <!-- LINE_ITEMS_JSON: ... -->)
 * and repetitive auto-generated Line Item blocks from raw specifications text.
 */
export function cleanSpecifications(rawSpecs?: string | null): string {
  if (!rawSpecs) return '';

  // 1. Remove JSON comment tags & CLOSURE_DATA blocks
  let clean = rawSpecs
    .replace(/<!-- LINE_ITEMS_JSON:[\s\S]*?-->/g, '')
    .replace(/<!-- END_USER_DETAILS:[\s\S]*?-->/g, '')
    .replace(/\[\[CLOSURE_DATA:[\s\S]*?\]\]/g, '')
    .trim();

  // 2. If it contains General Terms & Notes:
  if (clean.includes('General Terms & Notes:')) {
    const parts = clean.split('General Terms & Notes:');
    clean = parts[parts.length - 1].trim();
  } else if (clean.includes('Line Item #')) {
    const specMatches = Array.from(clean.matchAll(/- Specs:\s*([^\n]+)/gi));
    if (specMatches.length > 0) {
      clean = specMatches.map((m) => m[1].trim()).join('\n');
    } else {
      clean = clean
        .replace(/Line Item #\d+:[^\n]*/gi, '')
        .replace(/- Quantity:[^\n]*/gi, '')
        .replace(/- Specs:[^\n]*/gi, '')
        .trim();
    }
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
          return parsed.map((item: any, idx: number) => ({
            id: item.id || String(idx + 1),
            product_item: item.product_item || lead.product_item || '',
            quantity: item.quantity || lead.quantity || 1,
            unit_price_estimate: item.unit_price_estimate,
            specifications: item.specifications || '',
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse line items JSON:', e);
    }
  }

  // Legacy parser if "Line Item #" blocks exist in text without JSON tag
  if (lead?.specifications && lead.specifications.includes('Line Item #')) {
    const raw = lead.specifications;
    const blocks = raw.split(/Line Item #\d+:/g).filter((b) => b.trim());
    if (blocks.length > 0) {
      const items: LeadLineItem[] = [];
      blocks.forEach((block, idx) => {
        const lines = block.split('\n');
        const title = lines[0]?.trim() || lead.product_item || 'Item Requirement';
        let qty = 1;
        let specs = '';

        const qtyMatch = block.match(/- Quantity:\s*(\d+)/i);
        if (qtyMatch) qty = parseInt(qtyMatch[1]);

        const specsMatch = block.match(/- Specs:\s*([\s\S]*?)(?=(Line Item #|General Terms|$))/i);
        if (specsMatch) specs = specsMatch[1].trim();

        items.push({
          id: String(idx + 1),
          product_item: cleanProductTitle(title),
          quantity: qty,
          specifications: specs,
        });
      });
      if (items.length > 0) return items;
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

/**
 * Cleans product item string by removing automated "(+X additional items)" suffixes.
 */
export function cleanProductTitle(rawTitle?: string | null): string {
  if (!rawTitle) return 'Unspecified Item';
  return rawTitle
    .replace(/\s*\(\+\d+\s+additional\s+items?\)/gi, '')
    .replace(/\s*\(\+\d+\s+more\s+items?\)/gi, '')
    .trim();
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

  const itemSummaryTitle = cleanProductTitle(primary.product_item) || 'Procurement Item';

  const formattedSpecsText = items
    .map(
      (it, idx) =>
        `Line Item #${idx + 1}: ${it.product_item || 'N/A'}\n- Quantity: ${it.quantity} unit(s)${it.specifications ? `\n- Specs: ${it.specifications}` : ''}`
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
 * Formats a clean summary string of line items with quantities for header/summary blocks.
 */
export function formatLineItemsSummaryText(lead: {
  product_item: string;
  quantity: number;
  unit_price_estimate?: number | null;
  specifications?: string | null;
}): string {
  if (!lead) return 'N/A';
  const items = parseLineItemsFromLead(lead);

  if (items.length === 1 && !lead.specifications?.includes('<!-- LINE_ITEMS_JSON:')) {
    const item = items[0];
    const cleanTitle = cleanProductTitle(item.product_item || lead.product_item);
    const qty = item.quantity || lead.quantity || 1;
    return `${cleanTitle} (${qty} unit${qty > 1 ? 's' : ''})`;
  }

  return items
    .map((it, idx) => {
      const cleanTitle = cleanProductTitle(it.product_item);
      const qty = it.quantity || 1;
      return `${idx + 1}. ${cleanTitle} — ${qty} unit${qty > 1 ? 's' : ''}`;
    })
    .join('\n');
}

export function formatReadableSpecifications(lead: {
  product_item: string;
  quantity: number;
  unit_price_estimate?: number | null;
  specifications?: string | null;
  remarks?: string | null;
}): string {
  if (!lead) return 'Standard specifications';
  const items = parseLineItemsFromLead(lead);

  const lines = items.map((it, idx) => {
    const cleanTitle = cleanProductTitle(it.product_item);
    const qty = it.quantity || 1;
    let itemSpec = it.specifications?.trim() || '';
    if (!itemSpec && items.length === 1 && lead.specifications) {
      itemSpec = cleanSpecifications(lead.specifications);
    }

    let line = `#${idx + 1}. ${cleanTitle}\n   Quantity: ${qty} unit${qty > 1 ? 's' : ''}`;
    if (itemSpec) {
      line += `\n   Technical Specifications:\n   ${itemSpec.split('\n').join('\n   ')}`;
    }
    return line;
  });

  let result = lines.join('\n\n');
  const cleanNotes = cleanSpecifications(lead.remarks);
  if (cleanNotes) {
    result += `\n\nGeneral Remarks & Terms:\n${cleanNotes}`;
  }

  return result;
}

export function generateRfqEmailHtml(params: {
  lead: any;
  vendor: any;
  settings?: any;
  supabaseUrl: string;
  rfqFileName: string;
}): string {
  const { lead, vendor, settings, supabaseUrl, rfqFileName } = params;

  const poReference = lead.lead_name?.trim() || lead.lead_number || 'N/A';
  const createdDate = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const categoryName = lead.categories?.name || 'General Procurement';
  const companyName = settings?.company_name || 'TECHNOSPHERE BUSINESS SOLUTIONS';
  const companyAddress = settings?.office_address || settings?.company_address || '123 Enterprise Park, Tech Hub, Bangalore 560001';
  const companyEmail = settings?.official_email || 'sales@technosphere.in';
  const companyPhone = settings?.phone_number || settings?.official_phone || '+91 98765 43210';

  const lineItems = parseLineItemsFromLead(lead);
  const expectedCredit = lead.expected_credit?.trim() || '';
  const generalRemarks = cleanSpecifications(lead.remarks);

  const otherAttachments = (lead.lead_attachments || []).filter((att: any) => !att.file_name?.startsWith('RFQ_'));

  const itemsRowsHtml = lineItems
    .map((item, idx) => {
      const itemQty = Number(item.quantity) || 1;
      const title = cleanProductTitle(item.product_item) || 'Item Requirement';
      let itemSpec = item.specifications?.trim() || '';
      if (!itemSpec && lineItems.length === 1 && lead.specifications) {
        itemSpec = cleanSpecifications(lead.specifications);
      }

      const specHtml = itemSpec
        ? `<div style="margin-top: 10px; padding: 12px 14px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.6;">
            <strong style="color: #4338CA; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 6px;">Technical Specifications:</strong>
            <div style="white-space: pre-wrap; font-family: inherit; font-size: 13px; color: #334155; line-height: 1.6;">${itemSpec.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
           </div>`
        : '';

      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

      return `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 16px 18px; text-align: center; vertical-align: top; font-weight: bold; color: #64748B; font-size: 14px;">${idx + 1}</td>
          <td style="padding: 16px 18px; vertical-align: top;">
            <div style="font-weight: 700; color: #0F172A; font-size: 15px; line-height: 1.4;">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            ${specHtml}
          </td>
          <td style="padding: 16px 18px; text-align: right; vertical-align: top; font-weight: 700; color: #1E293B; font-size: 14px;" class="item-qty-cell">
            ${itemQty} unit${itemQty > 1 ? 's' : ''}
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Quotation Request - ${poReference}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-wrapper {
        padding: 12px 6px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 8px !important;
      }
      .header-banner {
        padding: 24px 20px !important;
      }
      .header-flex-table, .header-flex-table tr, .header-flex-table td {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }
      .badge-cell {
        margin-top: 14px !important;
        text-align: left !important;
      }
      .body-content {
        padding: 24px 18px !important;
      }
      .meta-grid-table {
        display: block !important;
      }
      .meta-grid-tr {
        display: block !important;
      }
      .meta-grid-td {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        border-right: none !important;
        border-bottom: 1px solid #E2E8F0 !important;
        padding: 14px 16px !important;
      }
      .meta-grid-td:last-child {
        border-bottom: none !important;
      }
      .card-box {
        padding: 18px 16px !important;
      }
      .item-qty-cell {
        white-space: normal !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color: #F1F5F9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 640px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-banner" style="background-color: #0F172A; padding: 32px 36px; border-top: 5px solid #4338CA;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" class="header-flex-table">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.3;">${companyName}</div>
                    <div style="color: #94A3B8; font-size: 12px; margin-top: 6px; font-weight: 500;">Enterprise Procurement Network</div>
                  </td>
                  <td align="right" style="vertical-align: middle;" class="badge-cell">
                    <div style="background-color: #4338CA; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 8px 14px; border-radius: 6px; display: inline-block; letter-spacing: 0.8px; text-transform: uppercase;">
                      REQUEST FOR QUOTATION
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="body-content" style="padding: 36px 36px;">
              
              <!-- Greeting & Opening -->
              <div style="font-size: 15px; color: #334155; margin-bottom: 28px; line-height: 1.7;">
                Dear <strong style="color: #0F172A;">${vendor.contact_person || vendor.company_name}</strong>,
                <p style="margin: 8px 0 0 0; color: #475569;">We request your official quotation for the following procurement requirement:</p>
              </div>

              <!-- Metadata Summary Grid -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" class="meta-grid-table" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 28px;">
                <tr class="meta-grid-tr">
                  <td width="33%" class="meta-grid-td" style="padding: 16px 20px; border-right: 1px solid #E2E8F0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px;">Date Issued</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 4px;">${createdDate}</div>
                  </td>
                  <td width="33%" class="meta-grid-td" style="padding: 16px 20px; border-right: 1px solid #E2E8F0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px;">PO Reference No</div>
                    <div style="font-size: 14px; font-weight: 800; color: #4338CA; margin-top: 4px;">${poReference}</div>
                  </td>
                  <td width="34%" class="meta-grid-td" style="padding: 16px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px;">Category</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0F172A; margin-top: 4px;">${categoryName}</div>
                  </td>
                </tr>
              </table>

              <!-- RFQ Requested By Card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" class="card-box" style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 10px; margin-bottom: 32px; padding: 18px 22px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase; letter-spacing: 0.6px;">RFQ Requested By</div>
                    <div style="font-size: 15px; font-weight: 800; color: #1E293B; margin-top: 6px;">${companyName}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 4px; line-height: 1.5;">${companyAddress}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 4px;">Email: <strong style="color: #1E293B;">${companyEmail}</strong> &nbsp;|&nbsp; Phone: <strong style="color: #1E293B;">${companyPhone}</strong></div>
                  </td>
                </tr>
              </table>

              <!-- Section Title -->
              <div style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; border-left: 4px solid #4338CA; padding-left: 10px;">
                Bills of Material
              </div>

              <!-- Line Items Table -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 32px;">
                <thead>
                  <tr style="background-color: #1E293B; color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th width="44" style="padding: 12px 14px; text-align: center;">#</th>
                    <th style="padding: 12px 14px; text-align: left;">Product Description & Specifications</th>
                    <th width="100" style="padding: 12px 14px; text-align: right;" class="table-header-qty">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml}
                </tbody>
              </table>

              ${
                expectedCredit
                  ? `<!-- Expected Credit Card -->
              <div class="card-box" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 8px; padding: 18px 22px; margin-bottom: 32px;">
                <div style="font-size: 11px; font-weight: 800; color: #15803D; text-transform: uppercase; letter-spacing: 0.6px;">Expected Credit Terms:</div>
                <div style="font-size: 14px; color: #166534; font-weight: 700; margin-top: 6px; white-space: pre-wrap;">${expectedCredit.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>`
                  : ''
              }

              ${
                generalRemarks
                  ? `<!-- General Remarks Card -->
              <div class="card-box" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px 22px; margin-bottom: 32px;">
                <div style="font-size: 11px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 0.6px;">General Remarks & Terms:</div>
                <div style="font-size: 14px; color: #78350F; margin-top: 8px; line-height: 1.6; white-space: pre-wrap;">${generalRemarks.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>`
                  : ''
              }

              <!-- Quotation Guidelines Card -->
              <div class="card-box" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px 22px; margin-bottom: 32px;">
                <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">Quotation Submission Guidelines:</div>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.7;">
                  <li style="margin-bottom: 4px;">Please submit net unit pricing.</li>
                  <li style="margin-bottom: 4px;">Indicate stock availability and dispatch timeline.</li>
                  <li>Quotations should remain valid for a minimum of 15 days from submission.</li>
                </ol>
              </div>

              <!-- Attachment Callout Banner -->
              <div class="card-box" style="background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 10px; padding: 22px 24px; text-align: center; margin-bottom: 32px;">
                <div style="font-size: 14px; font-weight: 800; color: #1E293B;">
                  📄 Official RFQ Document Attached
                </div>
                <div style="font-size: 13px; color: #64748B; margin-top: 6px; line-height: 1.5;">
                  The official Request for Quotation (RFQ) PDF document (<strong style="color: #0F172A;">${rfqFileName}</strong>) is attached directly to this email.
                </div>
                ${
                  otherAttachments.length > 0
                    ? `<div style="margin-top: 14px; font-size: 13px; color: #475569; text-align: left; border-top: 1px solid #E2E8F0; padding-top: 12px;">
                        <strong style="color: #1E293B;">Other Attached Specification Files:</strong>
                        <ul style="margin: 6px 0 0 0; padding-left: 20px; line-height: 1.6;">
                          ${otherAttachments.map((att: any) => `<li><a href="${supabaseUrl}/storage/v1/object/public/lead-attachments/${att.file_path}" style="color: #4338CA; text-decoration: underline; font-weight: 600;">${att.file_name}</a></li>`).join('')}
                        </ul>
                       </div>`
                    : ''
                }
              </div>

              <!-- Signature Footer -->
              <div style="border-top: 1px solid #E2E8F0; padding-top: 24px; margin-top: 32px; font-size: 14px; color: #475569; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #0F172A; font-size: 15px;">${settings?.smtp_from_name || 'Procurement Department'}</strong><br>
                <span style="color: #64748B; font-size: 13px;">${companyName}</span>
              </div>
            </td>
          </tr>

          <!-- Muted Email Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 18px 36px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #94A3B8;">
              This is an automated procurement request issued by ${companyName}.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

