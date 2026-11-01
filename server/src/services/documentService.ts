import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import prisma from '../prisma.js';

export class DocumentService {
  private static get storageBaseDir(): string {
    return process.env.VERCEL
      ? path.resolve(os.tmpdir(), 'msk_storage/documents')
      : path.resolve(process.cwd(), 'storage/documents');
  }

  /**
   * Ensure storage directory exists
   */
  private static ensureStorageDir(subDir: string = ''): string {
    const fullPath = path.join(this.storageBaseDir, subDir);
    try {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    } catch (e) {
      console.warn('[DocumentService] ensureStorageDir fallback:', e);
    }
    return fullPath;
  }

  /**
   * Save a generated invoice document with persistent DB metadata
   */
  static async saveInvoiceDocument(
    invoiceId: string,
    invoiceNumber: string,
    billType: string,
    pdfBuffer: Buffer,
    metadata?: any
  ): Promise<{ documentId: string; storageKey: string; filePath: string; checksum: string }> {
    const safeInvNo = invoiceNumber.replace(/[\/\\]/g, '_');
    const year = new Date().getFullYear().toString();
    const subDir = path.join(year, billType.toLowerCase());
    const targetDir = this.ensureStorageDir(subDir);
    const fileName = `${safeInvNo}.pdf`;
    const fullFilePath = path.join(targetDir, fileName);

    // Compute SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Write file to durable disk storage
    try {
      fs.writeFileSync(fullFilePath, pdfBuffer);
    } catch (fsErr) {
      console.warn('[DocumentService] Disk write warning in serverless:', fsErr);
    }

    // Collision-resistant storage key
    const storageKey = `invoices/${year}/${billType.toLowerCase()}/${safeInvNo}_${checksum.slice(0, 8)}`;

    // Upsert Document metadata in PostgreSQL
    const doc = await prisma.document.upsert({
      where: { storageKey },
      update: {
        fileName,
        filePath: fullFilePath,
        fileSize: pdfBuffer.length,
        checksum,
        mimeType: 'application/pdf',
        metadataJson: metadata ? JSON.stringify(metadata) : null,
        updatedAt: new Date(),
      },
      create: {
        entityType: 'INVOICE',
        entityId: invoiceId,
        documentType: 'INVOICE_PDF',
        fileName,
        filePath: fullFilePath,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
        checksum,
        storageKey,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Also update invoice.pdfPath
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfPath: fullFilePath },
    });

    return {
      documentId: doc.id,
      storageKey,
      filePath: fullFilePath,
      checksum,
    };
  }

  /**
   * Retrieve document by invoiceId
   */
  static async getInvoiceDocument(invoiceId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> {
    const doc = await prisma.document.findFirst({
      where: {
        entityType: 'INVOICE',
        entityId: invoiceId,
        documentType: 'INVOICE_PDF',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (doc && fs.existsSync(doc.filePath)) {
      const buffer = fs.readFileSync(doc.filePath);
      // Validate checksum if present
      if (doc.checksum) {
        const currentChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
        if (currentChecksum !== doc.checksum) {
          console.warn(`[DocumentService] Checksum mismatch for document ${doc.id}`);
        }
      }
      return {
        buffer,
        fileName: doc.fileName,
        mimeType: doc.mimeType || 'application/pdf',
      };
    }

    return null;
  }
}
