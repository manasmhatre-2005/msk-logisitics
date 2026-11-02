import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';

export type JobFormatType = 'FORMAT_1' | 'FORMAT_2' | 'FORMAT_3';

export interface JobFormatMeta {
  type: JobFormatType;
  label: string;
  prefix: string;
  example: string;
  resetsWithFY: boolean;
  description: string;
}

export const JOB_FORMATS: Record<JobFormatType, JobFormatMeta> = {
  FORMAT_1: {
    type: 'FORMAT_1',
    label: 'Format 1 — Job Number',
    prefix: 'jobNo-',
    example: 'jobNo-0001-26-27',
    resetsWithFY: true,
    description: 'Format: jobNo-0001-26-27 (resets each Indian financial year)',
  },
  FORMAT_2: {
    type: 'FORMAT_2',
    label: 'Format 2 — Job Number / MSK',
    prefix: 'JONNo./MSK/',
    example: 'JONNo./MSK/0001',
    resetsWithFY: false,
    description: 'Format: JONNo./MSK/0001 (continuous global sequential)',
  },
  FORMAT_3: {
    type: 'FORMAT_3',
    label: 'Format 3 — Financial Year Job Number',
    prefix: 'JOb No/',
    example: 'JOb No/26-27/0001',
    resetsWithFY: true,
    description: 'Format: JOb No/26-27/0001 (resets each Indian financial year)',
  },
};

export class JobSequenceService {
  /**
   * Determine Indian Financial Year in 2-digit format, e.g. "26-27"
   * Indian Financial Year spans 1 April through 31 March.
   */
  static getFinancialYearCode(date: Date = new Date()): string {
    const d = new Date(date);
    const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = April, 11 = Dec
    const year = d.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    const start2 = String(startYear).slice(-2);
    const end2 = String(endYear).slice(-2);
    return `${start2}-${end2}`;
  }

  /**
   * Format a sequential number according to the selected format specifications.
   * Exact formatting requirements:
   * - FORMAT_1: jobNo-0001-26-27
   * - FORMAT_2: JONNo./MSK/0001
   * - FORMAT_3: JOb No/26-27/0001
   */
  static formatJobNumber(formatType: JobFormatType, seq: number, fyCode: string): string {
    const seqStr = String(seq).padStart(4, '0');
    switch (formatType) {
      case 'FORMAT_1':
        return `jobNo-${seqStr}-${fyCode}`;
      case 'FORMAT_2':
        return `JONNo./MSK/${seqStr}`;
      case 'FORMAT_3':
        return `JOb No/${fyCode}/${seqStr}`;
      default:
        return `jobNo-${seqStr}-${fyCode}`;
    }
  }

  /**
   * Scan existing Job records in the database to find the maximum existing sequence number
   * for a given format and financial year. Ensures zero collision with historical data.
   */
  static async findMaxExistingSequence(
    client: Prisma.TransactionClient | typeof prisma,
    formatType: JobFormatType,
    fyCode: string
  ): Promise<number> {
    let maxFound = 0;

    if (formatType === 'FORMAT_1') {
      // Format 1: jobNo-0001-26-27
      const jobs = await client.job.findMany({
        where: {
          jobNumber: {
            startsWith: 'jobNo-',
            endsWith: `-${fyCode}`,
          },
        },
        select: { jobNumber: true },
      });

      for (const j of jobs) {
        // Regex extract sequence: jobNo-(\d+)-26-27
        const match = j.jobNumber.match(/^jobNo-(\d+)-/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxFound) maxFound = num;
        }
      }
    } else if (formatType === 'FORMAT_2') {
      // Format 2: JONNo./MSK/0001
      const jobs = await client.job.findMany({
        where: {
          jobNumber: {
            startsWith: 'JONNo./MSK/',
          },
        },
        select: { jobNumber: true },
      });

      for (const j of jobs) {
        const match = j.jobNumber.match(/^JONNo\.\/MSK\/(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxFound) maxFound = num;
        }
      }
    } else if (formatType === 'FORMAT_3') {
      // Format 3: JOb No/26-27/0001
      const jobs = await client.job.findMany({
        where: {
          jobNumber: {
            startsWith: `JOb No/${fyCode}/`,
          },
        },
        select: { jobNumber: true },
      });

      for (const j of jobs) {
        const match = j.jobNumber.match(new RegExp(`^JOb No\\/${fyCode}\\/(\\d+)`, 'i'));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxFound) maxFound = num;
        }
      }
    }

    return maxFound;
  }

  /**
   * Preview the next available job number without incrementing sequence or locking DB rows.
   */
  static async peekNextJobNumber(
    formatType: JobFormatType = 'FORMAT_1',
    date: Date = new Date()
  ): Promise<{ formatType: JobFormatType; nextNumber: string; financialYear: string }> {
    const fyCode = this.getFinancialYearCode(date);
    const finYearKey = formatType === 'FORMAT_2' ? 'GLOBAL' : fyCode;

    const existingSeq = await prisma.jobSequence.findUnique({
      where: {
        formatType_financialYear: {
          formatType,
          financialYear: finYearKey,
        },
      },
    });

    let nextSeq: number;
    if (!existingSeq) {
      const maxFound = await this.findMaxExistingSequence(prisma, formatType, fyCode);
      nextSeq = maxFound + 1;
    } else {
      nextSeq = existingSeq.currentSeq + 1;
    }

    const nextNumber = this.formatJobNumber(formatType, nextSeq, fyCode);
    return {
      formatType,
      nextNumber,
      financialYear: fyCode,
    };
  }

  /**
   * Atomically generate and increment next sequence under transaction row lock.
   * Concurrency-safe against race conditions and simultaneous job creations.
   */
  static async getNextJobNumber(
    tx: Prisma.TransactionClient,
    formatType: JobFormatType = 'FORMAT_1',
    date: Date = new Date()
  ): Promise<{ jobNumber: string; sequenceNumber: number; financialYear: string }> {
    const fyCode = this.getFinancialYearCode(date);
    const finYearKey = formatType === 'FORMAT_2' ? 'GLOBAL' : fyCode;
    const sequenceId = `${formatType}_${finYearKey}`;

    let existingSeq = await tx.jobSequence.findUnique({
      where: {
        formatType_financialYear: {
          formatType,
          financialYear: finYearKey,
        },
      },
    });

    let assignedSeq: number;

    if (!existingSeq) {
      const maxFound = await this.findMaxExistingSequence(tx, formatType, fyCode);
      assignedSeq = maxFound + 1;

      try {
        await tx.jobSequence.create({
          data: {
            id: sequenceId,
            formatType,
            financialYear: finYearKey,
            currentSeq: assignedSeq,
          },
        });
      } catch (err: any) {
        // If race condition occurred on creation, update the created row
        const updated = await tx.jobSequence.update({
          where: {
            formatType_financialYear: {
              formatType,
              financialYear: finYearKey,
            },
          },
          data: {
            currentSeq: { increment: 1 },
          },
        });
        assignedSeq = updated.currentSeq;
      }
    } else {
      const updated = await tx.jobSequence.update({
        where: {
          formatType_financialYear: {
            formatType,
            financialYear: finYearKey,
          },
        },
        data: {
          currentSeq: { increment: 1 },
        },
      });
      assignedSeq = updated.currentSeq;
    }

    let finalJobNumber = this.formatJobNumber(formatType, assignedSeq, fyCode);

    // Collision guard: If a job with this exact number somehow exists, skip forward until unique
    let collision = await tx.job.findUnique({ where: { jobNumber: finalJobNumber } });
    while (collision) {
      const bumped = await tx.jobSequence.update({
        where: {
          formatType_financialYear: {
            formatType,
            financialYear: finYearKey,
          },
        },
        data: {
          currentSeq: { increment: 1 },
        },
      });
      assignedSeq = bumped.currentSeq;
      finalJobNumber = this.formatJobNumber(formatType, assignedSeq, fyCode);
      collision = await tx.job.findUnique({ where: { jobNumber: finalJobNumber } });
    }

    return {
      jobNumber: finalJobNumber,
      sequenceNumber: assignedSeq,
      financialYear: fyCode,
    };
  }
}
