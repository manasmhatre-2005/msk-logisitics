import prisma from '../prisma.js';
import { GSTService } from './gstService.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
  actionRequired?: {
    type: 'CANCEL_INVOICE' | 'NAVIGATE' | 'VIEW_INVOICE' | 'VIEW_PARTY';
    title: string;
    description: string;
    targetId: string;
    payload?: any;
  };
  suggestedActions?: string[];
  dataPayload?: any;
}

export class AIChatService {
  /**
   * Process natural language query from user and route to real backend tools
   */
  static async processMessage(query: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    const text = query.trim().toLowerCase();

    // 1. Check for Destructive / Confirmation Intent: Cancel Invoice
    const cancelMatch = query.match(/cancel\s+invoice\s+([A-Z0-9\/-]+)/i);
    if (cancelMatch) {
      const invNum = cancelMatch[1].trim().toUpperCase();
      const invoice = await prisma.invoice.findFirst({
        where: { invoiceNumber: { equals: invNum } },
        include: { party: true },
      });

      if (!invoice) {
        return {
          reply: `I searched the system, but could not find any invoice with number **${invNum}**. Please check the invoice number.`,
          suggestedActions: ['Show recent invoices', 'Find party by GSTIN', 'Show unpaid invoices'],
        };
      }

      return {
        reply: `⚠️ **Action Confirmation Required**\nAre you sure you want to cancel invoice **${invoice.invoiceNumber}** for **${invoice.party.legalName}** totaling **₹${invoice.grandTotal.toLocaleString('en-IN')}**?\n\nThis will mark the invoice as CANCELLED and recalculate the party balance.`,
        actionRequired: {
          type: 'CANCEL_INVOICE',
          title: `Cancel Invoice ${invoice.invoiceNumber}`,
          description: `Cancel invoice for ${invoice.party.legalName} (₹${invoice.grandTotal.toLocaleString('en-IN')})`,
          targetId: invoice.id,
          payload: { invoiceNumber: invoice.invoiceNumber },
        },
        suggestedActions: ['Keep Invoice', 'View invoice details'],
      };
    }

    // 2. Tool: Search Party by GSTIN
    const gstinMatch = query.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i);
    if (gstinMatch || text.includes('search gstin') || text.includes('party by gstin')) {
      const gstin = gstinMatch ? gstinMatch[0].toUpperCase() : '27AABCG6715G2ZO';
      try {
        const gstResult = await GSTService.lookupGSTIN(gstin);
        if (gstResult.partyExists && gstResult.existingParty) {
          return {
            reply: `✅ **Party Found in Database**\n\n• **Legal Name:** ${gstResult.existingParty.legalName}\n• **GSTIN:** ${gstResult.existingParty.gstin}\n• **Invoices:** ${gstResult.existingParty.invoicesCount}\n• **Active Jobs:** ${gstResult.existingParty.jobsCount}\n• **Containers:** ${gstResult.existingParty.containersCount}\n• **Outstanding Balance:** ₹${gstResult.existingParty.outstandingAmount.toLocaleString('en-IN')}`,
            dataPayload: gstResult,
            suggestedActions: [
              `Create invoice for ${gstResult.existingParty.gstin}`,
              'Show unpaid invoices',
              'Show containers for this party',
            ],
          };
        } else {
          return {
            reply: `🔍 **Verified Taxpayer via GST Registry**\n\n• **Legal Name:** ${gstResult.legalName}\n• **Trade Name:** ${gstResult.tradeName}\n• **GSTIN:** ${gstResult.gstin} (${gstResult.gstStatus})\n• **State:** ${gstResult.state} (Code ${gstResult.stateCode})\n• **Address:** ${gstResult.registeredAddress}\n\n*This party is not yet registered in your database.* You can save them or create an invoice directly.`,
            dataPayload: gstResult,
            suggestedActions: [
              `Create invoice for ${gstResult.gstin}`,
              'Show recent invoices',
            ],
          };
        }
      } catch (err: any) {
        return {
          reply: `❌ GST Lookup failed: ${err.message}`,
          suggestedActions: ['Search GSTIN 27AABCG6715G2ZO', 'Show all parties'],
        };
      }
    }

    // 3. Tool: Find Container (e.g. TGBU3802319, MSKU9021844)
    const containerMatch = query.match(/[A-Z]{3,4}[UJZ]?[0-9]{6,7}/i);
    if (containerMatch || text.includes('find container') || text.includes('container status')) {
      const cNum = containerMatch ? containerMatch[0].toUpperCase() : 'TGBU3802319';
      const container = await prisma.container.findFirst({
        where: { containerNumber: { contains: cNum } },
        include: { party: true, job: true },
      });

      if (container) {
        return {
          reply: `📦 **Container Details: ${container.containerNumber}**\n\n• **Size / Type:** ${container.size} ${container.type}\n• **Status:** \`${container.status}\`\n• **Party:** ${container.party.legalName}\n• **Job Ref:** ${container.job?.jobNumber || 'N/A'}\n• **Carting Date:** ${container.cartingDate ? container.cartingDate.toISOString().split('T')[0] : 'N/A'}\n• **Stuffing Date:** ${container.stuffingDate ? container.stuffingDate.toISOString().split('T')[0] : 'N/A'}\n• **LDD Out Date:** ${container.lddOutDate ? container.lddOutDate.toISOString().split('T')[0] : 'N/A'}\n• **Empty Ground Days:** ${container.emptyGroundRentDays} days\n• **Loaded Ground Days:** ${container.loadedGroundDays} days`,
          dataPayload: container,
          suggestedActions: [
            `Show invoice for ${container.containerNumber}`,
            'Show active jobs',
            'Show all containers',
          ],
        };
      } else {
        return {
          reply: `Could not find any container matching **${cNum}** in the system.`,
          suggestedActions: ['Show all containers', 'Show today\'s jobs'],
        };
      }
    }

    // 4. Tool: Get Specific Invoice Status / Explain Invoice (e.g. MSK/HT5/SEP26)
    const invLookupMatch = query.match(/MSK\/[A-Z0-9\/-]+/i) || query.match(/invoice\s+([A-Z0-9\/-]+)/i);
    if (invLookupMatch || text.includes('status of invoice') || text.includes('explain this invoice')) {
      const invNum = invLookupMatch ? (invLookupMatch[1] || invLookupMatch[0]).trim().toUpperCase() : 'MSK/HT5/SEP26';
      const invoice = await prisma.invoice.findFirst({
        where: { invoiceNumber: { contains: invNum } },
        include: { party: true, items: true, containers: true, payments: true },
      });

      if (invoice) {
        return {
          reply: `📄 **Invoice Information: ${invoice.invoiceNumber}**\n\n• **Status:** \`${invoice.status}\`\n• **Party:** ${invoice.billToName}\n• **GSTIN:** ${invoice.billToGstin}\n• **Invoice Date:** ${invoice.invoiceDate.toISOString().split('T')[0]}\n• **Taxable Amount:** ₹${invoice.taxableAmount.toLocaleString('en-IN')}\n• **Total GST:** ₹${invoice.totalGst.toLocaleString('en-IN')} (${invoice.isInterState ? `IGST ${invoice.igstRate}%` : `CGST ${invoice.cgstRate}% + SGST ${invoice.sgstRate}%`})\n• **Grand Total:** ₹${invoice.grandTotal.toLocaleString('en-IN')}\n• **Paid:** ₹${invoice.paidAmount.toLocaleString('en-IN')}\n• **Balance Outstanding:** ₹${invoice.balanceAmount.toLocaleString('en-IN')}\n• **Containers Associated:** ${invoice.containers.map(c => c.containerNumber).join(', ') || 'General'}\n• **Line Items:** ${invoice.items.length} items billed`,
          dataPayload: invoice,
          suggestedActions: [
            `Download PDF for ${invoice.invoiceNumber}`,
            `Send WhatsApp for ${invoice.invoiceNumber}`,
            'Show unpaid invoices',
          ],
        };
      }
    }

    // 5. Tool: Show Unpaid / Outstanding Invoices
    if (text.includes('unpaid') || text.includes('outstanding') || text.includes('pending payment') || text.includes('how much is outstanding')) {
      const unpaidInvoices = await prisma.invoice.findMany({
        where: { balanceAmount: { gt: 0 } },
        include: { party: true },
        take: 5,
        orderBy: { balanceAmount: 'desc' },
      });

      const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

      const listStr = unpaidInvoices
        .map(
          (inv) =>
            `• **${inv.invoiceNumber}** (${inv.party.legalName}): Balance **₹${inv.balanceAmount.toLocaleString('en-IN')}** (Total: ₹${inv.grandTotal.toLocaleString('en-IN')})`
        )
        .join('\n');

      return {
        reply: `💰 **Outstanding Receivables Overview**\n\nTotal Pending Invoices: **${unpaidInvoices.length}**\nTotal Outstanding Balance: **₹${totalOutstanding.toLocaleString('en-IN')}**\n\n**Top Outstanding Invoices:**\n${listStr || 'No pending invoices found.'}`,
        suggestedActions: [
          'Send payment reminder',
          'Show billing this month',
          'Show recent invoices',
        ],
      };
    }

    // 6. Tool: Monthly Billing & Revenue Stats
    if (text.includes('billing this month') || text.includes('how many invoices were generated') || text.includes('monthly billing') || text.includes('revenue')) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const invoicesThisMonth = await prisma.invoice.findMany({
        where: { invoiceDate: { gte: startOfMonth } },
      });

      const totalBilled = invoicesThisMonth.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const totalTax = invoicesThisMonth.reduce((sum, inv) => sum + inv.totalGst, 0);

      return {
        reply: `📊 **Monthly Billing Performance (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})**\n\n• **Invoices Issued:** ${invoicesThisMonth.length}\n• **Total Billed Amount:** ₹${totalBilled.toLocaleString('en-IN')}\n• **GST Tax Collected:** ₹${totalTax.toLocaleString('en-IN')}\n• **Active Operational Containers:** ${await prisma.container.count({ where: { status: 'ACTIVE' } })}`,
        suggestedActions: [
          'Show unpaid invoices',
          'Show today\'s jobs',
          'Create a new invoice',
        ],
      };
    }

    // 7. Tool: Today's Jobs / Active Operations
    if (text.includes("today's jobs") || text.includes('active jobs') || text.includes('show jobs')) {
      const jobs = await prisma.job.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { party: true, exporter: true, _count: { select: { containers: true } } },
      });

      const listStr = jobs
        .map(
          (j) =>
            `• **${j.jobNumber}** [${j.status}]: Party **${j.party.legalName}** | Port: ${j.port || 'JNPT'} | Containers: ${j._count.containers}`
        )
        .join('\n');

      return {
        reply: `🚢 **Active Logistics Jobs & Shipments**\n\n${listStr || 'No active jobs found.'}`,
        suggestedActions: [
          'Show all containers',
          'Create a new invoice',
          'Search GSTIN',
        ],
      };
    }

    // 8. Tool: Create New Invoice intent
    if (text.includes('create invoice') || text.includes('new invoice')) {
      return {
        reply: `✨ **Invoice Creation Workflow**\nYou can create an invoice in two fast ways:\n\n1. Enter a customer **GSTIN** in the top search bar (e.g. \`27AABCG6715G2ZO\`) to automatically retrieve party details and start the 6-step invoice wizard.\n2. Click the **[+ Create Invoice]** button in the top action bar.`,
        suggestedActions: [
          'Search GSTIN 27AABCG6715G2ZO',
          'Show unpaid invoices',
        ],
      };
    }

    // Default Fallback
    return {
      reply: `Hello! I am your **LogiBill Assistant**. I can help you with real-time operations and accounting in LogiBill ERP.\n\nTry asking me:\n• *"What is the status of invoice MSK/HT5/SEP26?"*\n• *"Find party by GSTIN 27AABCG6715G2ZO"*\n• *"Show unpaid invoices"*\n• *"Find container TGBU3802319"*\n• *"How much is outstanding?"*\n• *"Show today's jobs"*`,
      suggestedActions: [
        'Find invoice MSK/HT5/SEP26',
        'Search GSTIN 27AABCG6715G2ZO',
        'Show unpaid invoices',
        'Find container TGBU3802319',
      ],
    };
  }
}
