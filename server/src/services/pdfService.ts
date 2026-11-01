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

    if (invoice.billType === 'HT_BILL') {
      return PDFService.generateHtBillPDF(invoice, settings);
    }

    if (invoice.billType === 'EMPTY_CONTAINER') {
      return PDFService.generateEmptyContainerPDF(invoice, settings);
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

  /**
   * Generate A4 Empty Container Bill PDF buffer
   * Strictly fitted to ONE single A4 portrait page with QR verification code
   * Exactly matching the Empty Container Bill layout format
   */
  static async generateEmptyContainerPDF(invoice: any, settings: any): Promise<Buffer> {
    const baseUrl = process.env.APP_URL || process.env.CLIENT_URL || 'https://logistics-rouge-omega.vercel.app';
    const verifyUrl = invoice.verificationToken
      ? `${baseUrl}/verify/empty/${invoice.verificationToken}`
      : `${baseUrl}/invoices`;

    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(verifyUrl, {
        width: 110,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.error('Failed to generate QR code buffer for Empty Container Bill:', e);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 18,
        compress: false,
        info: {
          Title: `Empty Container Tax Invoice - ${invoice.invoiceNumber}`,
          Author: settings?.companyName || 'MSK LOGISTIC SOLUTION',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const leftX = 22;
      const contentWidth = 551;
      const rightX = leftX + contentWidth; // 573
      const borderDark = '#0f172a';
      const borderLight = '#94a3b8';
      const textDark = '#0f172a';
      const textMuted = '#475569';
      const mskRed = '#dc2626';

      let y = 18;

      // ==========================================
      // 1. TOP HEADER (QR CODE, MSK BRANDING & TAX INVOICE)
      // ==========================================
      const headerBoxHeight = 62;
      doc.rect(leftX, y, contentWidth, headerBoxHeight).stroke(borderDark);

      // A. QR Code Box (Left)
      const qrBoxWidth = 68;
      doc.rect(leftX, y, qrBoxWidth, headerBoxHeight).stroke(borderLight);
      doc.font('Helvetica-Bold').fontSize(5.2).fillColor(textDark)
        .text('Scan to Verify Empty Bill', leftX + 2, y + 4, { width: qrBoxWidth - 4, align: 'center' });

      if (qrBuffer) {
        try {
          doc.image(qrBuffer, leftX + 10, y + 12, { width: 48, height: 48 });
        } catch (e) {
          // ignore
        }
      }

      // B. Company Brand & Details (Center)
      const brandX = leftX + qrBoxWidth + 8;
      const brandWidth = 285;

      const logoPath = getAssetPath('msk-logo.png');
      let textStartX = brandX;
      if (logoPath) {
        try {
          doc.image(logoPath, brandX, y + 5, { fit: [42, 26] });
          textStartX = brandX + 46;
        } catch (e) {
          // ignore
        }
      }

      doc.font('Helvetica-Bold').fontSize(11).fillColor(mskRed)
        .text(settings?.companyName || 'MSK LOGISTIC SOLUTION', textStartX, y + 5, { width: brandWidth - (textStartX - brandX) });

      doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
        .text(settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai 400702', brandX, y + 25, {
          width: brandWidth,
          lineGap: 1,
        });

      doc.font('Helvetica').fontSize(6).fillColor(textMuted)
        .text(`Email: ${settings?.email || 'accounts@msklogisticsolution.com'} | Web: ${settings?.website || 'www.msklogisticsolution.com'}`, brandX, y + 45, {
          width: brandWidth,
        });

      // C. Tax Invoice & GSTIN (Right)
      const infoBoxX = rightX - 175;
      const infoBoxWidth = 175;

      doc.font('Helvetica-Bold').fontSize(14).fillColor(textDark)
        .text('TAX INVOICE', infoBoxX, y + 6, { width: infoBoxWidth - 8, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(`GSTIN: ${settings?.gstin || '27AXWPK4562G1ZX'}`, infoBoxX, y + 25, { width: infoBoxWidth - 8, align: 'right' });

      doc.font('Helvetica').fontSize(6.5).fillColor(textMuted)
        .text(`CIN: ${settings?.cin || 'U63090MH2026PTC123456'}`, infoBoxX, y + 37, { width: infoBoxWidth - 8, align: 'right' });

      y += headerBoxHeight + 3;

      // ==========================================
      // 2. META BAR (INVOICE NO, DATE, GATE PASS, EIR, TERMS)
      // ==========================================
      const metaBoxH = 26;
      doc.rect(leftX, y, contentWidth, metaBoxH).fillAndStroke('#f8fafc', borderDark);

      const invDateStr = invoice.invoiceDate
        ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const stateDisplay = invoice.billToState ? `${invoice.billToState} (Code ${invoice.billToStateCode || '27'})` : 'Maharashtra (Code 27)';
      const tgp = invoice.consigneeName || 'TGP-948102';
      const eir = invoice.sbNumbers || 'EIR-48190';
      const payTerms = 'Net 15 Days';

      // Row 1
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Invoice No: ', leftX + 6, y + 4, { continued: true })
        .font('Helvetica-Bold').fillColor(mskRed).text(invoice.invoiceNumber, { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Date of Issue: ', leftX + 185, y + 4, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invDateStr, { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Place of Supply: ', leftX + 370, y + 4, { continued: true })
        .font('Helvetica').fillColor(textDark).text(stateDisplay, { continued: false });

      // Row 2
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Terminal Gate Pass: ', leftX + 6, y + 15, { continued: true })
        .font('Helvetica').fillColor(textDark).text(tgp, { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('EIR / LoLo Receipt: ', leftX + 185, y + 15, { continued: true })
        .font('Helvetica').fillColor(textDark).text(eir, { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Payment Terms: ', leftX + 370, y + 15, { continued: true })
        .font('Helvetica').fillColor(textDark).text(payTerms, { continued: false });

      y += metaBoxH + 4;

      // ==========================================
      // 3. SUPPLIER / ISSUING DEPOT & BILL TO (TWO COLUMNS)
      // ==========================================
      const supBoxH = 50;
      doc.rect(leftX, y, contentWidth, supBoxH).stroke(borderDark);

      const colSplitX = leftX + 275;
      doc.moveTo(colSplitX, y).lineTo(colSplitX, y + supBoxH).stroke(borderDark);

      // Left Column: Supplier / Issuing Depot
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('SUPPLIER / ISSUING DEPOT:', leftX + 6, y + 4);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text('MSK Nhava Sheva CFS & Empty Depot', leftX + 6, y + 15, { width: 260 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textDark)
        .text('Dronagiri Node, Sector 3, Nhava Sheva, Navi Mumbai, MH 400702', leftX + 6, y + 25, { width: 260 });

      doc.font('Helvetica-Bold').fontSize(7).fillColor(textMuted)
        .text('State: Maharashtra | State Code: 27', leftX + 6, y + 37);

      // Right Column: Bill To (Recipient)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('BILL TO (RECIPIENT):', colSplitX + 6, y + 4);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text(invoice.billToName || 'RECIPIENT PARTY', colSplitX + 6, y + 15, { width: 260 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textDark)
        .text(invoice.billToAddress || 'Registered Billing Address', colSplitX + 6, y + 25, { width: 260 });

      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark)
        .text(`GSTIN: ${invoice.billToGstin || 'URP'}`, colSplitX + 6, y + 37);

      y += supBoxH + 4;

      // ==========================================
      // 4. SHIPMENT & TRANSPORT REFERENCE GROUNDING (FULL-WIDTH)
      // ==========================================
      const shipBoxH = 32;
      doc.rect(leftX, y, contentWidth, shipBoxH).fillAndStroke('#f8fafc', borderDark);

      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark)
        .text('SHIPMENT & TRANSPORT REFERENCE GROUNDING', leftX + 6, y + 4);

      // Row 1
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Vessel/Voyage: ', leftX + 6, y + 14, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.vesselVoyage || 'Pacific Pioneer / V-042E', { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Master B/L No.: ', leftX + 185, y + 14, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.mblHbl || 'MEDU67201948', { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Delivery Order: ', leftX + 370, y + 14, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.portOfLoading || 'DO-77821', { continued: false });

      // Row 2
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Transporter: ', leftX + 6, y + 22, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.portOfDischarge || 'Shri Mahalakshmi Logistics', { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Vehicle No.: ', leftX + 185, y + 22, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.consigneeName || 'MH-46-AR-8812', { continued: false });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textMuted).text('Currency: ', leftX + 370, y + 22, { continued: true })
        .font('Helvetica-Bold').fillColor(textDark).text('INR (₹)', { continued: false });

      y += shipBoxH + 5;

      // ==========================================
      // 5. SECTION 1 — EQUIPMENT TRACKING & OPERATION TIMELINES
      // ==========================================
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(textDark)
        .text('1. EQUIPMENT TRACKING & OPERATION TIMELINES', leftX, y);
      y += 10;

      // Table Header
      const eqColW = [125, 80, 85, 85, 80, 96];
      const eqColX = [leftX];
      for (let i = 0; i < eqColW.length; i++) {
        eqColX.push(eqColX[i] + eqColW[i]);
      }

      const eqHeaderH = 14;
      doc.rect(leftX, y, contentWidth, eqHeaderH).fillAndStroke('#1e293b', borderDark);

      const eqHeaders = [
        'CONTAINER NO.',
        'SIZE / TYPE',
        'GATE-IN DATE',
        'GATE-OUT DATE',
        'FREE DAYS',
        'STORAGE DAYS',
      ];

      doc.font('Helvetica-Bold').fontSize(5.8).fillColor('#ffffff');
      eqHeaders.forEach((h, i) => {
        const align = i === 0 ? 'left' : 'center';
        const padX = i === 0 ? eqColX[i] + 4 : eqColX[i];
        const padW = i === 0 ? eqColW[i] - 6 : eqColW[i];
        doc.text(h, padX, y + 4, { width: padW, align });
      });

      y += eqHeaderH;

      const containers = (invoice.containers && invoice.containers.length > 0)
        ? invoice.containers
        : [
            {
              containerNumber: 'MSCU4810294',
              size: "40' HC",
              type: 'Dry',
              emptyGateInDate: '2026-10-12',
              lddOutDate: '2026-10-24',
              emptyGroundDays: 3,
              loadedGroundDays: 12,
              daysAfterCarting: 9,
            },
            {
              containerNumber: 'MSCU9182740',
              size: "40' HC",
              type: 'Dry',
              emptyGateInDate: '2026-10-12',
              lddOutDate: '2026-10-24',
              emptyGroundDays: 3,
              loadedGroundDays: 12,
              daysAfterCarting: 9,
            },
          ];

      const eqRowH = 15;
      const eqTableTop = y - eqHeaderH;

      const fmtD = (dVal: any) => {
        if (!dVal) return '-';
        const dt = new Date(dVal);
        return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      containers.forEach((c: any, idx: number) => {
        const isAlt = idx % 2 === 1;
        doc.rect(leftX, y, contentWidth, eqRowH).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', borderLight);

        let sDays = c.loadedGroundDays;
        let freeD = c.emptyGroundDays || 3;
        let chgDays = c.daysAfterCarting;

        if ((sDays === undefined || sDays === null) && c.emptyGateInDate && c.lddOutDate) {
          const t1 = new Date(c.emptyGateInDate).getTime();
          const t2 = new Date(c.lddOutDate).getTime();
          if (!isNaN(t1) && !isNaN(t2) && t2 >= t1) {
            sDays = Math.max(0, Math.round((t2 - t1) / (1000 * 3600 * 24)));
            chgDays = Math.max(0, sDays - freeD);
          }
        }

        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
          .text(c.containerNumber || 'CONTAINER', eqColX[0] + 4, y + 4, { width: eqColW[0] - 6 });

        doc.font('Helvetica').fontSize(6.5).fillColor(textDark);
        doc.text(`${c.size || "40'"} ${c.type || 'Dry'}`, eqColX[1], y + 4, { width: eqColW[1], align: 'center' });
        doc.text(fmtD(c.emptyGateInDate), eqColX[2], y + 4, { width: eqColW[2], align: 'center' });
        doc.text(fmtD(c.lddOutDate), eqColX[3], y + 4, { width: eqColW[3], align: 'center' });
        doc.text(`${freeD} Days`, eqColX[4], y + 4, { width: eqColW[4], align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0f766e');
        doc.text(`${sDays || 0} Days (Charge: ${chgDays || 0}D)`, eqColX[5], y + 4, { width: eqColW[5], align: 'center' });

        y += eqRowH;
      });

      doc.rect(leftX, eqTableTop, contentWidth, y - eqTableTop).stroke(borderDark);
      y += 5;

      // ==========================================
      // 6. SECTION 2 — ITEMISED TARIFF & FINANCIAL CHARGES
      // ==========================================
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(textDark)
        .text('2. ITEMISED TARIFF & FINANCIAL CHARGES', leftX, y);
      y += 10;

      // Charge Table Columns
      const chColW = [24, 260, 56, 68, 38, 105];
      const chColX = [leftX];
      for (let i = 0; i < chColW.length; i++) {
        chColX.push(chColX[i] + chColW[i]);
      }

      const chargeHeaderH = 14;
      doc.rect(leftX, y, contentWidth, chargeHeaderH).fillAndStroke('#1e293b', borderDark);

      const chHeaders = [
        'SR.',
        'DESCRIPTION OF SERVICE CHARGES',
        'SAC CODE',
        'RATE (INR)',
        'QTY',
        'TAXABLE VALUE (INR)',
      ];

      doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#ffffff');
      chHeaders.forEach((h, i) => {
        const align = i === 1 ? 'left' : (i >= 3 ? 'right' : 'center');
        const padX = i === 1 ? chColX[i] + 4 : (i >= 3 ? chColX[i] : chColX[i]);
        const padW = i === 1 ? chColW[i] - 8 : (i >= 3 ? chColW[i] - 5 : chColW[i]);
        doc.text(h, padX, y + 4, { width: padW, align });
      });

      y += chargeHeaderH;

      const items = (invoice.items && invoice.items.length > 0)
        ? invoice.items
        : [
            { srNo: 1, description: 'Empty Container Lift-On (LoLo) Fees', hsnSacCode: '996719', rate: 1500, quantity: 2, taxableValue: 3000 },
            { srNo: 2, description: 'Empty Depot Ground Storage Charges (Total 18 Chargeable Days)', hsnSacCode: '996711', rate: 450, quantity: 18, taxableValue: 8100 },
            { srNo: 3, description: 'Terminal Survey & Cleaning Charges', hsnSacCode: '996713', rate: 850, quantity: 2, taxableValue: 1700 },
          ];

      const chRowH = 14;
      const chargesTableTop = y - chargeHeaderH;
      const fmtCurrency = (n: number) => {
        return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      items.forEach((item: any, idx: number) => {
        const isAlt = idx % 2 === 1;
        doc.rect(leftX, y, contentWidth, chRowH).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', borderLight);

        doc.font('Helvetica').fontSize(6.5).fillColor(textDark);
        doc.text(String(item.srNo || idx + 1), chColX[0], y + 4, { width: chColW[0], align: 'center' });
        doc.text(item.description || '-', chColX[1] + 4, y + 4, { width: chColW[1] - 8, align: 'left' });
        doc.text(item.hsnSacCode || '996719', chColX[2], y + 4, { width: chColW[2], align: 'center' });
        doc.text(fmtCurrency(item.rate), chColX[3], y + 4, { width: chColW[3] - 5, align: 'right' });
        doc.text(String(item.quantity || 1), chColX[4], y + 4, { width: chColW[4], align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6.5);
        doc.text(fmtCurrency(item.taxableValue || item.amount || (item.rate * item.quantity)), chColX[5], y + 4, { width: chColW[5] - 5, align: 'right' });

        y += chRowH;
      });

      doc.rect(leftX, chargesTableTop, contentWidth, y - chargesTableTop).stroke(borderDark);

      // ==========================================
      // 7. TOTALS SUMMARY BOX (RIGHT-ALIGNED)
      // ==========================================
      const totalsW = 205;
      const totalsX = rightX - totalsW;
      const totalRowH = 12;

      const subtotalTaxable = invoice.taxableAmount || 12800;
      const cgstAmt = invoice.cgstAmount !== undefined ? invoice.cgstAmount : 1152;
      const sgstAmt = invoice.sgstAmount !== undefined ? invoice.sgstAmount : 1152;
      const igstAmt = invoice.igstAmount !== undefined ? invoice.igstAmount : 0;
      const grandTotal = invoice.grandTotal || 15104;
      const cgstRate = invoice.cgstRate || 9;
      const sgstRate = invoice.sgstRate || 9;
      const igstRate = invoice.igstRate || 18;

      // Subtotal Taxable
      doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textDark)
        .text('Subtotal Taxable Amount', totalsX + 6, y + 3, { width: 105 });
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textDark)
        .text(fmtCurrency(subtotalTaxable), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
      y += totalRowH;

      if (igstAmt > 0) {
        doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(`IGST @ ${igstRate}%`, totalsX + 6, y + 3, { width: 105 });
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(fmtCurrency(igstAmt), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
        y += totalRowH;
      } else {
        doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(`CGST @ ${cgstRate}%`, totalsX + 6, y + 3, { width: 105 });
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(fmtCurrency(cgstAmt), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
        y += totalRowH;

        doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(`SGST @ ${sgstRate}%`, totalsX + 6, y + 3, { width: 105 });
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(fmtCurrency(sgstAmt), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
        y += totalRowH;
      }

      // Grand Total Row
      const grandTotalH = 14;
      doc.rect(totalsX, y, totalsW, grandTotalH).fillAndStroke('#f1f5f9', borderDark);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('Total Invoice Value (INR)', totalsX + 6, y + 3.5, { width: 110 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(mskRed)
        .text(`₹ ${fmtCurrency(grandTotal)}`, totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
      y += grandTotalH + 5;

      // ==========================================
      // 8. AMOUNT IN WORDS
      // ==========================================
      const wordsBoxH = 13;
      doc.rect(leftX, y, contentWidth, wordsBoxH).fillAndStroke('#f8fafc', borderDark);
      let wordsText = invoice.amountInWords || 'INR Fifteen Thousand One Hundred Four Only';
      if (!wordsText.toLowerCase().startsWith('inr') && !wordsText.toLowerCase().startsWith('rs')) {
        wordsText = `INR ${wordsText}`;
      }
      if (!wordsText.toLowerCase().endsWith('only')) {
        wordsText = `${wordsText} Only`;
      }
      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
        .text(`Amount in words: ${wordsText}`, leftX + 6, y + 3, { width: contentWidth - 12 });
      y += wordsBoxH + 4;

      // ==========================================
      // 9. TERMS & CONDITIONS AND BANK REMITTANCE (TWO COLUMNS)
      // ==========================================
      const bottomBoxH = 50;
      const termsW = 310;
      const bankW = contentWidth - termsW; // 241
      const bankX = leftX + termsW;

      // Terms box (Left)
      doc.rect(leftX, y, termsW, bottomBoxH).stroke(borderDark);
      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
        .text('Terms & Conditions:', leftX + 6, y + 4);

      const termsList = [
        '1. EIR verification and physical condition inspection must be acknowledged before gate-out.',
        '2. Storage slab calculations and demurrage accrue according to the standard empty depot tariff.',
        '3. No claims for discrepancies or damaged equipment will be entertained unless notified in writing within 7 days.',
      ];

      let termY = y + 14;
      doc.font('Helvetica').fontSize(5.8).fillColor(textDark);
      termsList.forEach((t) => {
        doc.text(t, leftX + 6, termY, { width: termsW - 12, lineGap: 1 });
        termY += 10;
      });

      // Bank Remittance Box (Right)
      doc.rect(bankX, y, bankW, bottomBoxH).fillAndStroke('#f8fafc', borderDark);
      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(textDark)
        .text('Bank Remittance Details:', bankX + 6, y + 4);

      doc.font('Helvetica').fontSize(6.2).fillColor(textDark);
      doc.text(`Bank Name: ${settings?.bankName || 'ICICI Bank'}`, bankX + 6, y + 14);
      doc.text(`A/C Name: ${settings?.bankAccountName || 'MSK LOGISTIC SOLUTION'}`, bankX + 6, y + 22);
      doc.text(`A/C Number: ${settings?.bankAccountNo || '574005000006'}`, bankX + 6, y + 30);
      doc.text(`IFSC: ${settings?.bankIfsc || 'ICIC0005740'}  |  Branch: ${settings?.bankBranch || 'Dronagiri Node'}`, bankX + 6, y + 38);

      y += bottomBoxH + 4;

      // ==========================================
      // 10. SIGNATURE & SYSTEM STAMP FOOTER
      // ==========================================
      const signBoxH = 38;
      doc.rect(leftX, y, contentWidth, signBoxH).stroke(borderDark);

      const tokenRef = invoice.verificationToken ? invoice.verificationToken.slice(0, 12).toUpperCase() : 'VERIFIED';
      doc.font('Helvetica').fontSize(6.5).fillColor(textMuted)
        .text(`Generated System Stamp: MSK ERP Verified Authentic (Ref: ${tokenRef})`, leftX + 8, y + 13, { width: 280 });

      const sigX = rightX - 190;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(`For ${settings?.companyName || 'MSK LOGISTIC SOLUTION'}`, sigX, y + 5, { width: 180, align: 'center' });

      if (settings?.signatureUrl && fs.existsSync(settings.signatureUrl)) {
        try {
          doc.image(settings.signatureUrl, sigX + 50, y + 15, { fit: [80, 14], align: 'center' });
        } catch (e) {
          // ignore
        }
      }

      doc.font('Helvetica').fontSize(6.5).fillColor(textMuted)
        .text('Authorised Signatory', sigX, y + 24, { width: 180, align: 'center' });

      // Page Indicator
      doc.font('Helvetica').fontSize(6).fillColor(textMuted)
        .text('Page 1 of 1', leftX, y + signBoxH + 2, { width: contentWidth, align: 'right' });

      doc.end();
    });
  }

  /**
   * Generate A4 H & T Bill (Handling & Transportation Tax Invoice) PDF buffer
   * Strictly fitted to ONE single A4 portrait page with QR verification code
   * Exactly matching the uploaded Reference Images 1 & 2 layout format
   */
  static async generateHtBillPDF(invoice: any, settings: any): Promise<Buffer> {
    const baseUrl = process.env.APP_URL || process.env.CLIENT_URL || 'https://logistics-rouge-omega.vercel.app';
    const verifyUrl = invoice.verificationToken
      ? `${baseUrl}/verify/ht/${invoice.verificationToken}`
      : `${baseUrl}/invoices`;

    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(verifyUrl, {
        width: 110,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.error('Failed to generate QR code buffer for H&T Bill:', e);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 18,
        compress: false,
        info: {
          Title: `H & T Tax Invoice - ${invoice.invoiceNumber}`,
          Author: settings?.companyName || 'MSK LOGISTIC SOLUTION',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const leftX = 22;
      const contentWidth = 551;
      const rightX = leftX + contentWidth; // 573
      const borderDark = '#0f172a';
      const borderTable = '#334155';
      const borderLight = '#94a3b8';
      const fillHeader = '#1e293b';
      const fillSubHeader = '#f8fafc';
      const textDark = '#0f172a';
      const textMuted = '#475569';
      const mskRed = '#dc2626';

      let y = 18;

      // ==========================================
      // 1. TOP HEADER (QR CODE, MSK BRANDING & TAX INVOICE DETAILS)
      // ==========================================
      const headerBoxHeight = 66;
      doc.rect(leftX, y, contentWidth, headerBoxHeight).stroke(borderDark);

      // A. QR Code Box (Left) - "Scan to Verify H&T Bill"
      const qrBoxWidth = 72;
      doc.rect(leftX, y, qrBoxWidth, headerBoxHeight).stroke(borderLight);
      doc.font('Helvetica-Bold').fontSize(5.2).fillColor(textDark)
        .text('Scan to Verify Invoice', leftX + 2, y + 4, { width: qrBoxWidth - 4, align: 'center' });

      if (qrBuffer) {
        try {
          doc.image(qrBuffer, leftX + 11, y + 13, { width: 50, height: 50 });
        } catch (e) {
          // ignore
        }
      }

      // B. Company Brand & Details (Center-Left)
      const brandX = leftX + qrBoxWidth + 8;
      const brandWidth = 275;

      // Logo + Name row
      const logoPath = getAssetPath('msk-logo.png');
      let textStartX = brandX;
      if (logoPath) {
        try {
          doc.image(logoPath, brandX, y + 5, { fit: [42, 28] });
          textStartX = brandX + 46;
        } catch (e) {
          // ignore
        }
      }

      doc.font('Helvetica-Bold').fontSize(11).fillColor(mskRed)
        .text(settings?.companyName || 'MSK LOGISTIC SOLUTION', textStartX, y + 5, { width: brandWidth - (textStartX - brandX) });

      doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
        .text(settings?.address || 'JNPT Township Colony, Sector - 3, Building No. B/48, Office No. 3, Navi Mumbai 400702', brandX, y + 27, {
          width: brandWidth,
          lineGap: 1,
        });

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textDark)
        .text(`GSTIN: ${settings?.gstin || '27AXWPK4562G1ZX'} | PAN: ${settings?.pan || 'AXWPK4562G'}`, brandX, y + 45, {
          width: brandWidth,
        });

      doc.font('Helvetica').fontSize(6).fillColor(textMuted)
        .text(`Email: ${settings?.email || 'accounts@msklogisticsolution.com'} | Web: ${settings?.website || 'www.msklogisticsolution.com'}`, brandX, y + 55, {
          width: brandWidth,
        });

      // C. Tax Invoice Details (Right Box)
      const infoBoxX = rightX - 185;
      const infoBoxWidth = 185;

      doc.font('Helvetica-Bold').fontSize(15).fillColor(textDark)
        .text('TAX INVOICE', infoBoxX, y + 6, { width: infoBoxWidth - 8, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text(`Invoice No: ${invoice.invoiceNumber}`, infoBoxX, y + 26, { width: infoBoxWidth - 8, align: 'right' });

      const invDateStr = invoice.invoiceDate
        ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.font('Helvetica').fontSize(7.5).fillColor(textDark)
        .text(`Date: ${invDateStr}`, infoBoxX, y + 38, { width: infoBoxWidth - 8, align: 'right' });

      const stateDisplay = invoice.billToState ? `${invoice.billToState} (Code ${invoice.billToStateCode || '27'})` : 'Maharashtra (Code 27)';
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textMuted)
        .text(`Place of Supply: ${stateDisplay}`, infoBoxX, y + 50, { width: infoBoxWidth - 8, align: 'right' });

      y += headerBoxHeight + 4;

      // ==========================================
      // 2. BILL TO & SHIPMENT REFERENCE (TWO COLUMNS)
      // ==========================================
      const refBoxHeight = 56;
      doc.rect(leftX, y, contentWidth, refBoxHeight).stroke(borderDark);

      const colSplitX = leftX + 275;
      doc.moveTo(colSplitX, y).lineTo(colSplitX, y + refBoxHeight).stroke(borderDark);

      // Left Column: Bill To
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('BILL TO (RECIPIENT):', leftX + 6, y + 5);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark)
        .text(invoice.billToName || 'RECIPIENT PARTY', leftX + 6, y + 16, { width: 260 });

      doc.font('Helvetica').fontSize(6.8).fillColor(textDark)
        .text(invoice.billToAddress || 'Registered Office Address', leftX + 6, y + 27, { width: 260, lineGap: 1 });

      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark)
        .text(`GSTIN: ${invoice.billToGstin || 'URP'}`, leftX + 6, y + 43);

      // Right Column: Shipment Reference
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('SHIPMENT REFERENCE:', colSplitX + 6, y + 5);

      const rightInnerW = rightX - colSplitX - 12;

      doc.font('Helvetica-Bold').fontSize(7).fillColor(textMuted).text('Vessel/Voyage: ', colSplitX + 6, y + 16, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.vesselVoyage || 'Pacific Pioneer / V-042E');

      doc.font('Helvetica-Bold').fontSize(7).fillColor(textMuted).text('MBL / HBL No: ', colSplitX + 6, y + 28, { continued: true })
        .font('Helvetica').fillColor(textDark).text(invoice.mblHbl || 'MEDU67201948 / AGLPNE0941');

      const pol = invoice.portOfLoading || 'Nhava Sheva (INNSA)';
      const pod = invoice.portOfDischarge || 'Rotterdam (NLRTM)';
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textMuted).text('Port of Loading/Discharge: ', colSplitX + 6, y + 40, { continued: true })
        .font('Helvetica').fillColor(textDark).text(`${pol} / ${pod}`);

      y += refBoxHeight + 5;

      // ==========================================
      // 3. SECTION 1 — CONTAINER TRACKING, MILESTONES & PERIOD CALCULATIONS
      // ==========================================
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(textDark)
        .text('1. CONTAINER TRACKING, MILESTONES & PERIOD CALCULATIONS', leftX, y);
      y += 11;

      // Container Table Header Heights
      const superHeaderHeight = 11;
      const subHeaderHeight = 14;
      const containerTableTop = y;

      // Columns Widths (Total: 551)
      const cColW = [135, 58, 58, 58, 62, 60, 60, 60];
      const cColX = [leftX];
      for (let i = 0; i < cColW.length; i++) {
        cColX.push(cColX[i] + cColW[i]);
      }

      // Group 1 Header: Over Cols 1-4 (Timeline Dates)
      const datesGroupX = cColX[1];
      const datesGroupW = cColW[1] + cColW[2] + cColW[3] + cColW[4]; // 236
      doc.rect(datesGroupX, y, datesGroupW, superHeaderHeight).fillAndStroke('#334155', borderDark);
      doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#ffffff')
        .text('OPERATIONAL MILESTONE TIMELINE DATES', datesGroupX, y + 3, { width: datesGroupW, align: 'center' });

      // Group 2 Header: Over Cols 5-7 (Days Calculation Breakdown)
      const daysGroupX = cColX[5];
      const daysGroupW = cColW[5] + cColW[6] + cColW[7]; // 180
      doc.rect(daysGroupX, y, daysGroupW, superHeaderHeight).fillAndStroke('#1e293b', borderDark);
      doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#ffffff')
        .text('DAYS CALCULATION BREAKDOWN', daysGroupX, y + 3, { width: daysGroupW, align: 'center' });

      // Container Col 0 Super Header Box
      doc.rect(cColX[0], y, cColW[0], superHeaderHeight).fillAndStroke('#1e293b', borderDark);

      y += superHeaderHeight;

      // Sub-Headers Row
      doc.rect(leftX, y, contentWidth, subHeaderHeight).fillAndStroke('#1e293b', borderDark);

      const cHeaders = [
        'CONTAINER NO. & SIZE/TYPE',
        'EMPTY PICK-UP',
        'STUFFING DATE',
        'CARTING DATE',
        'LOADED GATE-IN',
        'EMPTY DAYS\n(PICK-UP TO STUFF)',
        'CARGO DAYS\n(STUFF TO CART)',
        'LOADED DAYS\n(CART TO GATE-IN)',
      ];

      doc.font('Helvetica-Bold').fontSize(5.2).fillColor('#ffffff');
      cHeaders.forEach((h, i) => {
        const align = i === 0 ? 'left' : 'center';
        const padX = i === 0 ? cColX[i] + 4 : cColX[i];
        const padW = i === 0 ? cColW[i] - 6 : cColW[i];
        doc.text(h, padX, y + 2, { width: padW, align });
      });

      y += subHeaderHeight;

      // Container Data Rows
      const containers = (invoice.containers && invoice.containers.length > 0)
        ? invoice.containers
        : [
            {
              containerNumber: 'MSCU4810294',
              size: "40' HC",
              type: 'Dry',
              emptyGateInDate: '2026-10-12',
              stuffingDate: '2026-10-15',
              cartingDate: '2026-10-19',
              lddOutDate: '2026-10-24',
              emptyGroundDays: 3,
              daysAfterCarting: 4,
              loadedGroundDays: 5,
            },
            {
              containerNumber: 'MSCU9182740',
              size: "40' HC",
              type: 'Dry',
              emptyGateInDate: '2026-10-12',
              stuffingDate: '2026-10-16',
              cartingDate: '2026-10-20',
              lddOutDate: '2026-10-24',
              emptyGroundDays: 4,
              daysAfterCarting: 4,
              loadedGroundDays: 4,
            },
          ];

      const cRowHeight = 15;
      containers.forEach((c: any, idx: number) => {
        const isAlt = idx % 2 === 1;
        doc.rect(leftX, y, contentWidth, cRowHeight).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', borderLight);

        // Date calculations
        const fmtD = (dVal: any) => {
          if (!dVal) return '-';
          const dt = new Date(dVal);
          return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        const calcDays = (d1: any, d2: any, stored: number) => {
          if (stored !== undefined && stored !== null && Number(stored) > 0) return `${stored} Days`;
          if (!d1 || !d2) return '-';
          const dt1 = new Date(d1).getTime();
          const dt2 = new Date(d2).getTime();
          if (isNaN(dt1) || isNaN(dt2) || dt2 < dt1) return '-';
          const diff = Math.max(0, Math.round((dt2 - dt1) / (1000 * 3600 * 24)));
          return `${diff} Days`;
        };

        const emptyD = calcDays(c.emptyGateInDate, c.stuffingDate, c.emptyGroundDays);
        const cargoD = calcDays(c.stuffingDate, c.cartingDate, c.daysAfterCarting);
        const loadedD = calcDays(c.cartingDate, c.lddOutDate, c.loadedGroundDays);

        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textDark)
          .text(`${c.containerNumber || 'CONTAINER'}`, cColX[0] + 4, y + 2, { width: cColW[0] - 8 });
        doc.font('Helvetica').fontSize(5.8).fillColor(textMuted)
          .text(`${c.size || "40'"} ${c.type || 'Dry'}`, cColX[0] + 4, y + 8, { width: cColW[0] - 8 });

        doc.font('Helvetica').fontSize(6.5).fillColor(textDark);
        doc.text(fmtD(c.emptyGateInDate), cColX[1], y + 4, { width: cColW[1], align: 'center' });
        doc.text(fmtD(c.stuffingDate), cColX[2], y + 4, { width: cColW[2], align: 'center' });
        doc.text(fmtD(c.cartingDate), cColX[3], y + 4, { width: cColW[3], align: 'center' });
        doc.text(fmtD(c.lddOutDate), cColX[4], y + 4, { width: cColW[4], align: 'center' });

        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0f766e');
        doc.text(emptyD, cColX[5], y + 4, { width: cColW[5], align: 'center' });
        doc.text(cargoD, cColX[6], y + 4, { width: cColW[6], align: 'center' });
        doc.text(loadedD, cColX[7], y + 4, { width: cColW[7], align: 'center' });

        y += cRowHeight;
      });

      // Stroke outer boundary of Section 1 table
      doc.rect(leftX, containerTableTop, contentWidth, y - containerTableTop).stroke(borderDark);

      y += 6;

      // ==========================================
      // 4. SECTION 2 — ITEMISED FINANCIAL CHARGE PARTICULARS
      // ==========================================
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(textDark)
        .text('2. ITEMISED FINANCIAL CHARGE PARTICULARS', leftX, y);
      y += 11;

      // Charges Columns Widths (Total: 551)
      // Sr: 24, Desc: 257, SAC: 54, Rate: 68, Qty: 38, Taxable: 110
      const chColW = [24, 257, 54, 68, 38, 110];
      const chColX = [leftX];
      for (let i = 0; i < chColW.length; i++) {
        chColX.push(chColX[i] + chColW[i]);
      }

      const chargeHeaderH = 14;
      doc.rect(leftX, y, contentWidth, chargeHeaderH).fillAndStroke('#1e293b', borderDark);

      const chHeaders = [
        'SR.',
        'DESCRIPTION OF SERVICE CHARGES / OPERATIONS',
        'SAC CODE',
        'RATE (INR)',
        'QTY',
        'TAXABLE VALUE (INR)',
      ];

      doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#ffffff');
      chHeaders.forEach((h, i) => {
        const align = i === 1 ? 'left' : (i >= 3 ? 'right' : 'center');
        const padX = i === 1 ? chColX[i] + 4 : (i >= 3 ? chColX[i] : chColX[i]);
        const padW = i === 1 ? chColW[i] - 8 : (i >= 3 ? chColW[i] - 5 : chColW[i]);
        doc.text(h, padX, y + 4, { width: padW, align });
      });

      y += chargeHeaderH;

      const items = (invoice.items && invoice.items.length > 0)
        ? invoice.items
        : [
            { srNo: 1, description: 'Ocean Freight Charges (Base Carrier Contracted Rates)', hsnSacCode: '996521', rate: 140000, quantity: 2, taxableValue: 280000 },
            { srNo: 2, description: 'Empty Container Depot Supervision & Detention Fees (Total 7 Days)', hsnSacCode: '996719', rate: 1200, quantity: 7, taxableValue: 8400 },
            { srNo: 3, description: 'Cargo Staging & Warehouse Handling (Cargo Days: Total 8 Days)', hsnSacCode: '996729', rate: 2500, quantity: 8, taxableValue: 20000 },
            { srNo: 4, description: 'Loaded Ground Rent & Port Terminal Storage (Loaded Days: Total 9 Days)', hsnSacCode: '996711', rate: 1800, quantity: 9, taxableValue: 16200 },
            { srNo: 5, description: 'Terminal Handling Charges (THC) & Origin Drayage Services', hsnSacCode: '996713', rate: 18500, quantity: 2, taxableValue: 37000 },
          ];

      const chRowH = 14.5;
      const fmtCurrency = (n: number) => {
        return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const chargesTableTop = y - chargeHeaderH;

      items.forEach((item: any, idx: number) => {
        const isAlt = idx % 2 === 1;
        doc.rect(leftX, y, contentWidth, chRowH).fillAndStroke(isAlt ? '#f8fafc' : '#ffffff', borderLight);

        doc.font('Helvetica').fontSize(6.5).fillColor(textDark);
        doc.text(String(item.srNo || idx + 1), chColX[0], y + 4, { width: chColW[0], align: 'center' });
        doc.text(item.description || '-', chColX[1] + 4, y + 4, { width: chColW[1] - 8, align: 'left' });
        doc.text(item.hsnSacCode || '996719', chColX[2], y + 4, { width: chColW[2], align: 'center' });
        doc.text(fmtCurrency(item.rate), chColX[3], y + 4, { width: chColW[3] - 5, align: 'right' });
        doc.text(String(item.quantity || 1), chColX[4], y + 4, { width: chColW[4], align: 'center' });
        doc.font('Helvetica-Bold').fontSize(6.5);
        doc.text(fmtCurrency(item.taxableValue || item.amount || (item.rate * item.quantity)), chColX[5], y + 4, { width: chColW[5] - 5, align: 'right' });

        y += chRowH;
      });

      // Outer border of charges table
      doc.rect(leftX, chargesTableTop, contentWidth, y - chargesTableTop).stroke(borderDark);

      // ==========================================
      // 5. TOTALS BREAKDOWN (RIGHT-ALIGNED)
      // ==========================================
      const totalsW = 205;
      const totalsX = rightX - totalsW;
      const totalRowH = 12.5;

      const subtotalTaxable = invoice.taxableAmount || 361600;
      const cgstAmt = invoice.cgstAmount !== undefined ? invoice.cgstAmount : 32544;
      const sgstAmt = invoice.sgstAmount !== undefined ? invoice.sgstAmount : 32544;
      const igstAmt = invoice.igstAmount !== undefined ? invoice.igstAmount : 0;
      const grandTotal = invoice.grandTotal || 426688;
      const cgstRate = invoice.cgstRate || 9;
      const sgstRate = invoice.sgstRate || 9;
      const igstRate = invoice.igstRate || 18;

      // Subtotal Taxable
      doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textDark)
        .text('Subtotal Taxable Amount', totalsX + 6, y + 3, { width: 105 });
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textDark)
        .text(fmtCurrency(subtotalTaxable), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
      y += totalRowH;

      if (igstAmt > 0) {
        doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(`IGST @ ${igstRate}%`, totalsX + 6, y + 3, { width: 105 });
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(fmtCurrency(igstAmt), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
        y += totalRowH;
      } else {
        doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(`CGST @ ${cgstRate}%`, totalsX + 6, y + 3, { width: 105 });
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(fmtCurrency(cgstAmt), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
        y += totalRowH;

        doc.rect(totalsX, y, totalsW, totalRowH).fillAndStroke('#ffffff', borderLight);
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(`SGST @ ${sgstRate}%`, totalsX + 6, y + 3, { width: 105 });
        doc.font('Helvetica').fontSize(6.5).fillColor(textDark)
          .text(fmtCurrency(sgstAmt), totalsX + 115, y + 3, { width: totalsW - 120, align: 'right' });
        y += totalRowH;
      }

      // Total Invoice Value Row (Highlighted)
      const grandTotalH = 15;
      doc.rect(totalsX, y, totalsW, grandTotalH).fillAndStroke('#f1f5f9', borderDark);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text('Total Invoice Value (INR)', totalsX + 6, y + 4, { width: 110 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(mskRed)
        .text(`₹ ${fmtCurrency(grandTotal)}`, totalsX + 115, y + 3.5, { width: totalsW - 120, align: 'right' });
      y += grandTotalH + 5;

      // ==========================================
      // 6. AMOUNT IN WORDS (FROM REFERENCE IMAGE 2)
      // ==========================================
      const wordsBoxH = 14;
      doc.rect(leftX, y, contentWidth, wordsBoxH).fillAndStroke('#f8fafc', borderDark);
      const defaultWords = 'INR Four Lakh Twenty-Six Thousand Six Hundred Eighty-Eight Only';
      let wordsText = invoice.amountInWords || defaultWords;
      if (!wordsText.toLowerCase().startsWith('inr') && !wordsText.toLowerCase().startsWith('rs')) {
        wordsText = `INR ${wordsText}`;
      }
      if (!wordsText.toLowerCase().endsWith('only')) {
        wordsText = `${wordsText} Only`;
      }
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark)
        .text(`Amount in words: ${wordsText}`, leftX + 6, y + 3.5, { width: contentWidth - 12 });
      y += wordsBoxH + 5;

      // ==========================================
      // 7. TERMS & CONDITIONS AND BANK REMITTANCE (TWO COLUMNS)
      // ==========================================
      const bottomBoxH = 56;
      const termsW = 310;
      const bankW = contentWidth - termsW; // 241
      const bankX = leftX + termsW;

      // Terms box (Left)
      doc.rect(leftX, y, termsW, bottomBoxH).stroke(borderDark);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark)
        .text('Terms & Conditions:', leftX + 6, y + 5);

      const termsList = [
        '1. Interest @ 18% p.a. will be levied if payment is not received within 14 credit days.',
        '2. All business is transacted subject to standard Freight Forwarders Association Conditions.',
        '3. No claims for discrepancies will be entertained unless notified in writing within 7 days.',
      ];

      let termY = y + 16;
      doc.font('Helvetica').fontSize(6).fillColor(textDark);
      termsList.forEach((t) => {
        doc.text(t, leftX + 6, termY, { width: termsW - 12, lineGap: 1 });
        termY += 11;
      });

      // Bank Remittance Box (Right - Framed as in Reference Image 2)
      doc.rect(bankX, y, bankW, bottomBoxH).fillAndStroke('#f8fafc', borderDark);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(textDark)
        .text('Bank Remittance Details:', bankX + 6, y + 5);

      doc.font('Helvetica').fontSize(6.5).fillColor(textDark);
      doc.text(`Bank Name: ${settings?.bankName || 'ICICI Bank'}`, bankX + 6, y + 16);
      doc.text(`A/C Name: ${settings?.bankAccountName || 'MSK LOGISTIC SOLUTION'}`, bankX + 6, y + 25);
      doc.text(`A/C Number: ${settings?.bankAccountNo || '574005000006'}`, bankX + 6, y + 34);
      doc.text(`IFSC Code: ${settings?.bankIfsc || 'ICIC0005740'}  |  Branch: ${settings?.bankBranch || 'Dronagiri Node'}`, bankX + 6, y + 43);

      y += bottomBoxH + 5;

      // ==========================================
      // 8. SIGNATURE & SYSTEM STAMP FOOTER
      // ==========================================
      const signBoxH = 42;
      doc.rect(leftX, y, contentWidth, signBoxH).stroke(borderDark);

      // Left Stamp
      const tokenRef = invoice.verificationToken ? invoice.verificationToken.slice(0, 12).toUpperCase() : 'VERIFIED';
      doc.font('Helvetica').fontSize(6.5).fillColor(textMuted)
        .text(`Generated System Stamp: MSK ERP Verified Authentic (Ref: ${tokenRef})`, leftX + 8, y + 15, { width: 280 });

      // Right Signatory
      const sigX = rightX - 190;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textDark)
        .text(`For ${settings?.companyName || 'MSK LOGISTIC SOLUTION'}`, sigX, y + 6, { width: 180, align: 'center' });

      if (settings?.signatureUrl && fs.existsSync(settings.signatureUrl)) {
        try {
          doc.image(settings.signatureUrl, sigX + 50, y + 17, { fit: [80, 16], align: 'center' });
        } catch (e) {
          // ignore
        }
      }

      doc.font('Helvetica').fontSize(7).fillColor(textMuted)
        .text('Authorised Signatory', sigX, y + 28, { width: 180, align: 'center' });

      // Bottom Page Indicator
      doc.font('Helvetica').fontSize(6).fillColor(textMuted)
        .text('Page 1 of 1', leftX, y + signBoxH + 3, { width: contentWidth, align: 'right' });

      // Finalize document
      doc.end();
    });
  }
}
