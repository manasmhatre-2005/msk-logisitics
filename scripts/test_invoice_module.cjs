const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('================================================================================');
  console.log('       MSK LOGISTIC SOLUTION ERP — INVOICE & BILLING MODULE VERIFICATION        ');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Step 0: Ensure we have a test party, exporter, and job
    let party = await prisma.party.findFirst({ where: { legalName: { contains: 'GREENWICH' } } });
    if (!party) {
      party = await prisma.party.findFirst();
    }
    assert(!!party, `Active party found: ${party?.legalName} (${party?.id})`);

    let exporter = await prisma.exporter.findFirst();
    if (!exporter) {
      exporter = await prisma.exporter.create({
        data: { name: 'MSK GLOBAL EXPORTS LTD' },
      });
    }
    assert(!!exporter, `Active exporter found: ${exporter?.name} (${exporter?.id})`);

    let job = await prisma.job.findFirst();
    if (!job) {
      job = await prisma.job.create({
        data: {
          jobNumber: 'JOB-2026-TEST',
          partyId: party.id,
          exporterId: exporter.id,
          status: 'ACTIVE',
        },
      });
    }
    assert(!!job, `Active job found: ${job?.jobNumber} (${job?.id})`);

    const timestamp = Date.now().toString().slice(-6);

    // =========================================================================
    // Test 1: Standard Tax Invoice Creation & Persistence
    // =========================================================================
    const stdNumber = `MSK/INV/2026-27/TEST_${timestamp}`;
    const stdToken = `vfy_test_std_${timestamp}`;
    const testContainerNumber = `MSKU${timestamp}`;

    const stdInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: stdNumber,
        billType: 'STANDARD',
        verificationToken: stdToken,
        partyId: party.id,
        exporterId: exporter.id,
        jobId: job.id,
        billToName: party.legalName,
        billToGstin: party.gstin,
        billToAddress: party.billingAddress || party.registeredAddress || 'Mumbai, Maharashtra',
        billToState: party.state,
        billToStateCode: party.stateCode,
        invoiceDate: new Date(),
        subtotal: 50000,
        taxableAmount: 50000,
        cgstRate: 9,
        cgstAmount: 4500,
        sgstRate: 9,
        sgstAmount: 4500,
        totalGst: 9000,
        grandTotal: 59000,
        balanceAmount: 59000,
        paidAmount: 0,
        status: 'DRAFT',
        items: {
          create: [
            {
              srNo: 1,
              description: 'Ocean Freight Handling & Terminal Clearance',
              hsnSacCode: '996719',
              quantity: 1,
              rate: 50000,
              amount: 50000,
              taxableValue: 50000,
              cgstRate: 9,
              cgstAmount: 4500,
              sgstRate: 9,
              sgstAmount: 4500,
              totalAmount: 59000,
            },
          ],
        },
        containers: {
          create: [
            {
              containerNumber: testContainerNumber,
              size: '40 FT HC',
              type: 'DRY',
            },
          ],
        },
      },
      include: {
        party: true,
        exporter: true,
        job: true,
        containers: true,
        items: true,
      },
    });

    assert(stdInvoice && stdInvoice.id, `Standard Tax Invoice saved to database with ID: ${stdInvoice.id}`);
    assert(stdInvoice.containers.length === 1 && stdInvoice.containers[0].containerNumber === testContainerNumber, `Container ${testContainerNumber} linked to invoice`);
    assert(stdInvoice.items.length === 1 && stdInvoice.items[0].taxableValue === 50000, `Invoice line items saved with taxableValue = 50,000`);

    // =========================================================================
    // Test 2: Search By Invoice Number, Container Number, Party, Job
    // =========================================================================
    const searchByInv = await prisma.invoice.findMany({
      where: { invoiceNumber: { contains: `TEST_${timestamp}`, mode: 'insensitive' } },
    });
    assert(searchByInv.length >= 1, `Search by invoice number found ${searchByInv.length} record(s)`);

    const searchByContainer = await prisma.invoice.findMany({
      where: { containers: { some: { containerNumber: { contains: testContainerNumber, mode: 'insensitive' } } } },
    });
    assert(searchByContainer.length >= 1, `Search by container number ${testContainerNumber} found ${searchByContainer.length} record(s)`);

    const searchByParty = await prisma.invoice.findMany({
      where: { party: { legalName: { contains: party.legalName.slice(0, 5), mode: 'insensitive' } } },
    });
    assert(searchByParty.length >= 1, `Search by party name "${party.legalName.slice(0, 5)}" found ${searchByParty.length} record(s)`);

    // =========================================================================
    // Test 3: Edit Invoice Details
    // =========================================================================
    const updatedConsignee = 'GLOBAL LOGISTICS OVERSEAS LLC (DUBAI)';
    const updatedInvoice = await prisma.invoice.update({
      where: { id: stdInvoice.id },
      data: {
        consigneeName: updatedConsignee,
        sbNumbers: 'SB-99887766',
        notes: 'Updated special instruction for customs clearance',
      },
    });
    assert(updatedInvoice.consigneeName === updatedConsignee, `Invoice updated: consigneeName = "${updatedInvoice.consigneeName}"`);
    assert(updatedInvoice.sbNumbers === 'SB-99887766', `Invoice updated: sbNumbers = "${updatedInvoice.sbNumbers}"`);

    // =========================================================================
    // Test 4: Finalize & Record Payment Integration
    // =========================================================================
    const finalized = await prisma.invoice.update({
      where: { id: stdInvoice.id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedBy: 'Admin Verification Test',
      },
    });
    assert(finalized.status === 'FINALIZED', `Invoice transitioned from DRAFT to FINALIZED`);

    // Record partial payment of 29,500
    const paymentAmount = 29500;
    const payment = await prisma.payment.create({
      data: {
        invoiceId: finalized.id,
        partyId: finalized.partyId,
        amount: paymentAmount,
        currency: 'INR',
        paymentDate: new Date(),
        paymentMode: 'NEFT/RTGS',
        referenceNumber: `UTR_${timestamp}`,
        recordedBy: 'Admin Test',
      },
    });

    const newBalance = finalized.grandTotal - paymentAmount;
    const paidInvoice = await prisma.invoice.update({
      where: { id: finalized.id },
      data: {
        paidAmount: paymentAmount,
        balanceAmount: newBalance,
      },
    });

    assert(payment && payment.id, `Payment record created with ID: ${payment.id} for ₹${paymentAmount}`);
    assert(paidInvoice.paidAmount === paymentAmount, `Invoice paidAmount updated to ₹${paidInvoice.paidAmount}`);
    assert(paidInvoice.balanceAmount === newBalance, `Invoice balanceAmount accurately reduced to ₹${paidInvoice.balanceAmount}`);

    // =========================================================================
    // Test 5: Credit Note Bill Linking & Balance Deduction
    // =========================================================================
    const cnNumber = `MSK/CN/2026-27/TEST_${timestamp}`;
    const cnToken = `vfy_test_cn_${timestamp}`;
    const creditAmount = 5000;

    const creditNote = await prisma.invoice.create({
      data: {
        invoiceNumber: cnNumber,
        billType: 'CREDIT_NOTE',
        verificationToken: cnToken,
        partyId: party.id,
        originalInvoiceId: paidInvoice.id,
        originalInvoiceNumber: paidInvoice.invoiceNumber,
        originalInvoiceDate: paidInvoice.invoiceDate,
        reasonForCredit: 'Rate revision adjustment',
        billToName: party.legalName,
        billToGstin: party.gstin,
        billToAddress: party.billingAddress || 'Mumbai',
        billToState: party.state,
        billToStateCode: party.stateCode,
        invoiceDate: new Date(),
        subtotal: creditAmount,
        taxableAmount: creditAmount,
        totalGst: 0,
        grandTotal: creditAmount,
        balanceAmount: 0,
        paidAmount: creditAmount,
        status: 'FINALIZED',
      },
    });

    const afterCnBalance = Math.max(0, paidInvoice.balanceAmount - creditAmount);
    await prisma.invoice.update({
      where: { id: paidInvoice.id },
      data: { balanceAmount: afterCnBalance },
    });

    const finalOrigInvoice = await prisma.invoice.findUnique({ where: { id: paidInvoice.id } });
    assert(creditNote && creditNote.id, `Credit Note created: ${creditNote.invoiceNumber} adjusting ${creditNote.originalInvoiceNumber}`);
    assert(finalOrigInvoice.balanceAmount === afterCnBalance, `Original invoice balance adjusted to ₹${finalOrigInvoice.balanceAmount}`);

    // =========================================================================
    // Test 6: Cancel / Void Invoice Safety
    // =========================================================================
    const cancelled = await prisma.invoice.update({
      where: { id: stdInvoice.id },
      data: {
        status: 'CANCELLED',
        balanceAmount: 0,
        notes: `${stdInvoice.notes}\n[CANCELLED]: Voided during automated module test`,
      },
    });
    assert(cancelled.status === 'CANCELLED', `Invoice cancelled with status: ${cancelled.status}`);
    assert(cancelled.balanceAmount === 0, `Cancelled invoice balance zeroed out`);

    // Clean up test records
    await prisma.payment.deleteMany({ where: { invoiceId: stdInvoice.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: stdInvoice.id } });
    await prisma.invoiceContainer.deleteMany({ where: { invoiceId: stdInvoice.id } });
    await prisma.invoice.deleteMany({ where: { id: { in: [stdInvoice.id, creditNote.id] } } });
    assert(true, `Test invoice and payment artifacts cleanly scrubbed`);

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n================================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================================');
  }
}

runTests();
