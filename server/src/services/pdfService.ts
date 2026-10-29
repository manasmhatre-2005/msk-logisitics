import PDFDocument from 'pdfkit';
import prisma from '../prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAssetPath(filename: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../assets', filename),
    path.resolve(__dirname, '../assets', filename),
    path.resolve(process.cwd(), 'assets', filename),
    path.resolve(process.cwd(), 'server/assets', filename),
    path.resolve(process.cwd(), 'server/public/images', filename),
    path.resolve(process.cwd(), 'public/images', filename),
    path.resolve(process.cwd(), 'client/public/images', filename),
    path.resolve(process.cwd(), filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(n: number | null | undefined, currency = 'INR'): string {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  const locale = currency === 'USD' ? 'en-US' : 'en-IN';
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type BillFormatId = 'format-1' | 'format-2' | 'format-3' | 'format-4' | 'format-5';

export interface PDFGenerationOptions {
  templateId?: BillFormatId | string;
}

export class PDFService {
  /**
   * Generate A4 Tax Invoice PDF buffer following the exact MSK Logistic Solution sample invoice layout (Image 3)
   * Supports 5 template slots: format-1 (exact Image 3), format-2, format-3, format-4, format-5
   */
  static async generateInvoicePDF(
    invoiceOrId: string | any,
    providedSettings?: any,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    let invoice: any;
    if (typeof invoiceOrId === 'string') {
      invoice = await prisma.invoice.findUnique({
        where: { id: invoiceOrId },
        include: {
          party: true,
          exporter: true,
          job: true,
          containers: true,
          items: true,
        },
      });

      if (!invoice) {
        throw new Error(`Invoice with ID ${invoiceOrId} not found`);
      }
    } else {
      invoice = invoiceOrId;
    }

    const settings = providedSettings || (await prisma.companySettings.findUnique({ where: { id: 'default' } }));

    // Extract templateId from options, invoice, notes tag, or default
    let templateId: BillFormatId = 'format-1';
    if (options.templateId && ['format-1', 'format-2', 'format-3', 'format-4', 'format-5'].includes(options.templateId)) {
      templateId = options.templateId as BillFormatId;
    } else if (invoice.templateId && ['format-1', 'format-2', 'format-3', 'format-4', 'format-5'].includes(invoice.templateId)) {
      templateId = invoice.templateId as BillFormatId;
    } else if (invoice.notes && invoice.notes.includes('[TEMPLATE:')) {
      const match = invoice.notes.match(/\[TEMPLATE:(format-[1-5])\]/);
      if (match) templateId = match[1] as BillFormatId;
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 20,
        compress: false,
        info: {
          Title: `Tax Invoice - ${invoice.invoiceNumber}`,
          Author: settings?.companyName || 'MSK LOGISTIC SOLUTION',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const leftX = 24;
      const contentWidth = 547;
      const rightX = leftX + contentWidth; // 571
      const borderDark = '#1f2937';
      const borderTable = '#475569';
      const borderLight = '#94a3b8';
      const fillHeader = '#e2e8f0';
      const fillSubHeader = '#f1f5f9';
      const textDark = '#0f172a';
      const textMuted = '#334155';
      const mskRed = '#dc2626';

      let y = 22;

      // Outer bounding box for A4 sheet styling (matching Image 3 frame)
      const pageTopY = y;

      // ==========================================
      // TEMPLATE SLOT BANNER (FOR SLOTS 2-5 ONLY)
      // ==========================================
      if (templateId !== 'format-1') {
        const slotNum = templateId.replace('format-', '');
        doc.rect(leftX, y, contentWidth, 14).fill('#f8fafc').stroke('#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b')
          .text(`BILL FORMAT ${slotNum} — TEMPLATE SLOT ACTIVE (READY FOR REFERENCE DESIGN)`, leftX, y + 3.5, {
            width: contentWidth,
            align: 'center',
          });
        y += 16;
      }

      // ==========================================
      // 1. TOP HEADER (ISO LOGO, COMPANY DETAILS, MSK LOGO)
      // ==========================================
      const headerBoxHeight = 68;
      doc.rect(leftX, y, contentWidth, headerBoxHeight).stroke(borderDark);

      // A. ISO 9001:2015 Logo Box (Left) - exactly framed as in image 3
      const isoBoxWidth = 72;
      doc.rect(leftX, y, isoBoxWidth, headerBoxHeight).stroke(borderLight);
      const isoLogoPath = getAssetPath('iso-logo.png');
      if (isoLogoPath) {
        try {
          doc.image(isoLogoPath, leftX + 11, y + 5, {
            fit: [50, 46],
            align: 'center',
            valign: 'center',
          });
          doc.font('Helvetica-Bold').fontSize(5.5).fillColor(textDark)
            .text('ISO CERTIFIED 9001:2015', leftX + 2, y + 54, { width: isoBoxWidth - 4, align: 'center' });
        } catch (e) {
          doc.font('Helvetica-Bold').fontSize(6).fillColor(textDark)
            .text('CERTIFIED\nISO\n9001:2015\nCOMPANY', leftX + 4, y + 16, { width: isoBoxWidth - 8, align: 'center' });
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(6).fillColor(textDark)
          .text('CERTIFIED\nISO\n9001:2015\nCOMPANY', leftX + 4, y + 16, { width: isoBoxWidth - 8, align: 'center' });
      }

      // B. Center: Company Heading & Details
      const centerWidth = 357;
      const centerX = leftX + isoBoxWidth;

      doc.font('Helvetica-Bold').fontSize(14).fillColor(textDark)
        .text(settings?.companyName || 'MSK LOGISTIC SOLUTION', centerX, y + 6, {
          width: centerWidth,
          align: 'center',
        });

      doc.font('Helvetica').fontSize(7.5).fillColor(textMuted)
        .text(
          `${settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3'}, ${settings?.city || 'Navi Mumbai'} ${settings?.pincode || '400702'}.`,
          centerX,
          y + 24,
          { width: centerWidth, align: 'center' }
        );

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(
          `TAN NO: ${settings?.tan || 'PNES72845D'}   PAN NO: ${settings?.pan || 'AXWPK4562G'}   GST NO: ${settings?.gstin || '27AXWPK4562G1ZX'}`,
          centerX,
          y + 36,
          { width: centerWidth, align: 'center' }
        );

      doc.font('Helvetica').fontSize(7.5).fillColor(textMuted)
        .text(
          `Email id : ${settings?.email || 'accounts@msklogisticsolution.com'}   Mob No.${settings?.phone || '+91 8104592823'}`,
          centerX,
          y + 48,
          { width: centerWidth, align: 'center' }
        );

      // C. MSK LOGISTIC SOLUTION Logo Box (Right) - exactly framed as in image 3
      const mskBoxWidth = 118;
      const mskX = rightX - mskBoxWidth;
      doc.rect(mskX, y, mskBoxWidth, headerBoxHeight).stroke(borderLight);
      const mskLogoPath = getAssetPath('msk-logo.png');
      if (mskLogoPath) {
        try {
          doc.image(mskLogoPath, mskX + 5, y + 5, {
            fit: [108, 58],
            align: 'center',
            valign: 'center',
          });
        } catch (e) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(mskRed)
            .text('MSK LOGISTIC\nSOLUTION', mskX + 5, y + 22, { width: 108, align: 'center' });
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(mskRed)
          .text('MSK LOGISTIC\nSOLUTION', mskX + 5, y + 22, { width: 108, align: 'center' });
      }

      y += headerBoxHeight;

      // ==========================================
      // 2. INVOICE TITLE BANNER (Solid Dark Bar)
      // ==========================================
      const bannerHeight = 17;
      doc.rect(leftX, y, contentWidth, bannerHeight).fill('#1f2937');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text(settings?.invoiceTitle || 'TAX INVOICE (EXPORT STUFFING CONTAINER)', leftX, y + 4.5, {
          width: contentWidth,
          align: 'center',
        });
      y += bannerHeight;

      // ==========================================
      // 3. INVOICE NO & INVOICE DATE ROW
      // ==========================================
      const invNoHeight = 16;
      doc.rect(leftX, y, contentWidth, invNoHeight).stroke(borderDark);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text(`Invoice No: ${invoice.invoiceNumber}`, leftX + 6, y + 4);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, rightX - 220, y + 4, {
          width: 214,
          align: 'right',
        });
      y += invNoHeight;

      // ==========================================
      // 4. DETAILS OF RECEIVER (BILLED TO) & CONSIGNEE (SHIPPED TO)
      // ==========================================
      const halfWidth = contentWidth / 2; // 273.5
      const midX = leftX + halfWidth;

      // Header row for Receiver & Consignee
      const partyHeaderH = 14;
      doc.rect(leftX, y, halfWidth, partyHeaderH).fillAndStroke(fillHeader, borderDark);
      doc.rect(midX, y, halfWidth, partyHeaderH).fillAndStroke(fillHeader, borderDark);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('Details of Receiver / Billed to', leftX, y + 3.5, { width: halfWidth, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('Details of Consignee / Shipped to', midX, y + 3.5, { width: halfWidth, align: 'center' });
      y += partyHeaderH;

      // Content Box for Receiver & Consignee
      const partyContentH = 56;
      doc.rect(leftX, y, halfWidth, partyContentH).stroke(borderDark);
      doc.rect(midX, y, halfWidth, partyContentH).stroke(borderDark);

      // Receiver (Left)
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text('Name:', leftX + 6, y + 4, { width: 45 });
      doc.font('Helvetica').fontSize(7).fillColor(textDark).text(invoice.billToName || '-', leftX + 54, y + 4, { width: halfWidth - 60, height: 10 });

      doc.font('Helvetica-Bold').fontSize(7).text('Address:', leftX + 6, y + 16, { width: 45 });
      doc.font('Helvetica').fontSize(6.5).text(invoice.billToAddress || '-', leftX + 54, y + 16, { width: halfWidth - 60, height: 16 });

      doc.font('Helvetica-Bold').fontSize(7).text('GSTIN:', leftX + 6, y + 32, { width: 45 });
      doc.font('Helvetica-Bold').fontSize(7).text(invoice.billToGstin || '-', leftX + 54, y + 32);

      doc.font('Helvetica-Bold').fontSize(7).text('State:', leftX + 6, y + 43, { width: 35 });
      doc.font('Helvetica').fontSize(7).text(invoice.billToState || '-', leftX + 44, y + 43, { width: 90 });
      doc.font('Helvetica-Bold').fontSize(7).text(`State Code:`, leftX + 140, y + 43);
      doc.font('Helvetica').fontSize(7).text(invoice.billToStateCode || '-', leftX + 195, y + 43);

      // Consignee (Right)
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text('Name:', midX + 6, y + 4, { width: 45 });
      doc.font('Helvetica').fontSize(7).fillColor(textDark).text(invoice.consigneeName || invoice.exporter?.name || '-', midX + 54, y + 4, { width: halfWidth - 60, height: 10 });

      doc.font('Helvetica-Bold').fontSize(7).text('Address:', midX + 6, y + 16, { width: 45 });
      doc.font('Helvetica').fontSize(6.5).text(invoice.consigneeAddress || invoice.exporter?.address || '-', midX + 54, y + 16, { width: halfWidth - 60, height: 16 });

      doc.font('Helvetica-Bold').fontSize(7).text('GSTIN:', midX + 6, y + 32, { width: 45 });
      doc.font('Helvetica').fontSize(7).text(invoice.exporter?.gstin || '-', midX + 54, y + 32);

      doc.font('Helvetica-Bold').fontSize(7).text('State:', midX + 6, y + 43, { width: 35 });
      doc.font('Helvetica').fontSize(7).text(invoice.exporter?.state || '-', midX + 44, y + 43);

      y += partyContentH;

      // ==========================================
      // 5. EXPORTER NAME & S/BILL NO ROW
      // ==========================================
      const expRowH = 15;
      doc.rect(leftX, y, contentWidth, expRowH).stroke(borderDark);
      doc.moveTo(midX, y).lineTo(midX, y + expRowH).stroke(borderDark);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('EXPORTER NAME : ', leftX + 6, y + 4);
      doc.font('Helvetica').fontSize(7.5)
        .text(invoice.exporter?.name || invoice.consigneeName || '-', leftX + 90, y + 4, { width: halfWidth - 95 });

      doc.font('Helvetica-Bold').fontSize(7.5)
        .text('S/BILL NO : ', midX + 6, y + 4);
      doc.font('Helvetica').fontSize(7.5)
        .text(invoice.sbNumbers || '-', midX + 62, y + 4, { width: halfWidth - 68 });

      y += expRowH;

      // ==========================================
      // 6. CONTAINER OPERATIONAL DETAILS TABLE (EXACT 9 COLUMNS FROM IMAGE 3)
      // ==========================================
      // Image 3 Columns:
      // SR NO (24) | CONTAINER NO (72) | SIZE (38) | TYPE (32) | EMPTY GROUND (DAYS) (68) | LOADED GROUND DAYS (68) | H & T CHARGES (75) | LOGISTICS CHARGES (85) | EMPTY TRANSPORTATION (85)
      // Sum = 24 + 72 + 38 + 32 + 68 + 68 + 75 + 85 + 85 = 547 pt
      const contColWidths = [24, 72, 38, 32, 68, 68, 75, 85, 85];
      const contColHeaders = [
        'SR NO',
        'CONTAINER NO',
        'SIZE',
        'TYPE',
        'EMPTY GROUND (DAYS)',
        'LOADED GROUND DAYS',
        'H & T CHARGES',
        'LOGISTICS CHARGES',
        'EMPTY TRANSPORTATION',
      ];

      const contHeaderH = 15;
      doc.rect(leftX, y, contentWidth, contHeaderH).fillAndStroke(fillHeader, borderDark);

      let cx = leftX;
      for (let i = 0; i < contColWidths.length; i++) {
        const w = contColWidths[i];
        if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + contHeaderH).stroke(borderTable);
        doc.font('Helvetica-Bold').fontSize(5.8).fillColor(textDark)
          .text(contColHeaders[i], cx, y + 4.5, { width: w, align: 'center' });
        cx += w;
      }
      y += contHeaderH;

      // Container Rows
      const contRowH = 14;
      const containersToRender = (invoice.containers && invoice.containers.length > 0)
        ? invoice.containers
        : [
            {
              containerNumber: '-',
              size: '-',
              type: '-',
              emptyGroundDays: 0,
              loadedGroundDays: 0,
              htCharges: 0,
              logisticsCharges: 0,
              emptyTransportCharges: 0,
            },
          ];

      containersToRender.forEach((c: any, idx: number) => {
        doc.rect(leftX, y, contentWidth, contRowH).stroke(borderDark);
        cx = leftX;

        const rowValues = [
          String(idx + 1),
          c.containerNumber || '-',
          c.size || '40 FT HC',
          c.type || 'DRY',
          String(c.emptyGroundDays ?? '-'),
          String(c.loadedGroundDays ?? '-'),
          c.htCharges > 0 ? formatCurrency(c.htCharges, invoice.currency) : '-',
          c.logisticsCharges > 0 ? formatCurrency(c.logisticsCharges, invoice.currency) : '-',
          c.emptyTransportCharges > 0 ? formatCurrency(c.emptyTransportCharges, invoice.currency) : '-',
        ];

        for (let i = 0; i < contColWidths.length; i++) {
          const w = contColWidths[i];
          if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + contRowH).stroke(borderTable);
          const val = rowValues[i];
          const isNum = i >= 6;
          doc.font(i === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor(textDark)
            .text(val, cx + 2, y + 3.5, { width: w - 4, align: isNum ? 'right' : 'center' });
          cx += w;
        }
        y += contRowH;
      });

      // ==========================================
      // 7. CHARGES / LINE ITEMS TABLE (EXACT 7 COLUMNS FROM IMAGE 3)
      // ==========================================
      // Image 3 Columns:
      // Sr (24) | Description (233) | HSN/SAC (55) | Qty (35) | Rate (₹) (65) | Amount (₹) (65) | Taxable (₹) (70)
      // Sum = 24 + 233 + 55 + 35 + 65 + 65 + 70 = 547 pt
      const sym = invoice.currency === 'USD' ? '($)' : '(₹)';
      const itemColWidths = [24, 233, 55, 35, 65, 65, 70];
      const itemColHeaders = [
        'Sr',
        'Description',
        'HSN/SAC',
        'Qty',
        `Rate ${sym}`,
        `Amount ${sym}`,
        `Taxable ${sym}`,
      ];

      const itemHeaderH = 15;
      doc.rect(leftX, y, contentWidth, itemHeaderH).fillAndStroke(fillHeader, borderDark);

      let ix = leftX;
      for (let i = 0; i < itemColWidths.length; i++) {
        const w = itemColWidths[i];
        if (i > 0) doc.moveTo(ix, y).lineTo(ix, y + itemHeaderH).stroke(borderTable);
        const align = i === 1 ? 'left' : (i >= 4 ? 'right' : 'center');
        const textPad = i === 1 ? 5 : (i >= 4 ? 4 : 0);
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
          .text(itemColHeaders[i], ix + (i === 1 ? textPad : 0), y + 4.5, {
            width: w - textPad,
            align,
          });
        ix += w;
      }
      y += itemHeaderH;

      // Line Item Rows
      const itemRowH = 15;
      const itemsToRender = (invoice.items && invoice.items.length > 0)
        ? invoice.items
        : [
            {
              srNo: 1,
              description: 'Logistics and Handling Charges',
              hsnSacCode: '996719',
              quantity: 1,
              rate: invoice.subtotal || 0,
              amount: invoice.subtotal || 0,
              taxableValue: invoice.taxableAmount || 0,
            },
          ];

      itemsToRender.forEach((item: any, idx: number) => {
        doc.rect(leftX, y, contentWidth, itemRowH).stroke(borderDark);
        ix = leftX;

        const lineQty = Number(item.quantity || 1);
        const lineRate = Number(item.rate || 0);
        const lineAmt = item.amount !== undefined ? Number(item.amount) : lineQty * lineRate;
        const lineTaxable = item.taxableValue !== undefined ? Number(item.taxableValue) : Math.max(0, lineAmt - Number(item.discount || 0));

        const itemValues = [
          String(item.srNo || idx + 1),
          item.description || '-',
          item.hsnSacCode || '-',
          String(lineQty),
          formatCurrency(lineRate, invoice.currency),
          formatCurrency(lineAmt, invoice.currency),
          formatCurrency(lineTaxable, invoice.currency),
        ];

        for (let i = 0; i < itemColWidths.length; i++) {
          const w = itemColWidths[i];
          if (i > 0) doc.moveTo(ix, y).lineTo(ix, y + itemRowH).stroke(borderTable);
          const val = itemValues[i];
          const align = i === 1 ? 'left' : (i >= 4 ? 'right' : 'center');
          const isBold = i === 1 || i === 6;

          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.8).fillColor(textDark)
            .text(val, ix + (i === 1 ? 5 : 2), y + 4, {
              width: w - (i === 1 ? 8 : 4),
              align,
            });
          ix += w;
        }
        y += itemRowH;
      });

      // ==========================================
      // 8. BOTTOM SUMMARY SECTION (SPLIT LEFT & RIGHT - EXACT MATCH TO IMAGE 3)
      // ==========================================
      const bottomSplitX = leftX + 315; // Left width: 315, Right width: 232
      const bottomBoxHeight = 125;

      doc.rect(leftX, y, contentWidth, bottomBoxHeight).stroke(borderDark);
      doc.moveTo(bottomSplitX, y).lineTo(bottomSplitX, y + bottomBoxHeight).stroke(borderDark);

      // --- LEFT SIDE: Amount in Words & Banking Details ---
      const leftPadX = leftX + 8;
      const leftInnerWidth = 300;

      doc.font('Helvetica').fontSize(7).fillColor(textDark)
        .text('Total invoice amount in words:', leftPadX, y + 6);

      const defaultWords = invoice.currency === 'USD' ? 'US Dollars Zero Only' : 'INR Zero Only';
      let wordsText = (invoice.amountInWords || defaultWords).toUpperCase();
      if (!wordsText.endsWith('ONLY')) {
        wordsText = `${wordsText} ONLY ONLY`;
      } else if (!wordsText.endsWith('ONLY ONLY')) {
        wordsText = `${wordsText} ONLY`;
      }

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(wordsText, leftPadX, y + 17, { width: leftInnerWidth, lineGap: 1.5 });

      // Banking Details Box
      const bankTopY = y + 40;
      doc.moveTo(leftX, bankTopY - 4).lineTo(bottomSplitX, bankTopY - 4).stroke(borderLight);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('OUR BANKING DETAILS:', leftPadX, bankTopY);

      const bankLabelW = 78;
      const bankValX = leftPadX + bankLabelW;
      const bankValW = leftInnerWidth - bankLabelW;
      let by = bankTopY + 12;
      const bankLineGap = 12;

      // Line 1: Company name
      doc.font('Helvetica').fontSize(7).fillColor(textDark).text('Company name :', leftPadX, by);
      doc.font('Helvetica-Bold').fontSize(7).text(settings?.bankAccountName || settings?.companyName || 'MSK LOGISTIC SOLUTION', bankValX, by, { width: bankValW });
      by += bankLineGap;

      // Line 2: A/C Number
      doc.font('Helvetica').fontSize(7).text('A/C Number :', leftPadX, by);
      doc.font('Helvetica-Bold').fontSize(7).text(settings?.bankAccountNo || '574005000006', bankValX, by, { width: bankValW });
      by += bankLineGap;

      // Line 3: Bank Name
      doc.font('Helvetica').fontSize(7).text('Bank Name :', leftPadX, by);
      doc.font('Helvetica-Bold').fontSize(7).text(settings?.bankName || 'ICICI Bank', bankValX, by, { width: bankValW });
      by += bankLineGap;

      // Line 4: Branch Name
      doc.font('Helvetica').fontSize(7).text('Branch Name :', leftPadX, by);
      doc.font('Helvetica').fontSize(7).text(settings?.bankBranch || 'Dronagiri Node (Nhava Sheva)', bankValX, by, { width: bankValW });
      by += bankLineGap;

      // Line 5: IFSC Code
      doc.font('Helvetica').fontSize(7).text('IFSC Code :', leftPadX, by);
      doc.font('Helvetica-Bold').fontSize(7).text(settings?.bankIfsc || 'ICIC0005740', bankValX, by, { width: bankValW });

      // --- RIGHT SIDE: Tax Summary & Authorized Signatory ---
      const rightPadX = bottomSplitX + 8;
      const rightInnerWidth = rightX - bottomSplitX - 16;
      let ry = y + 6;

      const currencyPrefix = invoice.currency === 'USD' ? '$' : '₹';

      // Total Before Tax
      doc.font('Helvetica').fontSize(7.5).fillColor(textDark)
        .text('Total Before Tax:', rightPadX, ry);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(`${currencyPrefix} ${formatCurrency(invoice.taxableAmount, invoice.currency)}`, rightPadX, ry, {
          width: rightInnerWidth,
          align: 'right',
        });
      ry += 16;

      // Taxes: IGST or CGST/SGST
      if (invoice.isInterState) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#7c3aed') // Violet/Purple as seen in Image 3
          .text(`Add: IGST (${invoice.igstRate || 18}%):`, rightPadX, ry);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#7c3aed')
          .text(`${currencyPrefix} ${formatCurrency(invoice.igstAmount, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerWidth,
            align: 'right',
          });
        ry += 16;
      } else {
        doc.font('Helvetica').fontSize(7.5).fillColor('#7c3aed')
          .text(`Add: CGST (${invoice.cgstRate || 9}%):`, rightPadX, ry);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#7c3aed')
          .text(`${currencyPrefix} ${formatCurrency(invoice.cgstAmount, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerWidth,
            align: 'right',
          });
        ry += 13;

        doc.font('Helvetica').fontSize(7.5).fillColor('#7c3aed')
          .text(`Add: SGST (${invoice.sgstRate || 9}%):`, rightPadX, ry);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#7c3aed')
          .text(`${currencyPrefix} ${formatCurrency(invoice.sgstAmount, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerWidth,
            align: 'right',
          });
        ry += 15;
      }

      // TOTAL AFTER TAX (Bold Crimson Red in Image 3!)
      const grandTotalY = ry;
      doc.moveTo(bottomSplitX, grandTotalY - 3).lineTo(rightX, grandTotalY - 3).stroke(borderLight);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark)
        .text('TOTAL AFTER TAX:', rightPadX, grandTotalY + 3);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(mskRed)
        .text(`${currencyPrefix} ${formatCurrency(invoice.grandTotal, invoice.currency)}`, rightPadX, grandTotalY + 3, {
          width: rightInnerWidth,
          align: 'right',
        });

      // Signatory Section
      const signatoryDividerY = grandTotalY + 18;
      doc.moveTo(bottomSplitX, signatoryDividerY).lineTo(rightX, signatoryDividerY).stroke(borderTable);

      const signY = signatoryDividerY + 4;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(settings?.companyName || 'MSK LOGISTIC SOLUTION', bottomSplitX, signY, {
          width: rightX - bottomSplitX,
          align: 'center',
        });

      // Signature/Stamp space
      if (settings?.signatureUrl && fs.existsSync(settings.signatureUrl)) {
        try {
          doc.image(settings.signatureUrl, bottomSplitX + (rightX - bottomSplitX - 80) / 2, signY + 12, {
            fit: [80, 26],
            align: 'center',
          });
        } catch (e) {
          // ignore
        }
      }

      doc.font('Helvetica').fontSize(7).fillColor(textMuted)
        .text('Authorized Signatory', bottomSplitX, signY + 38, {
          width: rightX - bottomSplitX,
          align: 'center',
        });

      // Finalize PDF Document
      doc.end();
    });
  }
}
