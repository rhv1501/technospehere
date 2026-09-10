import PDFDocument from 'pdfkit';
import { parseLineItemsFromLead, cleanSpecifications, cleanProductTitle } from '@/lib/leadUtils';

export async function generateRfqPdf(lead: any, settings?: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        bufferPages: true,
        info: {
          Title: `RFQ_${lead.lead_number || 'DOCUMENT'}`,
          Author: settings?.company_name || 'TechnoSphere Business Solutions',
          Subject: `Request for Quotation - ${lead.product_item || 'Procurement'}`,
          Keywords: 'RFQ, Quotation, Procurement, TechnoSphere',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const companyName = settings?.company_name || 'TECHNOSPHERE BUSINESS SOLUTIONS';
      const companyAddress = settings?.company_address || '123 Enterprise Park, Tech Hub, Bangalore 560001';
      const companyEmail = settings?.official_email || 'sales@technosphere.in';
      const companyPhone = settings?.official_phone || '+91 98765 43210';
      const companyGst = settings?.gst_number || '29AAAAA0000A1Z5';

      // Design Color Palette
      const darkNavy = '#0F172A'; // Header BG
      const primaryColor = '#1E293B'; // Text / Dark Elements
      const indigoAccent = '#4338CA'; // Primary Brand Accent
      const indigoLight = '#EEF2FF'; // Light Badge BG
      const lightBg = '#F8FAFC'; // Card BG
      const borderColor = '#E2E8F0'; // Borders
      const textColor = '#334155'; // Main Body Text
      const textMuted = '#64748B'; // Labels / Subtitles
      const amberBg = '#FFFBEB'; // Remarks BG
      const amberBorder = '#F59E0B'; // Remarks Border
      const amberText = '#B45309'; // Remarks Text

      const pageWidth = doc.page.width; // 595.28 pt
      const pageHeight = doc.page.height; // 841.89 pt
      const margin = 36;
      const contentWidth = pageWidth - margin * 2; // 523.28 pt

      // Helper function for section headings with accent pill
      const drawSectionHeader = (title: string, yPos: number) => {
        // Vertical accent pill
        doc.roundedRect(margin, yPos, 4, 14, 2).fill(indigoAccent);
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), margin + 12, yPos + 1, { characterSpacing: 0.5 });
      };

      // Helper to check page overflow and insert page break cleanly
      const checkPageBreak = (neededHeight: number) => {
        if (doc.y + neededHeight > pageHeight - 60) {
          doc.addPage();
          drawPageHeaderMini();
          doc.y = margin + 45;
        }
      };

      const drawPageHeaderMini = () => {
        doc.rect(margin, margin, contentWidth, 28).fill(darkNavy);
        doc
          .fillColor('#FFFFFF')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(companyName, margin + 10, margin + 9)
          .fillColor('#94A3B8')
          .font('Helvetica')
          .text(`RFQ Ref: ${lead.lead_number}`, margin + contentWidth - 140, margin + 9, { align: 'right', width: 130 });
      };

      // ----------------------------------------------------
      // 1. MAIN EXECUTIVE HEADER BANNER
      // ----------------------------------------------------
      const headerHeight = 78;
      doc.roundedRect(margin, margin, contentWidth, headerHeight, 8).fill(darkNavy);

      // Top Indigo Decorative Accent Line
      doc.roundedRect(margin, margin, contentWidth, 5, 2).fill(indigoAccent);

      // Company Title & Tagline
      doc
        .fillColor('#FFFFFF')
        .fontSize(15)
        .font('Helvetica-Bold')
        .text(companyName, margin + 18, margin + 18, { width: 310 });

      doc
        .fillColor('#94A3B8')
        .fontSize(8.5)
        .font('Helvetica')
        .text('Enterprise Procurement & Vendor Management Network', margin + 18, margin + 38);

      doc
        .fillColor('#CBD5E1')
        .fontSize(8)
        .font('Helvetica')
        .text(`Email: ${companyEmail}  •  Phone: ${companyPhone}`, margin + 18, margin + 53);

      // Right RFQ Title Badge Card
      const badgeW = 160;
      const badgeH = 50;
      const badgeX = margin + contentWidth - badgeW - 14;
      const badgeY = margin + 14;

      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fill(indigoAccent);

      doc
        .fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('REQUEST FOR QUOTATION', badgeX + 5, badgeY + 11, { width: badgeW - 10, align: 'center', characterSpacing: 0.5 });

      doc
        .fillColor('#E0E7FF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`RFQ ID: ${lead.lead_number}`, badgeX + 5, badgeY + 28, { width: badgeW - 10, align: 'center' });

      doc.y = margin + headerHeight + 12;

      // ----------------------------------------------------
      // 2. DOCUMENT METADATA BAR
      // ----------------------------------------------------
      const metaY = doc.y;
      const metaH = 34;

      doc.roundedRect(margin, metaY, contentWidth, metaH, 6).fill(lightBg).stroke(borderColor);

      const createdDate = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const dueDate = lead.due_date
        ? new Date(lead.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Immediate / ASAP';

      const categoryName = lead.categories?.name || 'General Requirement';
      const statusText = (lead.status || 'Draft').replace(/_/g, ' ').toUpperCase();

      // Column 1: Date Issued
      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('DATE ISSUED', margin + 12, metaY + 7)
        .fillColor(primaryColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(createdDate, margin + 12, metaY + 18);

      // Column 2: Due Date
      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('REQUIRED DUE DATE', margin + 130, metaY + 7)
        .fillColor('#DC2626')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(dueDate, margin + 130, metaY + 18);

      // Column 3: Category
      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('CATEGORY', margin + 260, metaY + 7)
        .fillColor(primaryColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(categoryName, margin + 260, metaY + 18, { width: 140, ellipsis: true });

      // Column 4: Status Pill
      const statusBadgeW = 85;
      const statusBadgeX = margin + contentWidth - statusBadgeW - 12;
      doc.roundedRect(statusBadgeX, metaY + 8, statusBadgeW, 18, 9).fill(indigoLight).stroke('#C7D2FE');

      doc
        .fillColor(indigoAccent)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text(statusText, statusBadgeX, metaY + 13, { width: statusBadgeW, align: 'center' });

      doc.y = metaY + metaH + 14;

      // ----------------------------------------------------
      // 3. BUYER vs PROJECT REFERENCE CARDS
      // ----------------------------------------------------
      const infoY = doc.y;
      const cardW = (contentWidth - 12) / 2;
      const cardH = 76;

      // Left Box: Issuing Office
      doc.roundedRect(margin, infoY, cardW, cardH, 6).fill(lightBg).stroke(borderColor);
      doc
        .fillColor(indigoAccent)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('ISSUING PROCUREMENT OFFICE', margin + 12, infoY + 10, { characterSpacing: 0.5 });

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(companyName, margin + 12, infoY + 24, { width: cardW - 24, ellipsis: true })
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(companyAddress, margin + 12, infoY + 37, { width: cardW - 24, height: 22, ellipsis: true })
        .fillColor(textMuted)
        .fontSize(7.5)
        .text(`GSTIN: ${companyGst}`, margin + 12, infoY + 60);

      // Right Box: Customer & Project Reference
      const rightCardX = margin + cardW + 12;
      doc.roundedRect(rightCardX, infoY, cardW, cardH, 6).fill(lightBg).stroke(borderColor);
      doc
        .fillColor(indigoAccent)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('CLIENT & PROJECT REFERENCE', rightCardX + 12, infoY + 10, { characterSpacing: 0.5 });

      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Customer / End User:', rightCardX + 12, infoY + 26)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(lead.customer_name || 'N/A', rightCardX + 105, infoY + 26, { width: cardW - 117, ellipsis: true })
        .fillColor(textMuted)
        .font('Helvetica-Bold')
        .text('Project / PO Name:', rightCardX + 12, infoY + 41)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text(lead.lead_name || 'N/A', rightCardX + 105, infoY + 41, { width: cardW - 117, ellipsis: true })
        .fillColor(textMuted)
        .font('Helvetica-Bold')
      const lineItemsList = parseLineItemsFromLead(lead);
      const cleanPrimary = cleanProductTitle(lineItemsList[0]?.product_item || lead.product_item);
      const itemBadge = lineItemsList.length > 1 ? ` (${lineItemsList.length} items total)` : '';

      doc
        .fillColor(textMuted)
        .font('Helvetica-Bold')
        .text('Primary Item:', rightCardX + 12, infoY + 56)
        .fillColor(indigoAccent)
        .font('Helvetica-Bold')
        .text(`${cleanPrimary}${itemBadge}`, rightCardX + 105, infoY + 56, { width: cardW - 117, ellipsis: true });

      doc.y = infoY + cardH + 16;

      // ----------------------------------------------------
      // 4. ITEMS & QUANTITIES SCHEDULE TABLE
      // ----------------------------------------------------
      drawSectionHeader('1. ITEM REQUIREMENT & PRICE SCHEDULE', doc.y);
      doc.y += 20;

      const tableTop = doc.y;
      const colNoW = 28;
      const colDescW = 225;
      const colQtyW = 55;
      const colPriceW = 80;
      const colGstW = 50;
      const colTotalW = 85;

      const colNoX = margin + 8;
      const colDescX = margin + colNoW + 8;
      const colQtyX = colDescX + colDescW;
      const colPriceX = colQtyX + colQtyW;
      const colGstX = colPriceX + colPriceW;
      const colTotalX = colGstX + colGstW;

      // Table Header Row
      const thH = 22;
      doc.roundedRect(margin, tableTop, contentWidth, thH, 4).fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('#', colNoX, tableTop + 6)
        .text('Product / Item Description', colDescX, tableTop + 6)
        .text('Qty', colQtyX, tableTop + 6, { width: colQtyW - 10, align: 'right' })
        .text('Est. Unit Price', colPriceX, tableTop + 6, { width: colPriceW - 10, align: 'right' })
        .text('GST %', colGstX, tableTop + 6, { width: colGstW - 10, align: 'center' })
        .text('Est. Total (INR)', colTotalX, tableTop + 6, { width: colTotalW - 10, align: 'right' });

      let currentY = tableTop + thH;
      const lineItems = parseLineItemsFromLead(lead);
      let grandTotalEst = 0;

      const formatPdfMoney = (amt?: number) => {
        if (!amt || isNaN(amt) || amt <= 0) return 'TBD';
        return `INR ${Number(amt).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      lineItems.forEach((item, index) => {
        const itemQty = Number(item.quantity) || 1;
        const unitPrice = item.unit_price_estimate ? Number(item.unit_price_estimate) : 0;
        const lineTotal = itemQty * unitPrice;
        grandTotalEst += lineTotal;

        // Dynamic row height based on item description
        const descText = item.product_item || 'Item Requirement';
        doc.fontSize(8);
        const descH = Math.max(22, doc.heightOfString(descText, { width: colDescW - 10 }) + 10);

        checkPageBreak(descH);

        const rowBg = index % 2 === 0 ? '#FFFFFF' : lightBg;
        doc.rect(margin, currentY, contentWidth, descH).fill(rowBg).stroke(borderColor);

        doc
          .fillColor(textColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`${index + 1}`, colNoX, currentY + 6)
          .font('Helvetica-Bold')
          .text(descText, colDescX, currentY + 6, { width: colDescW - 10 })
          .font('Helvetica')
          .text(`${itemQty}`, colQtyX, currentY + 6, { width: colQtyW - 10, align: 'right' })
          .text(formatPdfMoney(unitPrice), colPriceX, currentY + 6, {
            width: colPriceW - 10,
            align: 'right',
          })
          .text(`${lead.gst_rate || 18}%`, colGstX, currentY + 6, { width: colGstW - 10, align: 'center' })
          .text(formatPdfMoney(lineTotal), colTotalX, currentY + 6, {
            width: colTotalW - 10,
            align: 'right',
          });

        currentY += descH;
      });

      // Total Summary Row
      const totalRowH = 24;
      checkPageBreak(totalRowH);

      doc.roundedRect(margin, currentY, contentWidth, totalRowH, 4).fill('#F1F5F9').stroke(borderColor);
      doc
        .fillColor(primaryColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('ESTIMATED VALUE SUMMARY', colNoX, currentY + 7)
        .fillColor(indigoAccent)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(
          grandTotalEst > 0 ? `${formatPdfMoney(grandTotalEst)} (Excl. Tax)` : 'Pricing to be quoted by vendor',
          colPriceX,
          currentY + 7,
          { width: colPriceW + colGstW + colTotalW - 10, align: 'right' }
        );

      doc.y = currentY + totalRowH + 18;

      // ----------------------------------------------------
      // 5. TECHNICAL SPECIFICATIONS CARD
      // ----------------------------------------------------
      checkPageBreak(100);

      drawSectionHeader('2. TECHNICAL SPECIFICATIONS & SCOPE', doc.y);
      doc.y += 18;

      const specY = doc.y;
      const cleanSpecsText =
        cleanSpecifications(lead.specifications) ||
        'Standard OEM specifications, genuine original packaging, and official manufacturer warranty coverage required.';

      // Calculate height dynamically
      doc.fontSize(8.5);
      const textH = doc.heightOfString(cleanSpecsText, { width: contentWidth - 32 });
      const specBoxH = Math.max(50, textH + 20);

      doc.roundedRect(margin, specY, contentWidth, specBoxH, 6).fill(lightBg).stroke(borderColor);
      // Left border accent line
      doc.roundedRect(margin, specY, 4, specBoxH, 2).fill(indigoAccent);

      doc
        .fillColor(textColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(cleanSpecsText, margin + 16, specY + 10, {
          width: contentWidth - 32,
          lineGap: 3,
        });

      doc.y = specY + specBoxH + 18;

      // ----------------------------------------------------
      // 6. COMMERCIAL & DISPATCH TERMS CARDS
      // ----------------------------------------------------
      checkPageBreak(90);

      drawSectionHeader('3. COMMERCIAL & DISPATCH TERMS REQUESTED', doc.y);
      doc.y += 18;

      const termsY = doc.y;
      const termCardW = (contentWidth - 12) / 2;
      const termCardH = 58;

      // Card 1: Delivery Terms
      doc.roundedRect(margin, termsY, termCardW, termCardH, 6).fill(lightBg).stroke(borderColor);
      doc.roundedRect(margin, termsY, 4, termCardH, 2).fill(indigoAccent);

      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('DELIVERY & FREIGHT TERMS', margin + 14, termsY + 8)
        .fillColor(textColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(lead.delivery_terms || 'Door Delivery / FOB Destination included in final quote', margin + 14, termsY + 22, {
          width: termCardW - 24,
        });

      // Card 2: Warranty Terms
      const rightTermX = margin + termCardW + 12;
      doc.roundedRect(rightTermX, termsY, termCardW, termCardH, 6).fill(lightBg).stroke(borderColor);
      doc.roundedRect(rightTermX, termsY, 4, termCardH, 2).fill(indigoAccent);

      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('WARRANTY & SUPPORT REQUIRED', rightTermX + 14, termsY + 8)
        .fillColor(textColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(lead.warranty || 'Manufacturer OEM Warranty (Min 1 Year On-site)', rightTermX + 14, termsY + 22, {
          width: termCardW - 24,
        });

      doc.y = termsY + termCardH + 16;

      // ----------------------------------------------------
      // 7. REMARKS / SPECIAL INSTRUCTIONS CALLOUT
      // ----------------------------------------------------
      if (lead.remarks?.trim()) {
        checkPageBreak(60);

        const remY = doc.y;
        const remText = lead.remarks.trim();
        doc.fontSize(8.5);
        const remTextH = doc.heightOfString(remText, { width: contentWidth - 32 });
        const remBoxH = Math.max(38, remTextH + 18);

        doc.roundedRect(margin, remY, contentWidth, remBoxH, 6).fill(amberBg).stroke(amberBorder);
        doc.roundedRect(margin, remY, 4, remBoxH, 2).fill(amberBorder);

        doc
          .fillColor(amberText)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('REMARKS / SPECIAL INSTRUCTIONS:', margin + 14, remY + 8);

        doc
          .fillColor('#78350F')
          .fontSize(8.5)
          .font('Helvetica')
          .text(remText, margin + 14, remY + 20, { width: contentWidth - 28 });

        doc.y = remY + remBoxH + 16;
      }

      // ----------------------------------------------------
      // 8. VENDOR GUIDELINES & AUTHORIZATION FOOTER
      // ----------------------------------------------------
      checkPageBreak(75);

      const footerY = Math.max(doc.y, pageHeight - margin - 75);
      const footerH = 70;

      doc.roundedRect(margin, footerY, contentWidth, footerH, 6).fill(lightBg).stroke(borderColor);

      // Left Column: Guidelines
      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('QUOTATION SUBMISSION GUIDELINES:', margin + 12, footerY + 8)
        .font('Helvetica')
        .fillColor(textColor)
        .text(
          '1. Please submit net unit pricing specifying applicable GST breakdown.\n2. Indicate stock availability, dispatch timeline, and warranty terms.\n3. Quotations should remain valid for a minimum of 15 days from submission.',
          margin + 12,
          footerY + 20,
          { width: 330, lineGap: 2 }
        );

      // Right Column: Authorization Signature Line
      const signX = margin + 350;
      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(`For ${companyName}`, signX, footerY + 8, { width: 160, align: 'right' });

      // Signature line
      doc
        .moveTo(signX + 30, footerY + 46)
        .lineTo(margin + contentWidth - 12, footerY + 46)
        .stroke(borderColor);

      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica')
        .text('Authorized Signatory / Procurement Dept.', signX, footerY + 50, { width: 160, align: 'right' });

      // ----------------------------------------------------
      // 9. DYNAMIC PAGE NUMBERING
      // ----------------------------------------------------
      const range = doc.bufferedPageRange(); // { start: 0, count: N }
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor('#94A3B8')
          .fontSize(7.5)
          .font('Helvetica')
          .text(
            `Page ${i + 1} of ${range.count}  •  TechnoSphere Procurement Management System  •  Confidential RFQ`,
            margin,
            pageHeight - 24,
            { width: contentWidth, align: 'center' }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
