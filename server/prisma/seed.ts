import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to cwd

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Company Settings
  await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'LOGIBILL LOGISTICS SOLUTIONS PVT. LTD.',
      tradeName: 'LogiBill ERP',
      gstin: '27AAACL1234F1Z9',
      pan: 'AAACL1234F',
      address: 'Plot No. 45, Sector 19, Vashi, Navi Mumbai',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400705',
      phone: '+91 98200 12345',
      email: 'billing@logibill.com',
      website: 'www.logibill.com',
      invoicePrefix: 'MSK/HT5/',
      nextInvoiceSeq: 27,
      bankName: 'HDFC BANK LTD',
      bankAccountNo: '50200012345678',
      bankIfsc: 'HDFC0000123',
      bankBranch: 'Vashi Branch, Navi Mumbai',
      termsAndConditions: '1. Payment due within 15 days of invoice date.\n2. Interest @ 18% p.a. will be charged after due date.\n3. All disputes subject to Mumbai Jurisdiction.',
      invoiceNotes: 'Thank you for your business!',
      freeEmptyGroundDays: 3,
      freeLoadedGroundDays: 5,
      cgstDefaultRate: 9.0,
      sgstDefaultRate: 9.0,
      igstDefaultRate: 18.0,
      isWhatsappMock: true,
      isGstMock: true,
    },
  });

  // 2. Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);
  const billingHash = await bcrypt.hash('billing123', salt);
  const opsHash = await bcrypt.hash('ops123', salt);
  const acctHash = await bcrypt.hash('accountant123', salt);
  const viewerHash = await bcrypt.hash('viewer123', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@logibill.com' },
    update: {},
    create: {
      email: 'admin@logibill.com',
      passwordHash,
      name: 'Amitabh Sharma (Admin)',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'billing@logibill.com' },
    update: {},
    create: {
      email: 'billing@logibill.com',
      passwordHash: billingHash,
      name: 'Rohan Mehra (Billing Head)',
      role: 'BILLING',
    },
  });

  await prisma.user.upsert({
    where: { email: 'ops@logibill.com' },
    update: {},
    create: {
      email: 'ops@logibill.com',
      passwordHash: opsHash,
      name: 'Vikram Joshi (Operations)',
      role: 'OPERATIONS',
    },
  });

  await prisma.user.upsert({
    where: { email: 'accountant@logibill.com' },
    update: {},
    create: {
      email: 'accountant@logibill.com',
      passwordHash: acctHash,
      name: 'Pooja Nair (Accounts)',
      role: 'ACCOUNTANT',
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@logibill.com' },
    update: {},
    create: {
      email: 'viewer@logibill.com',
      passwordHash: viewerHash,
      name: 'Neha Kapoor (Audit Viewer)',
      role: 'VIEWER',
    },
  });

  // 3. Exporters
  const exporter1 = await prisma.exporter.upsert({
    where: { id: 'exporter-gsa-01' },
    update: {},
    create: {
      id: 'exporter-gsa-01',
      name: 'GSA INDUSTRIES INDIA PRIVATE LIMITED',
      gstin: '27AABCG8899K1Z4',
      iecCode: '0309012345',
      address: 'Plot C-12, MIDC Industrial Area, Taloja',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '410208',
      contactPerson: 'Rajesh Shah',
      phone: '+91 98199 87654',
      email: 'exports@gsaindustries.in',
      notes: 'Leading steel exporter. Regular Nhava Sheva consignments.',
    },
  });

  const exporter2 = await prisma.exporter.upsert({
    where: { id: 'exporter-reliance-02' },
    update: {},
    create: {
      id: 'exporter-reliance-02',
      name: 'RELIANCE POLYOLEFINS EXPORTS LTD.',
      gstin: '27AAACR9988P1Z6',
      iecCode: '0310054321',
      address: 'Reliance Complex, Ghansoli',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400701',
      contactPerson: 'Kunal Verma',
      phone: '+91 98204 11223',
      email: 'polyolefins@relianceexports.in',
      notes: 'Petrochemical cargo stuffing.',
    },
  });

  // 4. Parties
  const party1 = await prisma.party.upsert({
    where: { gstin: '27AABCG6715G2ZO' },
    update: {},
    create: {
      id: 'party-greenwich-01',
      legalName: 'GREENWICH MARIDIAN LOGISTICS INDIA PVT. LTD.',
      tradeName: 'GREENWICH MARIDIAN LOGISTICS',
      gstin: '27AABCG6715G2ZO',
      gstStatus: 'Active',
      registeredAddress: 'Unit No. 402, 4th Floor, Technopolis Knowledge Park, Mahakali Caves Road, Andheri (East)',
      billingAddress: 'Unit No. 402, 4th Floor, Technopolis Knowledge Park, Mahakali Caves Road, Andheri (East), Mumbai - 400093',
      shippingAddress: 'JNPT CFS Yard No. 3, Nhava Sheva, Raigad, Maharashtra - 400707',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400093',
      contactPerson: 'Sanjay Varma',
      mobile: '+91 98201 44552',
      email: 'accounts@greenwichmaridian.com',
      vendorCode: 'VND-GML-09',
      notes: 'Preferred Freight Forwarder Partner. 30 days payment cycle.',
      isGstVerified: true,
      gstVerifiedAt: new Date('2026-08-01'),
      hasManualOverride: false,
    },
  });

  await prisma.partyContact.createMany({
    data: [
      {
        partyId: party1.id,
        name: 'Sanjay Varma',
        designation: 'Finance Controller',
        phone: '+91 22 2839 0001',
        mobile: '+91 98201 44552',
        email: 'accounts@greenwichmaridian.com',
        isPrimary: true,
      },
      {
        partyId: party1.id,
        name: 'Dinesh Sawant',
        designation: 'CFS Operations Executive',
        phone: '+91 22 2839 0002',
        mobile: '+91 98212 99881',
        email: 'ops@greenwichmaridian.com',
        isPrimary: false,
      },
    ],
  });

  const party2 = await prisma.party.upsert({
    where: { gstin: '27AABCA1234E1Z3' },
    update: {},
    create: {
      id: 'party-apl-02',
      legalName: 'APL LOGISTICS INDIA PVT. LTD.',
      tradeName: 'APL LOGISTICS',
      gstin: '27AABCA1234E1Z3',
      gstStatus: 'Active',
      registeredAddress: '7th Floor, Trade Center, Bandra Kurla Complex',
      billingAddress: '7th Floor, Trade Center, BKC, Bandra East, Mumbai - 400051',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400051',
      contactPerson: 'Manish Iyer',
      mobile: '+91 98330 55441',
      email: 'billing@in.apllogistics.com',
      vendorCode: 'VND-APL-12',
      notes: 'Global forwarder partner. High volume.',
      isGstVerified: true,
      gstVerifiedAt: new Date('2026-08-15'),
      hasManualOverride: false,
    },
  });

  const party3 = await prisma.party.upsert({
    where: { gstin: '24AACCA9876K1Z1' },
    update: {},
    create: {
      id: 'party-adivasi-03',
      legalName: 'GUJARAT MARITIME LOGISTICS PVT. LTD.',
      tradeName: 'GML MUNDRA',
      gstin: '24AACCA9876K1Z1',
      gstStatus: 'Active',
      registeredAddress: 'Office 12, Port Commercial Hub, Mundra',
      billingAddress: 'Office 12, Port Commercial Hub, Mundra, Kutch, Gujarat - 370421',
      city: 'Mundra',
      state: 'Gujarat',
      stateCode: '24', // Inter-state testing!
      pincode: '370421',
      contactPerson: 'Bhavin Patel',
      mobile: '+91 97240 12890',
      email: 'mundra@gujarattrading.com',
      vendorCode: 'VND-GUJ-05',
      notes: 'Gujarat inter-state IGST billing party.',
      isGstVerified: true,
      gstVerifiedAt: new Date('2026-08-20'),
      hasManualOverride: false,
    },
  });

  // 5. Charge Master
  const charges = [
    {
      code: 'CHG-HT-01',
      name: 'Handling & Transportation Loaded Container',
      category: 'HANDLING_TRANSPORT',
      hsnSacCode: '996511',
      unit: 'PER_CONTAINER',
      defaultRate: 12500,
      gstRate: 18.0,
      description: 'Loaded container movement from CFS to port terminal',
    },
    {
      code: 'CHG-LOG-02',
      name: 'Logistics & Service Charges',
      category: 'LOGISTICS',
      hsnSacCode: '996719',
      unit: 'PER_CONTAINER',
      defaultRate: 4500,
      gstRate: 18.0,
      description: 'Documentation, CFS facilitation and operations fee',
    },
    {
      code: 'CHG-FUM-03',
      name: 'Fumigation Charges',
      category: 'COMPLIANCE',
      hsnSacCode: '996719',
      unit: 'PER_CONTAINER',
      defaultRate: 2800,
      gstRate: 18.0,
      description: 'Methyl bromide / phosphine treatment & certificate',
    },
    {
      code: 'CHG-LSH-04',
      name: 'Lashing & Choking Charges',
      category: 'DUNNAGE',
      hsnSacCode: '996719',
      unit: 'PER_CONTAINER',
      defaultRate: 3500,
      gstRate: 18.0,
      description: 'Heavy machinery & pipe wire lashing, wooden choking',
    },
    {
      code: 'CHG-STR-05',
      name: 'Cargo Storage Charges',
      category: 'STORAGE',
      hsnSacCode: '996713',
      unit: 'PER_DAY',
      defaultRate: 1200,
      gstRate: 18.0,
      description: 'Covered shed / open yard cargo storage per day',
    },
    {
      code: 'CHG-PLY-06',
      name: 'Wooden Plywood Charges',
      category: 'DUNNAGE',
      hsnSacCode: '4415',
      unit: 'PER_PIECE',
      defaultRate: 650,
      gstRate: 18.0,
      description: 'ISPM-15 treated plywood sheets for cargo base',
    },
    {
      code: 'CHG-AIR-07',
      name: 'Air Bag Charges',
      category: 'DUNNAGE',
      hsnSacCode: '3926',
      unit: 'PER_PIECE',
      defaultRate: 850,
      gstRate: 18.0,
      description: 'Dunnage kraft air bags for container void filling',
    },
    {
      code: 'CHG-SCM-08',
      name: 'SCMTR Services Charges',
      category: 'COMPLIANCE',
      hsnSacCode: '996719',
      unit: 'PER_CONTAINER',
      defaultRate: 1500,
      gstRate: 18.0,
      description: 'Sea Cargo Manifest and Transhipment compliance filing',
    },
    {
      code: 'CHG-YRD-09',
      name: 'Handling & Lifting Yard Charges',
      category: 'HANDLING_TRANSPORT',
      hsnSacCode: '996719',
      unit: 'PER_CONTAINER',
      defaultRate: 2200,
      gstRate: 18.0,
      description: 'Reach stacker container lift-on / lift-off charge',
    },
    {
      code: 'CHG-EMP-10',
      name: 'Empty Transportation',
      category: 'HANDLING_TRANSPORT',
      hsnSacCode: '996511',
      unit: 'PER_CONTAINER',
      defaultRate: 6000,
      gstRate: 18.0,
      description: 'Empty container haulage from empty depot to CFS',
    },
    {
      code: 'CHG-OTH-11',
      name: 'Other Charges',
      category: 'LOGISTICS',
      hsnSacCode: '996719',
      unit: 'LUMPSUM',
      defaultRate: 1000,
      gstRate: 18.0,
      description: 'Incidental custom survey, seal verification, etc.',
    },
  ];

  for (const chg of charges) {
    await prisma.chargeMaster.upsert({
      where: { code: chg.code },
      update: chg,
      create: chg,
    });
  }

  // 6. Job / Shipment
  const job1 = await prisma.job.upsert({
    where: { jobNumber: 'JOB-2026-0891' },
    update: {},
    create: {
      id: 'job-0891',
      jobNumber: 'JOB-2026-0891',
      partyId: party1.id,
      exporterId: exporter1.id,
      sbNumber: '6010085/18.08.2026, 6007882/17.08.2026, 5803955/10.08.2026, 6008019/18.08.2026',
      bookingDetails: 'MSK-BK-882194',
      shipmentRef: 'SHP/AUG/2026/GSA-01',
      shipmentDate: new Date('2026-08-18'),
      port: 'Nhava Sheva (JNPT)',
      destination: 'Jebel Ali, UAE',
      remarks: 'Export consignment of industrial pipe fittings in 40ft container.',
      status: 'ACTIVE',
    },
  });

  const job2 = await prisma.job.upsert({
    where: { jobNumber: 'JOB-2026-0904' },
    update: {},
    create: {
      id: 'job-0904',
      jobNumber: 'JOB-2026-0904',
      partyId: party2.id,
      exporterId: exporter2.id,
      sbNumber: '6112004/22.08.2026',
      bookingDetails: 'CMA-BK-99120',
      shipmentRef: 'SHP/AUG/2026/APL-44',
      shipmentDate: new Date('2026-08-22'),
      port: 'Nhava Sheva (JNPT)',
      destination: 'Rotterdam, Netherlands',
      remarks: 'Polymers shipment in 20ft dry container.',
      status: 'ACTIVE',
    },
  });

  // 7. Containers
  const container1 = await prisma.container.upsert({
    where: { containerNumber: 'TGBU3802319' },
    update: {},
    create: {
      id: 'cont-tgbu-3802319',
      containerNumber: 'TGBU3802319',
      size: '40 FT HC',
      type: 'DRY',
      partyId: party1.id,
      jobId: job1.id,
      exporterId: exporter1.id,
      cartingDate: new Date('2026-08-10'),
      emptyGateInDate: new Date('2026-08-12'),
      stuffingDate: new Date('2026-08-18'),
      lddOutDate: new Date('2026-08-25'),
      emptyGroundRentDays: 3,
      daysAfterCarting: 8,
      loadedGroundDays: 2,
      isOverride: false,
      htCharges: 12500,
      logisticsCharges: 4500,
      emptyTransportCharges: 6000,
      otherCharges: 2500,
      status: 'LDD_OUT',
      remarks: 'Gate-out completed on trailer MH-04-CP-8812 to BMCT Terminal.',
    },
  });

  const container2 = await prisma.container.upsert({
    where: { containerNumber: 'MSKU9021844' },
    update: {},
    create: {
      id: 'cont-msku-9021844',
      containerNumber: 'MSKU9021844',
      size: '20 FT',
      type: 'DRY',
      partyId: party1.id,
      jobId: job1.id,
      exporterId: exporter1.id,
      cartingDate: new Date('2026-08-15'),
      emptyGateInDate: new Date('2026-08-16'),
      stuffingDate: new Date('2026-08-20'),
      lddOutDate: new Date('2026-08-26'),
      emptyGroundRentDays: 1,
      daysAfterCarting: 5,
      loadedGroundDays: 1,
      isOverride: false,
      htCharges: 9500,
      logisticsCharges: 3500,
      emptyTransportCharges: 4500,
      otherCharges: 1500,
      status: 'LDD_OUT',
      remarks: 'Loaded out on trailer MH-06-K-4421.',
    },
  });

  const container3 = await prisma.container.upsert({
    where: { containerNumber: 'MEDU7721803' },
    update: {},
    create: {
      id: 'cont-medu-7721803',
      containerNumber: 'MEDU7721803',
      size: '40 FT',
      type: 'DRY',
      partyId: party2.id,
      jobId: job2.id,
      exporterId: exporter2.id,
      cartingDate: new Date('2026-08-21'),
      emptyGateInDate: new Date('2026-08-22'),
      stuffingDate: new Date('2026-08-28'),
      lddOutDate: new Date('2026-09-02'),
      emptyGroundRentDays: 3,
      daysAfterCarting: 7,
      loadedGroundDays: 0,
      isOverride: false,
      htCharges: 12500,
      logisticsCharges: 4500,
      emptyTransportCharges: 6000,
      otherCharges: 1200,
      status: 'STUFFED',
      remarks: 'Custom clearance completed.',
    },
  });

  // 8. Invoices (including the reference invoice MSK/HT5/SEP26)
  const invoice1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'MSK/HT5/SEP26' },
    update: {},
    create: {
      id: 'inv-msk-ht5-sep26',
      invoiceNumber: 'MSK/HT5/SEP26',
      invoiceDate: new Date('2026-09-02'),
      dueDate: new Date('2026-09-17'),
      partyId: party1.id,
      exporterId: exporter1.id,
      jobId: job1.id,
      status: 'FINALIZED',
      billToName: party1.legalName,
      billToGstin: party1.gstin,
      billToAddress: party1.billingAddress || party1.registeredAddress,
      billToState: party1.state,
      billToStateCode: party1.stateCode,
      consigneeName: exporter1.name,
      consigneeAddress: `${exporter1.address}, ${exporter1.city}`,
      sbNumbers: '6010085/18.08.2026, 6007882/17.08.2026, 5803955/10.08.2026, 6008019/18.08.2026',
      subtotal: 123600.0,
      discountAmount: 0.0,
      taxableAmount: 123600.0,
      isInterState: false, // Intra-state (Maharashtra to Maharashtra) -> CGST 9% + SGST 9%
      cgstRate: 9.0,
      cgstAmount: 11124.0,
      sgstRate: 9.0,
      sgstAmount: 11124.0,
      igstRate: 18.0,
      igstAmount: 0.0,
      totalGst: 22248.0,
      roundOff: 0.0,
      grandTotal: 145848.0,
      amountInWords: 'INR One Lakh Forty-Five Thousand Eight Hundred Forty-Eight Only',
      paidAmount: 100000.0,
      balanceAmount: 45848.0,
      terms: '1. Payment due within 15 days.\n2. Interest @ 18% p.a. charged for delayed payments.\n3. Cheque / RTGS in favor of LOGIBILL LOGISTICS SOLUTIONS PVT. LTD.',
      notes: 'Operational charges for Container TGBU3802319 & MSKU9021844.',
      finalizedAt: new Date('2026-09-02T11:30:00Z'),
      finalizedBy: 'Amitabh Sharma',
    },
  });

  // Connect containers to Invoice 1
  await prisma.invoiceContainer.createMany({
    data: [
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        containerNumber: container1.containerNumber,
        size: container1.size,
        type: container1.type,
        cartingDate: container1.cartingDate,
        emptyGateInDate: container1.emptyGateInDate,
        stuffingDate: container1.stuffingDate,
        lddOutDate: container1.lddOutDate,
        emptyGroundDays: container1.emptyGroundRentDays,
        loadedGroundDays: container1.loadedGroundDays,
      },
      {
        invoiceId: invoice1.id,
        containerId: container2.id,
        containerNumber: container2.containerNumber,
        size: container2.size,
        type: container2.type,
        cartingDate: container2.cartingDate,
        emptyGateInDate: container2.emptyGateInDate,
        stuffingDate: container2.stuffingDate,
        lddOutDate: container2.lddOutDate,
        emptyGroundDays: container2.emptyGroundRentDays,
        loadedGroundDays: container2.loadedGroundDays,
      },
    ],
  });

  // Invoice Line items
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 1,
        description: 'Handling & Transportation Loaded Container (TGBU3802319 - 40HC)',
        hsnSacCode: '996511',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 12500,
        amount: 12500,
        discount: 0,
        taxableValue: 12500,
        cgstRate: 9,
        cgstAmount: 1125,
        sgstRate: 9,
        sgstAmount: 1125,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 14750,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 2,
        description: 'Logistics & Service Charges (TGBU3802319)',
        hsnSacCode: '996719',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 4500,
        amount: 4500,
        discount: 0,
        taxableValue: 4500,
        cgstRate: 9,
        cgstAmount: 405,
        sgstRate: 9,
        sgstAmount: 405,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 5310,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 3,
        description: 'Fumigation Charges (Methyl Bromide)',
        hsnSacCode: '996719',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 2800,
        amount: 2800,
        discount: 0,
        taxableValue: 2800,
        cgstRate: 9,
        cgstAmount: 252,
        sgstRate: 9,
        sgstAmount: 252,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 3304,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 4,
        description: 'Lashing & Choking Charges',
        hsnSacCode: '996719',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 3500,
        amount: 3500,
        discount: 0,
        taxableValue: 3500,
        cgstRate: 9,
        cgstAmount: 315,
        sgstRate: 9,
        sgstAmount: 315,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 4130,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 5,
        description: 'Wooden Plywood ISPM-15 sheets',
        hsnSacCode: '4415',
        quantity: 8,
        unit: 'PER_PIECE',
        rate: 650,
        amount: 5200,
        discount: 0,
        taxableValue: 5200,
        cgstRate: 9,
        cgstAmount: 468,
        sgstRate: 9,
        sgstAmount: 468,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 6136,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 6,
        description: 'Dunnage Kraft Air Bags',
        hsnSacCode: '3926',
        quantity: 4,
        unit: 'PER_PIECE',
        rate: 850,
        amount: 3400,
        discount: 0,
        taxableValue: 3400,
        cgstRate: 9,
        cgstAmount: 306,
        sgstRate: 9,
        sgstAmount: 306,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 4012,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 7,
        description: 'SCMTR Services Charges',
        hsnSacCode: '996719',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 1500,
        amount: 1500,
        discount: 0,
        taxableValue: 1500,
        cgstRate: 9,
        cgstAmount: 135,
        sgstRate: 9,
        sgstAmount: 135,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 1770,
      },
      {
        invoiceId: invoice1.id,
        containerId: container1.id,
        srNo: 8,
        description: 'Empty Transportation to CFS',
        hsnSacCode: '996511',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 6000,
        amount: 6000,
        discount: 0,
        taxableValue: 6000,
        cgstRate: 9,
        cgstAmount: 540,
        sgstRate: 9,
        sgstAmount: 540,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 7080,
      },
      {
        invoiceId: invoice1.id,
        containerId: container2.id,
        srNo: 9,
        description: 'Handling & Transportation Loaded Container (MSKU9021844 - 20FT)',
        hsnSacCode: '996511',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 9500,
        amount: 9500,
        discount: 0,
        taxableValue: 9500,
        cgstRate: 9,
        cgstAmount: 855,
        sgstRate: 9,
        sgstAmount: 855,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 11210,
      },
      {
        invoiceId: invoice1.id,
        containerId: container2.id,
        srNo: 10,
        description: 'Empty Transportation & Lifting (MSKU9021844)',
        hsnSacCode: '996511',
        quantity: 1,
        unit: 'PER_CONTAINER',
        rate: 4500,
        amount: 4500,
        discount: 0,
        taxableValue: 4500,
        cgstRate: 9,
        cgstAmount: 405,
        sgstRate: 9,
        sgstAmount: 405,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 5310,
      },
      {
        invoiceId: invoice1.id,
        containerId: null,
        srNo: 11,
        description: 'General CFS Documentation, EDI filing & Port Surcharge',
        hsnSacCode: '996719',
        quantity: 1,
        unit: 'LUMPSUM',
        rate: 70200,
        amount: 70200,
        discount: 0,
        taxableValue: 70200,
        cgstRate: 9,
        cgstAmount: 6318,
        sgstRate: 9,
        sgstAmount: 6318,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 82836,
      },
    ],
  });

  // Payment for Invoice 1
  await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      partyId: party1.id,
      amount: 100000.0,
      paymentDate: new Date('2026-09-10'),
      paymentMode: 'NEFT/RTGS',
      referenceNumber: 'HDFCR98231049281',
      notes: 'Part payment received via RTGS.',
      recordedBy: 'Pooja Nair',
    },
  });

  // Second invoice (Inter-state Gujarat party to test IGST!)
  const invoice2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'MSK/HT5/SEP27' },
    update: {},
    create: {
      id: 'inv-msk-ht5-sep27',
      invoiceNumber: 'MSK/HT5/SEP27',
      invoiceDate: new Date('2026-09-15'),
      dueDate: new Date('2026-09-30'),
      partyId: party3.id,
      status: 'SENT',
      billToName: party3.legalName,
      billToGstin: party3.gstin,
      billToAddress: party3.billingAddress || party3.registeredAddress,
      billToState: party3.state,
      billToStateCode: party3.stateCode, // 24 Gujarat != 27 Maharashtra -> IGST 18%
      subtotal: 50000.0,
      discountAmount: 0.0,
      taxableAmount: 50000.0,
      isInterState: true,
      cgstRate: 0.0,
      cgstAmount: 0.0,
      sgstRate: 0.0,
      sgstAmount: 0.0,
      igstRate: 18.0,
      igstAmount: 9000.0,
      totalGst: 9000.0,
      roundOff: 0.0,
      grandTotal: 59000.0,
      amountInWords: 'INR Fifty-Nine Thousand Only',
      paidAmount: 59000.0,
      balanceAmount: 0.0,
      status: 'PAID',
    },
  });

  await prisma.invoiceItem.create({
    data: {
      invoiceId: invoice2.id,
      srNo: 1,
      description: 'Handling & Transportation - Inter-state Corridor (Mundra - JNPT)',
      hsnSacCode: '996511',
      quantity: 2,
      unit: 'PER_CONTAINER',
      rate: 25000,
      amount: 50000,
      discount: 0,
      taxableValue: 50000,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 18,
      igstAmount: 9000,
      totalAmount: 59000,
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice2.id,
      partyId: party3.id,
      amount: 59000.0,
      paymentDate: new Date('2026-09-20'),
      paymentMode: 'NEFT/RTGS',
      referenceNumber: 'SBIN9812445129',
      notes: 'Full payment received.',
      recordedBy: 'Pooja Nair',
    },
  });

  // 9. WhatsApp Templates
  const templates = [
    {
      templateName: 'invoice_ready_v1',
      category: 'UTILITY',
      language: 'en_US',
      headerText: 'LogiBill Invoice Notification',
      bodyText: 'Dear {{1}},\n\nYour logistics invoice {{2}} for amount ₹{{3}} has been generated. Due date is {{4}}.\n\nYou can download the tax invoice directly using the link below.\n\nThank you for choosing LogiBill Logistics Solutions.',
      footerText: 'LogiBill ERP • Automated Notification',
      parameters: '["party_name", "invoice_number", "grand_total", "due_date"]',
    },
    {
      templateName: 'payment_reminder_v1',
      category: 'UTILITY',
      language: 'en_US',
      headerText: 'Payment Reminder - LogiBill ERP',
      bodyText: 'Dear {{1}},\n\nThis is a gentle reminder that invoice {{2}} has an outstanding balance of ₹{{3}} which was due on {{4}}.\n\nPlease arrange remittance at your earliest convenience to our bank account.\n\nBank: HDFC BANK LTD\nA/C: 50200012345678\nIFSC: HDFC0000123',
      footerText: 'LogiBill Finance Department',
      parameters: '["party_name", "invoice_number", "balance_amount", "due_date"]',
    },
    {
      templateName: 'container_gate_in_alert',
      category: 'OPERATIONS',
      language: 'en_US',
      headerText: 'Container Gate-In Update',
      bodyText: 'Dear {{1}},\n\nContainer {{2}} (Size: {{3}}) has successfully gated in at CFS Yard on {{4}}. Job Ref: {{5}}.\n\nCarting and stuffing operations are scheduled as per plan.',
      footerText: 'LogiBill CFS Operations',
      parameters: '["party_name", "container_number", "size", "gate_in_date", "job_number"]',
    },
  ];

  for (const tpl of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: { templateName: tpl.templateName },
      update: tpl,
      create: tpl,
    });
  }

  // 10. Initial WhatsApp mock message log
  await prisma.whatsAppMessage.create({
    data: {
      recipientPhone: '+919820144552',
      recipientName: 'Sanjay Varma (Greenwich Maridian)',
      invoiceId: invoice1.id,
      messageType: 'INVOICE_PDF',
      templateName: 'invoice_ready_v1',
      status: 'DELIVERED',
      payloadJson: JSON.stringify({
        invoiceNumber: 'MSK/HT5/SEP26',
        amount: 145848,
        dueDate: '2026-09-17',
      }),
      responseJson: JSON.stringify({
        messaging_product: 'whatsapp',
        contacts: [{ input: '+919820144552', wa_id: '919820144552' }],
        messages: [{ id: 'wamid.HBgMOTE5ODIwMTQ0NTUyFQIAERgSQURFRTMw' }],
      }),
      externalMessageId: 'wamid.HBgMOTE5ODIwMTQ0NTUyFQIAERgSQURFRTMw',
      sentAt: new Date('2026-09-02T11:35:00Z'),
    },
  });

  // 11. Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        userName: 'Amitabh Sharma (Admin)',
        action: 'CREATE',
        entityType: 'PARTY',
        entityId: party1.id,
        details: 'Verified and registered GSTIN 27AABCG6715G2ZO for Greenwich Maridian Logistics.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: adminUser.id,
        userName: 'Amitabh Sharma (Admin)',
        action: 'FINALIZE',
        entityType: 'INVOICE',
        entityId: invoice1.id,
        details: 'Invoice MSK/HT5/SEP26 finalized for ₹1,45,848.00.',
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
