import PDFDocument from 'pdfkit';
import { parseLineItemsFromLead, cleanSpecifications, cleanProductTitle } from '@/lib/leadUtils';
import { formatDate } from '@/lib/utils';

export async function generateRfqPdf(lead: any, settings?: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const prReference = lead.lead_name?.trim() || lead.lead_number || 'N/A';

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 0, left: 36, right: 36 },
        bufferPages: true,
        info: {
          Title: `RFQ_${prReference}`,
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
      const rawAddress = settings?.office_address || settings?.company_address || '';
      const companyAddress = rawAddress ? rawAddress.replace(/\r?\n+/g, ', ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim() : '';
      const companyEmail = settings?.official_email || 'sales@technosphere.in';
      const companyPhone = settings?.phone_number || settings?.official_phone || '';
      const companyGst = settings?.gstin_number || settings?.gst_number || '';

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
        doc.roundedRect(margin, yPos, 4, 14, 2).fill(indigoAccent);
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), margin + 12, yPos + 1, { characterSpacing: 0.5 });
      };

      // Helper to check page overflow and insert page break cleanly
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 50) {
          doc.addPage();
          drawPageHeaderMini();
          currentY = margin + 45;
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
          .text(`PR Ref: ${prReference}`, margin + contentWidth - 160, margin + 9, { align: 'right', width: 150 });
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
        .text(`PR REF: ${prReference}`, badgeX + 5, badgeY + 28, { width: badgeW - 10, align: 'center' });

      let currentY = margin + headerHeight + 12;

      // ----------------------------------------------------
      // 2. DOCUMENT METADATA BAR
      // ----------------------------------------------------
      const metaY = currentY;
      const metaH = 34;

      doc.roundedRect(margin, metaY, contentWidth, metaH, 6).fill(lightBg).stroke(borderColor);

      const createdDate = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const categoryName = lead.categories?.name || 'General Requirement';

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

      // Column 2: Category
      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('CATEGORY', margin + 180, metaY + 7)
        .fillColor(primaryColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(categoryName, margin + 180, metaY + 18, { width: 300, ellipsis: true });

      currentY = metaY + metaH + 14;

      // ----------------------------------------------------
      // 3. BUYER vs PROJECT REFERENCE CARDS
      // ----------------------------------------------------
      const infoY = currentY;
      const cardW = (contentWidth - 12) / 2;
      const cardH = 68;

      // Left Box: RFQ Requested By
      doc.roundedRect(margin, infoY, cardW, cardH, 6).fill(lightBg).stroke(borderColor);
      doc
        .fillColor(indigoAccent)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('RFQ REQUESTED BY:', margin + 12, infoY + 10, { characterSpacing: 0.5 });

      doc
        .fillColor(primaryColor)
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('Purchase Team', margin + 12, infoY + 23, { width: cardW - 24, ellipsis: true })
        .fillColor(primaryColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(companyName, margin + 12, infoY + 36, { width: cardW - 24, ellipsis: true })
        .fillColor(textColor)
        .fontSize(7.5)
        .font('Helvetica')
        .text(companyAddress, margin + 12, infoY + 49, { width: cardW - 24, height: 16, ellipsis: true });

      // Right Box: RFQ & Procurement Details
      const rightCardX = margin + cardW + 12;
      doc.roundedRect(rightCardX, infoY, cardW, cardH, 6).fill(lightBg).stroke(borderColor);
      doc
        .fillColor(indigoAccent)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('RFQ & PROCUREMENT DETAILS', rightCardX + 12, infoY + 10, { characterSpacing: 0.5 });

      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('PR Reference No:', rightCardX + 12, infoY + 26)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(prReference, rightCardX + 105, infoY + 26, { width: cardW - 117, ellipsis: true })
        .fillColor(textMuted)
        .font('Helvetica-Bold')
        .text('Category:', rightCardX + 12, infoY + 41)
        .fillColor(textColor)
        .font('Helvetica')
        .text(lead.categories?.name || 'General Procurement', rightCardX + 105, infoY + 41, { width: cardW - 117, ellipsis: true });

      currentY = infoY + cardH + 16;

      // ----------------------------------------------------
      // 4. ITEMS & QUANTITIES SCHEDULE TABLE
      // ----------------------------------------------------
      drawSectionHeader('BILLS OF MATERIAL', currentY);
      currentY += 20;

      const tableTop = currentY;
      const colNoW = 30;
      const colQtyW = 80;
      const colDescW = contentWidth - colNoW - colQtyW - 16;

      const colNoX = margin + 8;
      const colDescX = margin + colNoW + 8;
      const colQtyX = margin + contentWidth - colQtyW - 8;

      // Table Header Row
      const thH = 22;
      doc.roundedRect(margin, tableTop, contentWidth, thH, 4).fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('#', colNoX, tableTop + 6)
        .text('Product Description & Technical Specifications', colDescX, tableTop + 6)
        .text('Quantity', colQtyX, tableTop + 6, { width: colQtyW, align: 'right' });

      currentY = tableTop + thH;
      const lineItems = parseLineItemsFromLead(lead);

      lineItems.forEach((item, index) => {
        const itemQty = Number(item.quantity) || 1;

        const descText = cleanProductTitle(item.product_item) || 'Item Requirement';
        let itemSpec = item.specifications?.trim() || '';

        // Fallback for single item leads if itemSpec is empty
        if (!itemSpec && lineItems.length === 1 && lead.specifications) {
          itemSpec = cleanSpecifications(lead.specifications);
        }

        // Measure title height (8.5pt font, bold)
        doc.fontSize(8.5).font('Helvetica-Bold');
        const titleH = Math.ceil(doc.heightOfString(descText, { width: colDescW - 10 }));

        // Measure spec height (7.5pt font)
        doc.fontSize(7.5).font('Helvetica');
        const specHeaderH = itemSpec ? 12 : 0;
        const specBodyH = itemSpec ? Math.ceil(doc.heightOfString(itemSpec, { width: colDescW - 10, lineGap: 1.5 })) : 0;
        const specH = specHeaderH + specBodyH;

        const rowH = Math.max(32, titleH + specH + 16);

        checkPageBreak(rowH);

        const rowBg = index % 2 === 0 ? '#FFFFFF' : lightBg;
        doc.rect(margin, currentY, contentWidth, rowH).fill(rowBg).stroke(borderColor);

        // Render Index Number
        doc
          .fillColor(textColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`${index + 1}`, colNoX, currentY + 8);

        // Render Item Title
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(primaryColor)
          .text(descText, colDescX, currentY + 8, { width: colDescW - 10 });

        // Render Technical Specifications
        if (itemSpec) {
          const specHeaderY = currentY + 8 + titleH + 3;
          doc
            .fillColor(indigoAccent)
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .text('Technical Specifications:', colDescX, specHeaderY, { width: colDescW - 10 });

          const specBodyY = specHeaderY + 10;
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#334155')
            .text(itemSpec, colDescX, specBodyY, {
              width: colDescW - 10,
              lineGap: 1.5,
            });
        }

        // Render Quantity
        doc
          .fillColor(textColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`${itemQty} unit${itemQty > 1 ? 's' : ''}`, colQtyX, currentY + 8, {
            width: colQtyW,
            align: 'right',
          });

        currentY += rowH;
      });

      currentY += 12;

      // ----------------------------------------------------
      // 5. EXPECTED CREDIT TERMS (IF PROVIDED)
      // ----------------------------------------------------
      const expectedCredit = lead.expected_credit?.trim() || '';
      if (expectedCredit) {
        checkPageBreak(45);

        const credY = currentY;
        doc.fontSize(8.5);
        const credTextH = doc.heightOfString(expectedCredit, { width: contentWidth - 32 });
        const credBoxH = Math.max(34, credTextH + 18);

        const greenBg = '#F0FDF4';
        const greenBorder = '#16A34A';
        const greenText = '#15803D';

        doc.roundedRect(margin, credY, contentWidth, credBoxH, 6).fill(greenBg).stroke('#BBF7D0');
        doc.roundedRect(margin, credY, 4, credBoxH, 2).fill(greenBorder);

        doc
          .fillColor(greenText)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('EXPECTED CREDIT TERMS:', margin + 14, credY + 8);

        doc
          .fillColor('#166534')
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(expectedCredit, margin + 14, credY + 20, { width: contentWidth - 28 });

        currentY = credY + credBoxH + 14;
      }

      // ----------------------------------------------------
      // 6. GENERAL REMARKS & TERMS CALLOUT
      // ----------------------------------------------------
      const generalNotes = cleanSpecifications(lead.remarks);
      if (generalNotes) {
        checkPageBreak(50);

        const remY = currentY;
        doc.fontSize(8.5);
        const remTextH = doc.heightOfString(generalNotes, { width: contentWidth - 32 });
        const remBoxH = Math.max(36, remTextH + 18);

        doc.roundedRect(margin, remY, contentWidth, remBoxH, 6).fill(amberBg).stroke(amberBorder);
        doc.roundedRect(margin, remY, 4, remBoxH, 2).fill(amberBorder);

        doc
          .fillColor(amberText)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('GENERAL REMARKS & TERMS:', margin + 14, remY + 8);

        doc
          .fillColor('#78350F')
          .fontSize(8.5)
          .font('Helvetica')
          .text(generalNotes, margin + 14, remY + 20, { width: contentWidth - 28 });

        currentY = remY + remBoxH + 16;
      }

      // ----------------------------------------------------
      // 6. VENDOR GUIDELINES & AUTHORIZATION FOOTER
      // ----------------------------------------------------
      const footerH = 65;
      if (currentY + footerH + 10 > pageHeight - 45) {
        doc.addPage();
        drawPageHeaderMini();
        currentY = margin + 45;
      }

      const footerY = currentY + 8;

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
          '1. Please submit net unit pricing.\n2. Indicate stock availability and dispatch timeline.\n3. Quotations should remain valid for a minimum of 15 days from submission.',
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

      doc
        .moveTo(signX + 30, footerY + 42)
        .lineTo(margin + contentWidth - 12, footerY + 42)
        .stroke(borderColor);

      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font('Helvetica')
        .text('Authorized Signatory / Procurement Dept.', signX, footerY + 46, { width: 160, align: 'right' });

      // ----------------------------------------------------
      // 7. DYNAMIC PAGE NUMBERING
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
