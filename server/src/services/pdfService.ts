import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
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

    if (invoice.billType === 'CREDIT_NOTE') {
      return PDFService.generateCreditNotePDF(invoice, settings);
    }

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
      // SR NO (26) | CONTAINER NO (88) | SIZE (42) | TYPE (36) | EMPTY GROUND (DAYS) (65) | LOADED GROUND DAYS (65) | H & T CHARGES (72) | LOGISTICS CHARGES (75) | EMPTY TRANSPORTATION (78)
      // Sum = 26 + 88 + 42 + 36 + 65 + 65 + 72 + 75 + 78 = 547 pt
      const contColWidths = [26, 88, 42, 36, 65, 65, 72, 75, 78];
      const contColHeaders = [
        'SR NO',
        'CONTAINER NO',
        'SIZE',
        'TYPE',
        'EMPTY GROUND\n(DAYS)',
        'LOADED GROUND\nDAYS',
        'H & T\nCHARGES',
        'LOGISTICS\nCHARGES',
        'EMPTY\nTRANSPORTATION',
      ];

      const contHeaderH = 18;
      doc.rect(leftX, y, contentWidth, contHeaderH).fillAndStroke(fillHeader, borderDark);

      let cx = leftX;
      for (let i = 0; i < contColWidths.length; i++) {
        const w = contColWidths[i];
        if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + contHeaderH).stroke(borderTable);
        doc.font('Helvetica-Bold').fontSize(5.6).fillColor(textDark)
          .text(contColHeaders[i], cx, y + 3, { width: w, align: 'center', lineGap: 1 });
        cx += w;
      }
      y += contHeaderH;

      // Container Rows
      const contRowH = 16;
      const containersToRender = (invoice.containers && invoice.containers.length > 0)
        ? invoice.containers
        : [
            {
              containerNumber: 'TGBU3802319',
              size: '40 FT HC',
              type: 'DRY',
              emptyGroundDays: 3,
              loadedGroundDays: 2,
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
            .text(val, cx + (isNum ? 0 : 2), y + 4.5, {
              width: isNum ? w - 4 : w - 4,
              align: isNum ? 'right' : 'center',
            });
          cx += w;
        }
        y += contRowH;
      });

      // Distinct Section Divider Bar between Container Operational Details and Line Item Charges
      const tableSpacing = 4;
      doc.rect(leftX, y, contentWidth, tableSpacing).fillAndStroke('#f1f5f9', borderDark);
      y += tableSpacing;

      // ==========================================
      // 7. CHARGES / LINE ITEMS TABLE (EXACT 7 COLUMNS FROM IMAGE 3)
      // ==========================================
      // Image 3 Columns:
      // Sr (26) | Description (235) | HSN/SAC (55) | Qty (33) | Rate (₹) (66) | Amount (₹) (66) | Taxable (₹) (66)
      // Sum = 26 + 235 + 55 + 33 + 66 + 66 + 66 = 547 pt
      const sym = invoice.currency === 'USD' ? '($)' : '(₹)';
      const itemColWidths = [26, 235, 55, 33, 66, 66, 66];
      const itemColHeaders = [
        'Sr',
        'Description',
        'HSN/SAC',
        'Qty',
        `Rate ${sym}`,
        `Amount ${sym}`,
        `Taxable ${sym}`,
      ];

      const itemHeaderH = 16;
      doc.rect(leftX, y, contentWidth, itemHeaderH).fillAndStroke(fillHeader, borderDark);

      let ix = leftX;
      for (let i = 0; i < itemColWidths.length; i++) {
        const w = itemColWidths[i];
        if (i > 0) doc.moveTo(ix, y).lineTo(ix, y + itemHeaderH).stroke(borderTable);
        const align = i === 1 ? 'left' : (i >= 4 ? 'right' : 'center');
        const textPad = i === 1 ? 5 : (i >= 4 ? 4 : 0);
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
          .text(itemColHeaders[i], ix + (i === 1 ? textPad : 0), y + 4.5, {
            width: i === 1 ? w - textPad : (i >= 4 ? w - textPad : w),
            align,
          });
        ix += w;
      }
      y += itemHeaderH;

      // Line Item Rows
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
        const desc = item.description || '-';
        const itemRowH = desc.length > 45 ? 20 : 16;
        doc.rect(leftX, y, contentWidth, itemRowH).stroke(borderDark);
        ix = leftX;

        const lineQty = Number(item.quantity || 1);
        const lineRate = Number(item.rate || 0);
        const lineAmt = item.amount !== undefined ? Number(item.amount) : lineQty * lineRate;
        const lineTaxable = item.taxableValue !== undefined ? Number(item.taxableValue) : Math.max(0, lineAmt - Number(item.discount || 0));

        const itemValues = [
          String(item.srNo || idx + 1),
          desc,
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
          const textY = (itemRowH > 16 && i !== 1) ? y + 6.5 : y + 4;

          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.8).fillColor(textDark)
            .text(val, ix + (i === 1 ? 5 : (align === 'right' ? 0 : 2)), textY, {
              width: i === 1 ? w - 8 : (align === 'right' ? w - 4 : w - 4),
              align,
              lineGap: 1.2,
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

  /**
   * Generate A4 Credit Note PDF buffer with QR verification code
   * Exactly matching the Credit Note layout format
   */
  static async generateCreditNotePDF(invoice: any, settings: any): Promise<Buffer> {
    const baseUrl = process.env.APP_URL || process.env.CLIENT_URL || 'https://logistics-rouge-omega.vercel.app';
    const verifyUrl = invoice.verificationToken
      ? `${baseUrl}/verify/cn/${invoice.verificationToken}`
      : `${baseUrl}/invoices`;

    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(verifyUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.error('Failed to generate QR code buffer:', e);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 20,
        compress: false,
        info: {
          Title: `Credit Note - ${invoice.invoiceNumber}`,
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
      const borderDark = '#1e293b';
      const borderTable = '#475569';
      const borderLight = '#94a3b8';
      const fillHeader = '#1e293b';
      const fillSubHeader = '#f8fafc';
      const textDark = '#0f172a';
      const textMuted = '#475569';
      const mskRed = '#dc2626';

      let y = 22;

      // ==========================================
      // 1. TOP HEADER (QR CODE, COMPANY DETAILS, MSK & ISO LOGOS)
      // ==========================================
      const headerBoxHeight = 78;
      doc.rect(leftX, y, contentWidth, headerBoxHeight).stroke(borderDark);

      // A. QR Code Box (Left) - "Scan to Verify Credit Note"
      const qrBoxWidth = 84;
      doc.rect(leftX, y, qrBoxWidth, headerBoxHeight).stroke(borderLight);
      doc.font('Helvetica-Bold').fontSize(5.2).fillColor(textDark)
        .text('Scan to Verify Credit Note', leftX + 2, y + 5, { width: qrBoxWidth - 4, align: 'center' });

      if (qrBuffer) {
        try {
          doc.image(qrBuffer, leftX + (qrBoxWidth - 52) / 2, y + 16, {
            fit: [52, 52],
            align: 'center',
            valign: 'center',
          });
        } catch (e) {
          // ignore
        }
      }

      // B. Center: Company Heading & Details
      const centerWidth = 370;
      const centerX = leftX + qrBoxWidth;

      doc.font('Helvetica-Bold').fontSize(13).fillColor(textDark)
        .text(settings?.companyName || 'MSK LOGISTIC SOLUTION', centerX, y + 7, {
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
          y + 37,
          { width: centerWidth, align: 'center' }
        );

      doc.font('Helvetica').fontSize(7.5).fillColor(textMuted)
        .text(
          `Email id : ${settings?.email || 'accounts@msklogisticsolution.com'}   Mob No. ${settings?.phone || '+91 8104592823'}`,
          centerX,
          y + 49,
          { width: centerWidth, align: 'center' }
        );

      doc.font('Helvetica-Bold').fontSize(7).fillColor(mskRed)
        .text(settings?.website || 'www.msklogisticsolution.com', centerX, y + 61, {
          width: centerWidth,
          align: 'center',
        });

      // C. Right: Official Logos (MSK Logo & ISO Certified Stamp)
      const rightBoxWidth = 93;
      const rightBoxX = rightX - rightBoxWidth;
      doc.rect(rightBoxX, y, rightBoxWidth, headerBoxHeight).stroke(borderLight);

      const mskLogoPath = getAssetPath('msk-logo.png');
      const isoLogoPath = getAssetPath('iso-logo.png');

      if (mskLogoPath) {
        try {
          doc.image(mskLogoPath, rightBoxX + 6, y + 6, {
            fit: [81, 38],
            align: 'center',
            valign: 'center',
          });
        } catch (e) {
          // ignore
        }
      }

      if (isoLogoPath) {
        try {
          doc.image(isoLogoPath, rightBoxX + 26, y + 46, {
            fit: [40, 26],
            align: 'center',
            valign: 'center',
          });
        } catch (e) {
          // ignore
        }
      }

      y += headerBoxHeight;

      // ==========================================
      // 2. DOCUMENT TITLE BANNER: CREDIT NOTE
      // ==========================================
      const titleBannerHeight = 22;
      doc.rect(leftX, y, contentWidth, titleBannerHeight).fill(fillHeader).stroke(borderDark);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
        .text('CREDIT NOTE (CREDIT ADJUSTMENT INVOICE)', leftX, y + 6, {
          width: contentWidth,
          align: 'center',
        });
      y += titleBannerHeight;

      // ==========================================
      // 3. CREDIT NOTE INFORMATION GRID (4 COLUMNS x 2 ROWS)
      // ==========================================
      const gridRowH = 17;
      const gridTotalH = gridRowH * 2;
      const colW1 = 136;
      const colW2 = 136;
      const colW3 = 137;
      const colW4 = 138;

      doc.rect(leftX, y, contentWidth, gridTotalH).stroke(borderDark);
      doc.moveTo(leftX, y + gridRowH).lineTo(rightX, y + gridRowH).stroke(borderLight);
      
      const v1 = leftX + colW1;
      const v2 = v1 + colW2;
      const v3 = v2 + colW3;
      doc.moveTo(v1, y).lineTo(v1, y + gridTotalH).stroke(borderLight);
      doc.moveTo(v2, y).lineTo(v2, y + gridTotalH).stroke(borderLight);
      doc.moveTo(v3, y).lineTo(v3, y + gridTotalH).stroke(borderLight);

      // Row 1
      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Credit Note No:', leftX + 4, y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(mskRed).text(invoice.invoiceNumber || '-', leftX + 4, y + 8.5);

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Date of Issue:', v1 + 4, y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark).text(formatDate(invoice.issueDate), v1 + 4, y + 8.5);

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Original Invoice No:', v2 + 4, y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark).text(invoice.originalInvoiceNumber || '-', v2 + 4, y + 8.5);

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Original Invoice Date:', v3 + 4, y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark).text(formatDate(invoice.originalInvoiceDate), v3 + 4, y + 8.5);

      // Row 2
      const r2Y = y + gridRowH;
      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Place of Supply:', leftX + 4, r2Y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.2).fillColor(textDark).text(invoice.placeOfSupply || 'Maharashtra (27)', leftX + 4, r2Y + 8.5);

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Currency:', v1 + 4, r2Y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark).text(invoice.currency || 'INR', v1 + 4, r2Y + 8.5);

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Reason for Credit:', v2 + 4, r2Y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.2).fillColor(textDark).text(invoice.reasonForCredit || 'Service Charge Adjustment', v2 + 4, r2Y + 8.5, { width: colW3 - 8 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Status:', v3 + 4, r2Y + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#16a34a').text((invoice.status || 'FINAL').toUpperCase(), v3 + 4, r2Y + 8.5);

      y += gridTotalH;

      // ==========================================
      // 4. RECIPIENT & SHIPMENT REFERENCE (SIDE-BY-SIDE)
      // ==========================================
      const partyBoxH = 68;
      const partySplitX = leftX + 273; // width: 273 and 274
      doc.rect(leftX, y, contentWidth, partyBoxH).stroke(borderDark);
      doc.moveTo(partySplitX, y).lineTo(partySplitX, y + partyBoxH).stroke(borderDark);

      // Section Subheaders
      const subHeaderH = 15;
      doc.rect(leftX, y, 273, subHeaderH).fill(fillSubHeader).stroke(borderLight);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text('BILL TO (RECIPIENT)', leftX + 6, y + 4);

      doc.rect(partySplitX, y, 274, subHeaderH).fill(fillSubHeader).stroke(borderLight);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text('SHIPMENT REFERENCE', partySplitX + 6, y + 4);

      // Left: Recipient details
      const party = invoice.party;
      const billY = y + subHeaderH + 4;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark).text(party?.name || 'N/A', leftX + 6, billY, { width: 260 });
      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text(party?.address || '-', leftX + 6, billY + 11, { width: 260 });
      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text(`City: ${party?.city || '-'} | Pincode: ${party?.pincode || '-'}`, leftX + 6, billY + 22);
      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark).text(`GSTIN: ${party?.gstin || '-'} | PAN: ${party?.pan || '-'}`, leftX + 6, billY + 33);
      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text(`State: ${party?.state || '-'} (${party?.stateCode || '-'})`, leftX + 6, billY + 43);

      // Right: Shipment reference
      const shipY = y + subHeaderH + 4;
      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Vessel / Voyage:', partySplitX + 6, shipY);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text(invoice.vesselVoyage || '-', partySplitX + 75, shipY, { width: 190 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('MBL / HBL Ref:', partySplitX + 6, shipY + 12);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text(invoice.mblHbl || '-', partySplitX + 75, shipY + 12, { width: 190 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Port of Loading:', partySplitX + 6, shipY + 24);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text(invoice.portOfLoading || '-', partySplitX + 75, shipY + 24, { width: 190 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textMuted).text('Port of Discharge:', partySplitX + 6, shipY + 36);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark).text(invoice.portOfDischarge || '-', partySplitX + 75, shipY + 36, { width: 190 });

      y += partyBoxH;

      // ==========================================
      // 5. CREDIT ADJUSTMENT TABLE (6 COLUMNS WITH CHARCOAL HEADER)
      // ==========================================
      const tableHeaderH = 18;
      const colWidths = [28, 110, 204, 65, 40, 100]; // sum = 547
      const colAligns: ('left' | 'center' | 'right')[] = ['center', 'left', 'left', 'right', 'center', 'right'];
      const headers = [
        'SR.',
        'CONTAINER NO. & SIZE',
        'DESCRIPTION OF SERVICE ADJUSTMENT',
        'RATE (INR)',
        'QTY',
        'CREDIT VALUE (INR)',
      ];

      doc.rect(leftX, y, contentWidth, tableHeaderH).fill(fillHeader).stroke(borderDark);

      let hx = leftX;
      for (let i = 0; i < headers.length; i++) {
        const w = colWidths[i];
        if (i > 0) {
          doc.moveTo(hx, y).lineTo(hx, y + tableHeaderH).stroke(borderTable);
        }
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff')
          .text(headers[i], hx + (colAligns[i] === 'center' ? 0 : 4), y + 5.5, {
            width: colAligns[i] === 'center' ? w : w - 8,
            align: colAligns[i],
          });
        hx += w;
      }
      y += tableHeaderH;

      // Line items
      const items = (invoice.items && invoice.items.length > 0) ? invoice.items : [
        {
          containerNumber: invoice.containers?.[0]?.containerNumber || '-',
          containerSize: invoice.containers?.[0]?.containerSize || '40ft',
          description: invoice.notes || 'Service Adjustment on Original Invoice',
          rate: invoice.taxableAmount || invoice.subtotal || 0,
          quantity: 1,
          amount: invoice.taxableAmount || invoice.subtotal || 0,
        }
      ];

      const itemRowH = 20;
      items.forEach((item: any, idx: number) => {
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfcfc';
        doc.rect(leftX, y, contentWidth, itemRowH).fill(rowBg).stroke(borderLight);

        let rx = leftX;
        for (let i = 0; i < colWidths.length; i++) {
          const w = colWidths[i];
          if (i > 0) {
            doc.moveTo(rx, y).lineTo(rx, y + itemRowH).stroke(borderLight);
          }

          let val = '';
          if (i === 0) val = String(idx + 1);
          else if (i === 1) {
            const cNum = item.containerNumber || invoice.containers?.[idx]?.containerNumber || '-';
            const cSize = item.containerSize || invoice.containers?.[idx]?.containerSize || '';
            val = cSize ? `${cNum} (${cSize})` : cNum;
          } else if (i === 2) val = item.description || '-';
          else if (i === 3) val = formatCurrency(item.rate, invoice.currency);
          else if (i === 4) val = String(item.quantity ?? 1);
          else if (i === 5) val = formatCurrency(item.amount, invoice.currency);

          doc.font('Helvetica').fontSize(6.8).fillColor(textDark)
            .text(val, rx + (colAligns[i] === 'center' ? 0 : 4), y + 5.5, {
              width: colAligns[i] === 'center' ? w : w - 8,
              align: colAligns[i],
            });
          rx += w;
        }
        y += itemRowH;
      });

      // Fill remaining space if few rows (keep table structured)
      const minRows = 3;
      if (items.length < minRows) {
        for (let pad = items.length; pad < minRows; pad++) {
          doc.rect(leftX, y, contentWidth, itemRowH).fill('#ffffff').stroke(borderLight);
          let px = leftX;
          for (let i = 0; i < colWidths.length; i++) {
            const w = colWidths[i];
            if (i > 0) doc.moveTo(px, y).lineTo(px, y + itemRowH).stroke(borderLight);
            px += w;
          }
          y += itemRowH;
        }
      }

      // ==========================================
      // 6. BOTTOM SUMMARY & SIGNATORY SECTION
      // ==========================================
      const bottomSplitX = leftX + 315; // Left: 315, Right: 232
      const bottomBoxH = 125;
      doc.rect(leftX, y, contentWidth, bottomBoxH).stroke(borderDark);
      doc.moveTo(bottomSplitX, y).lineTo(bottomSplitX, y + bottomBoxH).stroke(borderDark);

      // --- LEFT SIDE: Amount in Words & Legal Compliance Note ---
      const leftPadX = leftX + 8;
      const leftInnerW = 300;

      doc.font('Helvetica').fontSize(7).fillColor(textDark)
        .text('Total credit amount in words:', leftPadX, y + 6);

      const defaultWords = invoice.currency === 'USD' ? 'US Dollars Zero Only' : 'INR Zero Only';
      let wordsText = (invoice.amountInWords || defaultWords).toUpperCase();
      if (!wordsText.endsWith('ONLY')) {
        wordsText = `${wordsText} ONLY`;
      }

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(wordsText, leftPadX, y + 17, { width: leftInnerW, lineGap: 1.5 });

      // Legal & Compliance Note Box
      const noteTopY = y + 42;
      doc.moveTo(leftX, noteTopY - 4).lineTo(bottomSplitX, noteTopY - 4).stroke(borderLight);

      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
        .text('NOTES & STATUTORY COMPLIANCE:', leftPadX, noteTopY);

      doc.font('Helvetica').fontSize(6.4).fillColor(textMuted)
        .text(
          `1. This Credit Note is issued in accordance with Section 34 of the CGST Act, 2017 against Original Tax Invoice ${invoice.originalInvoiceNumber || 'referenced above'}.\n2. Input Tax Credit (ITC) reversed / credited shall be adjusted in GSTR-1 & GSTR-3B filings.\n3. All credit adjustments are subject to final accounts reconciliation.\n4. Scan the top-left QR code anytime to verify the authenticity of this document.`,
          leftPadX,
          noteTopY + 11,
          { width: leftInnerW, lineGap: 2 }
        );

      // --- RIGHT SIDE: Tax Summary & Authorized Signatory ---
      const rightPadX = bottomSplitX + 8;
      const rightInnerW = rightX - bottomSplitX - 16;
      let ry = y + 6;
      const curr = invoice.currency === 'USD' ? '$' : '₹';

      // Subtotal Taxable Amount
      doc.font('Helvetica').fontSize(7.5).fillColor(textDark)
        .text('Subtotal Taxable Amount:', rightPadX, ry);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(`${curr} ${formatCurrency(invoice.taxableAmount ?? invoice.subtotal, invoice.currency)}`, rightPadX, ry, {
          width: rightInnerW,
          align: 'right',
        });
      ry += 15;

      // Taxes (IGST or CGST + SGST)
      if (invoice.isInterState) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#7c3aed')
          .text(`Add: IGST (${invoice.igstRate || 18}%):`, rightPadX, ry);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#7c3aed')
          .text(`${curr} ${formatCurrency(invoice.igstAmount, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerW,
            align: 'right',
          });
        ry += 15;
      } else {
        doc.font('Helvetica').fontSize(7.5).fillColor('#7c3aed')
          .text(`Add: CGST (${invoice.cgstRate || 9}%):`, rightPadX, ry);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#7c3aed')
          .text(`${curr} ${formatCurrency(invoice.cgstAmount, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerW,
            align: 'right',
          });
        ry += 14;

        doc.font('Helvetica').fontSize(7.5).fillColor('#7c3aed')
          .text(`Add: SGST (${invoice.sgstRate || 9}%):`, rightPadX, ry);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#7c3aed')
          .text(`${curr} ${formatCurrency(invoice.sgstAmount, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerW,
            align: 'right',
          });
        ry += 15;
      }

      // Round off
      if (invoice.roundOff && Math.abs(invoice.roundOff) > 0.001) {
        doc.font('Helvetica').fontSize(7.2).fillColor(textMuted)
          .text('Round Off:', rightPadX, ry);
        doc.font('Helvetica').fontSize(7.2).fillColor(textMuted)
          .text(`${curr} ${formatCurrency(invoice.roundOff, invoice.currency)}`, rightPadX, ry, {
            width: rightInnerW,
            align: 'right',
          });
        ry += 13;
      }

      // TOTAL CREDIT VALUE
      doc.moveTo(bottomSplitX, ry).lineTo(rightX, ry).stroke(borderLight);
      ry += 4;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark)
        .text('TOTAL CREDIT VALUE:', rightPadX, ry);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(mskRed)
        .text(`${curr} ${formatCurrency(invoice.grandTotal, invoice.currency)}`, rightPadX, ry, {
          width: rightInnerW,
          align: 'right',
        });

      // Signatory Section
      const signDividerY = ry + 16;
      doc.moveTo(bottomSplitX, signDividerY).lineTo(rightX, signDividerY).stroke(borderTable);

      const signY = signDividerY + 4;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(`For ${settings?.companyName || 'MSK LOGISTIC SOLUTION'}`, bottomSplitX, signY, {
          width: rightX - bottomSplitX,
          align: 'center',
        });

      if (settings?.signatureUrl && fs.existsSync(settings.signatureUrl)) {
        try {
          doc.image(settings.signatureUrl, bottomSplitX + (rightX - bottomSplitX - 80) / 2, signY + 12, {
            fit: [80, 24],
            align: 'center',
          });
        } catch (e) {
          // ignore
        }
      }

      doc.font('Helvetica').fontSize(7).fillColor(textMuted)
        .text('Authorised Signatory', bottomSplitX, signY + 36, {
          width: rightX - bottomSplitX,
          align: 'center',
        });

      // Finalize document
      doc.end();
    });
  }
}
