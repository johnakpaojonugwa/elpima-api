import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Elpima Surgicals database seeding (HAS Medical Stapler Catalog)...");

  // 1. Seed Store Settings
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      whatsappNumber: process.env.DEFAULT_WHATSAPP_NUMBER || "2348000000000",
      companyName: "Elpima Surgicals Limited",
      companyEmail: "info@elpimasurgicals.com",
      companyPhone: "+2348000000000",
      companyAddress: "Victoria Island, Lagos, Nigeria",
      quoteDisclaimer:
        "Prices are confirmed upon official quotation request via WhatsApp and may vary based on cartridge sizes, staple heights, and order quantities.",
    },
  });
  console.log("✅ Store settings initialized");

  // 2. Seed Super-Admin and Supervising Manager
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 12);
  const managerPasswordHash = await bcrypt.hash("ManagerPassword123!", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@elpimasurgicals.com" },
    update: {},
    create: {
      email: "admin@elpimasurgicals.com",
      fullName: "Super Admin",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      phone: "+2348011111111",
      isActive: true,
    },
  });

  const supervisingManager = await prisma.user.upsert({
    where: { email: "manager@elpimasurgicals.com" },
    update: {},
    create: {
      email: "manager@elpimasurgicals.com",
      fullName: "Supervising Manager",
      passwordHash: managerPasswordHash,
      role: "SUPERVISING_MANAGER",
      phone: "+2348022222222",
      isActive: true,
    },
  });
  console.log("✅ Admin actors seeded (Super-Admin & Supervising Manager)");

  // Clear legacy products/categories/specialties if replacing catalog
  await prisma.quoteItem.deleteMany({});
  await prisma.quoteInquiry.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.specialty.deleteMany({});

  // 3. Seed 5 Clinical Surgical Categories
  const categoriesData = [
    {
      name: "Endoscopic & Powered Staplers",
      slug: "endoscopic-powered-staplers",
      description:
        "Minimally invasive laparoscopic and thoracoscopic endo cutter staplers, articulating linear cutters, and motorized powered stapling systems (Prefix: END).",
      displayOrder: 1,
      isActive: true,
    },
    {
      name: "Open Linear & Circular Staplers",
      slug: "open-linear-circular-staplers",
      description:
        "Digestive tract and open surgical anastomosis staplers including circular end-to-end staplers, linear staplers, and linear cutter staplers (Prefix: OPN).",
      displayOrder: 2,
      isActive: true,
    },
    {
      name: "Anorectal & Urological Staplers",
      slug: "anorectal-urological-staplers",
      description:
        "Procedure-specific single-use surgical staplers for PPH hemorrhoidopexy, mucosal prolapse resection, and clinical circumcision anastomosis (Prefix: SPC).",
      displayOrder: 3,
      isActive: true,
    },
    {
      name: "Wound & Fascial Closure Systems",
      slug: "wound-fascial-closure-systems",
      description:
        "External epidermal 35W skin staplers with extractors and laparoscopic port-site endo fascial closure devices for hernia prevention (Prefix: CLS).",
      displayOrder: 4,
      isActive: true,
    },
    {
      name: "Laparoscopic Access & Consumables",
      slug: "laparoscopic-access-consumables",
      description:
        "Single-use optical/bladed trocars, Type A & Type B incision wound dilators/retractors, Nitinol endo specimen retrieval bags, and suction-irrigation sets (Prefix: LAP).",
      displayOrder: 5,
      isActive: true,
    },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log("✅ 5 Clinical surgical categories seeded");

  // 4. Seed 5 Medical & Surgical Specialties
  const specialtiesData = [
    {
      name: "General & Laparoscopic Surgery",
      slug: "general-laparoscopic-surgery",
      description:
        "Minimally invasive abdominal, bariatric, hepatobiliary, and general surgical procedures.",
    },
    {
      name: "Gastrointestinal & Colorectal Surgery",
      slug: "gastrointestinal-colorectal-surgery",
      description:
        "Esophageal, gastric, small bowel, colorectal resection, and anorectal PPH procedures.",
    },
    {
      name: "Cardiothoracic & Vascular Surgery",
      slug: "cardiothoracic-vascular-surgery",
      description:
        "VATS pulmonary lobectomy, wedge resection, bronchial closure, and vascular stapling.",
    },
    {
      name: "Urology",
      slug: "urology",
      description:
        "Urological procedures, automated circumcision anastomosis, and laparoscopic nephrectomy.",
    },
    {
      name: "Obstetrics & Gynaecology (OB/GYN)",
      slug: "obstetrics-gynaecology",
      description:
        "Cesarean section incision retraction, laparoscopic gynecology, and epidermal skin closure.",
    },
  ];

  const specialties = {};
  for (const spec of specialtiesData) {
    specialties[spec.slug] = await prisma.specialty.upsert({
      where: { slug: spec.slug },
      update: spec,
      create: spec,
    });
  }
  console.log("✅ 5 Medical specialties seeded");

  // 5. Seed All 16 Products (Modeled on hasmedicalstapler.com)
  const productsData = [
    // ================= CATEGORY 1: ENDOSCOPIC & POWERED STAPLERS =================
    {
      name: "Disposable Endo Cutter Stapler",
      slug: "disposable-endo-cutter-stapler",
      sku: "ELP-END-ECS-002",
      categoryId: categories["endoscopic-powered-staplers"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Single-use articulating endoscopic linear cutting stapler with 6 staggered rows of titanium staples for laparoscopic transection and anastomosis.",
      description:
        "Designed for minimally invasive abdominal, gynecological, pediatric, and thoracic surgeries (#p2). Delivers 6 staggered rows of medical-grade titanium staples while simultaneously dividing tissue between the third and fourth rows. Features 360° shaft rotation, ±45° bilateral articulation, and universal handle compatibility across 30mm, 45mm, and 60mm reload cartridges.",
      specifications: {
        "Model Reference": "HAS #p2 — Disposable Endo Cutter Stapler",
        "Shaft Lengths": "60mm (Short), 160mm (Standard), 260mm (Long)",
        "Cartridge Sizes": "30mm, 45mm, 60mm",
        "Staple Rows": "6 Staggered Rows of Titanium Staples",
        "Open Staple Heights": "2.0mm (White), 2.5mm (Blue), 3.5mm (Gold), 4.8mm (Green)",
        "Articulation & Rotation": "±45° Bilateral Articulation, 360° Rotating Shaft",
        "Max Firings": "Up to 12 reload firings per single-patient instrument",
        "Material": "Medical-Grade Titanium (Ti) Staples & 316L Stainless Steel Anvil",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Endoscopic Linear Cutter Stapler",
      slug: "endoscopic-linear-cutter-stapler",
      sku: "ELP-END-ELC-003",
      categoryId: categories["endoscopic-powered-staplers"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "High-precision laparoscopic linear cutter stapler with integral new knife blade in every reload cartridge for clean tissue transection.",
      description:
        "Engineered for tissue resection, transection, and creation of anastomoses in laparoscopic and thoracoscopic surgery (#p3). Each disposable reload cartridge incorporates a fresh, precision-ground stainless steel knife blade to eliminate cross-contamination and ensure uniform cutting performance across multiple firings.",
      specifications: {
        "Model Reference": "HAS #p3 — Endoscopic Linear Cutter Stapler",
        "Shaft Lengths": "160mm (Standard), 260mm (Extended)",
        "Reload Lengths": "45mm, 60mm (Straight & Articulating)",
        "Staple Heights": "2.5mm, 3.5mm, 4.1mm, 4.8mm",
        "Knife Mechanism": "Fresh Integral Blade inside Every Reload Cartridge",
        "Trocar Compatibility": "12mm Laparoscopic Trocar Cannula",
        "Safety Lockout": "Auto safety lockout for spent or missing cartridges",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Powered Endoscopic Linear Stapler",
      slug: "powered-endoscopic-linear-stapler",
      sku: "ELP-END-PEL-011",
      categoryId: categories["endoscopic-powered-staplers"].id,
      specialtyId: specialties["cardiothoracic-vascular-surgery"].id,
      shortDescription:
        "Motorized battery-powered endoscopic linear cutter stapler that reduces firing force by 95% for superior distal tip stability in VATS & GI surgery.",
      description:
        "Advanced battery-powered endoscopic stapling system (#p11) compatible with FP/FY/RP/RY stepped and standard reloads. Motorized firing and retraction eliminate hand-squeeze tremor during delicate pulmonary vascular, bronchial, and gastrointestinal transections. Includes a 15-second pre-compression tissue stabilization mode and manual emergency bailout override.",
      specifications: {
        "Model Reference": "HAS #p11 — Powered Endoscopic Linear Stapler",
        "Drive System": "Integrated Lithium Battery Motorized Firing & Retraction",
        "Reload Series": "FP / FY / RP / RY Stepped & Standard Reloads (45mm, 60mm)",
        "Articulation": "50° Bilateral Jaw Articulation, 360° Shaft Rotation",
        "Staple Rows": "6 Staggered Rows with Stepped Tissue Compression",
        "Safety Override": "Manual Emergency Return Bailout Port",
        "Trocar Compatibility": "12mm Laparoscopic / Thoracoscopic Port",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved", "IEC 60601-1"],
      images: [
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Powered Cutter Stapler",
      slug: "powered-cutter-stapler",
      sku: "ELP-END-PCS-009",
      categoryId: categories["endoscopic-powered-staplers"].id,
      specialtyId: specialties["gastrointestinal-colorectal-surgery"].id,
      shortDescription:
        "Electric constant-speed powered cutter stapler delivering uniform staple formation across variable-thickness gastrointestinal tissues.",
      description:
        "Electric motor-driven surgical cutter stapler (#p9) engineered for consistent staple line hemostasis in bariatric, gastric, and colorectal procedures. Constant-speed blade advancement prevents tissue milking and ensures uniform B-shaped titanium staple closure from proximal to distal jaw ends.",
      specifications: {
        "Model Reference": "HAS #p9 — Powered Cutter Stapler",
        "Drive Mechanism": "Constant-Speed Electric Motor Transection",
        "Suture Lengths": "45mm, 60mm",
        "Staple Rows": "6 Staggered Rows of Titanium Staples",
        "Compressed Tissue Range": "1.0mm – 2.5mm",
        "Handle Ergonomics": "Single-Handed One-Touch Firing Trigger",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 1,
      isFeatured: false,
    },

    // ================= CATEGORY 2: OPEN LINEAR & CIRCULAR STAPLERS =================
    {
      name: "Disposable Circular Stapler",
      slug: "disposable-circular-stapler",
      sku: "ELP-OPN-DCS-004",
      categoryId: categories["open-linear-circular-staplers"].id,
      specialtyId: specialties["gastrointestinal-colorectal-surgery"].id,
      shortDescription:
        "Curved intraluminal circular stapler placing two staggered concentric rows of titanium staples for end-to-end and end-to-side GI anastomosis.",
      description:
        "Used throughout the alimentary canal for end-to-end, end-to-side, and side-to-side anastomosis in esophageal, gastric, and colorectal surgery (#p4). Simultaneously fires two staggered concentric rings of titanium staples while an internal annular blade excises excess inverted tissue to create a patent, leak-resistant circular lumen.",
      specifications: {
        "Model Reference": "HAS #p4 — Disposable Circular Stapler",
        "Outer Diameters": "21mm, 24mm, 26mm, 29mm, 32mm, 34mm",
        "Staple Rows": "2 Staggered Concentric Rows of Titanium Staples",
        "Closed Staple Height": "1.0mm – 2.5mm Adjustable Tissue Compression Scale",
        "Knife Type": "316L Stainless Steel Annular Circular Blade",
        "Feedback Mechanism": "Audible & Tactile Crunch Feedback Ring",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1583912267670-6575ad3736df?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Disposable Linear Stapler",
      slug: "disposable-linear-stapler",
      sku: "ELP-OPN-DLS-006",
      categoryId: categories["open-linear-circular-staplers"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Single-use open linear stapler (30mm–90mm) delivering two staggered rows of titanium staples for visceral stump closure and tissue approximation.",
      description:
        "Delivers two staggered rows of titanium staples to approximate internal tissues and close organ stumps in digestive and thoracic surgery (#p6). Available in 30mm, 45mm, 60mm, and 90mm jaw lengths with 3.5mm (standard) and 4.8mm (thick tissue) reload cartridges. Features an automatic/manual tissue retaining alignment pin.",
      specifications: {
        "Model Reference": "HAS #p6 — Disposable Linear Stapler",
        "Suture Lengths": "30mm, 45mm, 60mm, 90mm",
        "Staple Heights": "3.5mm (Blue - Standard), 4.8mm (Green - Thick Tissue)",
        "Staple Rows": "2 Staggered Rows of Titanium Staples",
        "Alignment Pin": "Auto / Manual Tissue Retaining Pin",
        "Reloadable": "Up to 8 reload firings per single patient",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 2,
      isFeatured: false,
    },
    {
      name: "Disposable Linear Cutter Stapler",
      slug: "disposable-linear-cutter-stapler",
      sku: "ELP-OPN-DLC-007",
      categoryId: categories["open-linear-circular-staplers"].id,
      specialtyId: specialties["gastrointestinal-colorectal-surgery"].id,
      shortDescription:
        "Open surgical linear cutter stapler (55mm, 75mm, 100mm) placing 4 staggered rows of titanium staples while transecting tissue.",
      description:
        "Designed for open gastrointestinal, thoracic, and gynecological resections and side-to-side functional end-to-end anastomoses (#p7). Places two double-staggered rows of titanium staples and divides tissue between them in a single stroke. Features a bidirectional firing knob for left- or right-handed operation.",
      specifications: {
        "Model Reference": "HAS #p7 — Disposable Linear Cutter Stapler",
        "Cutting / Stapling Lengths": "55mm, 75mm, 100mm",
        "Staple Heights": "3.8mm (Blue - Regular), 4.5mm (Green - Thick)",
        "Staple Rows": "4 Staggered Rows (2 on each side of cut line)",
        "Firing Mechanism": "Dual-Sided Bidirectional Firing Knob",
        "Safety Lockout": "Integrated empty-cartridge lockout mechanism",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 2,
      isFeatured: false,
    },

    // ================= CATEGORY 3: ANORECTAL & UROLOGICAL STAPLERS =================
    {
      name: "Hemorrhoids Stapler (PPH)",
      slug: "hemorrhoids-stapler-pph",
      sku: "ELP-SPC-PPH-005",
      categoryId: categories["anorectal-urological-staplers"].id,
      specialtyId: specialties["gastrointestinal-colorectal-surgery"].id,
      shortDescription:
        "Complete Procedure for Prolapse and Hemorrhoids (PPH) circular stapling kit (32mm / 34mm) with anal dilator, anoscope, and suture threader.",
      description:
        "Engineered for transanal circular stapled hemorrhoidopexy and rectal mucosal prolapse resection (#p5). Resects a circumferential strip of prolapsed rectal mucosa above the dentate line and restores anatomical anal cushion position with minimal postoperative pain. Supplied as a complete sterile surgical kit.",
      specifications: {
        "Model Reference": "HAS #p5 — Hemorrhoids Stapler (PPH)",
        "Cartridge Diameters": "32mm, 34mm",
        "Number of Staples": "32 – 34 Titanium Staples (2 Concentric Rows)",
        "Open Staple Leg Length": "3.8mm / 4.2mm (Closed Height: 0.75mm – 1.5mm)",
        "Included Kit Accessories": "Circular Anal Dilator (CAD), Purse-String Anoscope (PSA), Suture Threader (ST)",
        "Housing Design": "4-Port Symmetrical Suture Traction Channels",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 2,
      isFeatured: true,
    },
    {
      name: "Circumcision Stapler",
      slug: "circumcision-stapler",
      sku: "ELP-SPC-CIR-014",
      categoryId: categories["anorectal-urological-staplers"].id,
      specialtyId: specialties["urology"].id,
      shortDescription:
        "Single-use urological circumcision anastomat (12mm–36mm) performing simultaneous foreskin excision and hemostatic silicone-ring stapling in 3 minutes.",
      description:
        "Disposable clinical circumcision stapler (#p14) available across full pediatric, adolescent, and adult glans bell diameters (12mm to 36mm). Performs circular foreskin excision and automated titanium staple hemostasis over a medical silicone ring in a single action, reducing operative time to 3–5 minutes with spontaneous staple detachment after healing.",
      specifications: {
        "Model Reference": "HAS #p14 — Disposable Circumcision Stapler",
        "Glans Bell Diameters": "12mm, 15mm, 18mm, 21mm, 26mm, 30mm, 34mm, 36mm",
        "Mechanism": "Simultaneous Annular Excision & Silicone-Ring Stapling",
        "Operative Duration": "3 – 5 Minutes (Minimal Intraoperative Bleeding)",
        "Staple Detachment": "Spontaneous Shedding within 7 – 14 Days Post-Op",
        "Blade & Staples": "316L Stainless Steel Annular Blade & Medical Staples",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 5,
      isFeatured: false,
    },

    // ================= CATEGORY 4: WOUND & FASCIAL CLOSURE SYSTEMS =================
    {
      name: "Skin Stapler and Remover",
      slug: "skin-stapler-and-remover",
      sku: "ELP-CLS-SSR-008",
      categoryId: categories["wound-fascial-closure-systems"].id,
      specialtyId: specialties["obstetrics-gynaecology"].id,
      shortDescription:
        "Pre-loaded 35W disposable surgical skin stapler paired with an ergonomic stainless steel staple extractor for rapid epidermal wound closure.",
      description:
        "Single-use 35-wide (35W) skin stapler and matching staple remover (#p8) for rapid, cosmetic closure of long surgical incisions in general surgery, obstetrics (C-section), orthopedics, and trauma. Features an anti-jamming ratchet feed, transparent staple counter window, and directional alignment arrow.",
      specifications: {
        "Model Reference": "HAS #p8 — Skin Stapler and Remover (35W)",
        "Pre-loaded Capacity": "35 Wide Staples (35W)",
        "Formed Staple Dimensions": "6.9mm (Width) × 3.9mm (Height)",
        "Wire Diameter & Material": "0.58mm Medical-Grade 316L Stainless Steel",
        "Included Extractor": "Ergonomic Stainless Steel Skin Staple Remover",
        "Indicator Window": "Transparent Remaining-Staple Counter",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1583912267670-6575ad3736df?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Immediate Dispatch",
      minOrderQuantity: 10,
      isFeatured: true,
    },
    {
      name: "Endo Fascial Closure System",
      slug: "endo-fascial-closure-system",
      sku: "ELP-CLS-EFC-017",
      categoryId: categories["wound-fascial-closure-systems"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Laparoscopic port-site fascial closure instrument with bilateral suture capture wings to prevent trocar-site incisional hernia.",
      description:
        "Engineered for rapid, secure full-thickness closure of abdominal fascia and peritoneum at ≥10mm, 12mm, and 15mm laparoscopic trocar port sites (#p17). Features spring-loaded bilateral suture-grasping wings and a blunt protective distal shield that prevents inadvertent bowel or omental injury.",
      specifications: {
        "Model Reference": "HAS #p17 — Endo Fascial Closure System",
        "Target Port Sizes": "Closes ≥10mm, 12mm, and 15mm Trocar Port Sites",
        "Suture Mechanism": "Bilateral Spring-Loaded Suture Passer & Catcher Wings",
        "Distal Tip Protection": "Retractable Blunt Safety Shield",
        "Clinical Indication": "Prevention of Trocar-Site Incisional Hernia",
        "Suture Compatibility": "USP 0 / 2-0 Absorbable Braided Sutures",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 5,
      isFeatured: false,
    },

    // ================= CATEGORY 5: LAPAROSCOPIC ACCESS & CONSUMABLES =================
    {
      name: "Disposable Trocar",
      slug: "disposable-trocar",
      sku: "ELP-LAP-TRC-010",
      categoryId: categories["laparoscopic-access-consumables"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Single-use laparoscopic trocar (5mm, 10mm, 12mm, 15mm) with anti-slip threaded cannula and dual-seal airtight valve for stable pneumoperitoneum.",
      description:
        "Designed to establish working ports for laparoscopic instruments while minimizing abdominal wall trauma and preventing cross-infection (#p10). Features an inverted stability thread on the cannula sleeve to prevent trocar slippage during instrument exchange, a dual-seal universal air valve (5mm–12mm without reducer), and a 3-way Luer-lock CO₂ insufflation stopcock.",
      specifications: {
        "Model Reference": "HAS #p10 — Disposable Laparoscopic Trocar",
        "Cannula Diameters": "5mm, 10mm, 12mm, 15mm",
        "Working Lengths": "75mm (Short), 100mm (Standard), 150mm (Bariatric)",
        "Obturator Tip Options": "Bladeless Optical Tip / Shielded Blade / Blunt Tip",
        "Cannula Sleeve": "Anti-Slip Inverted Stability Thread Design",
        "Seal System": "Detachable Dual-Layer Universal Airtight Valve",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Immediate Dispatch",
      minOrderQuantity: 5,
      isFeatured: true,
    },
    {
      name: "Incision Dilator A",
      slug: "incision-dilator-a",
      sku: "ELP-LAP-IDA-012",
      categoryId: categories["laparoscopic-access-consumables"].id,
      specialtyId: specialties["obstetrics-gynaecology"].id,
      shortDescription:
        "Type A fixed-height dual-ring circumferential wound protector and abdominal retractor for laparotomy, C-section, and gynecological surgery.",
      description:
        "Circumferential 360° atraumatic wound retractor and incision protector — Model A (#p12). Maximally expands the surgical field while distributing tension evenly around the incision perimeter to reduce tissue ischemia, prevent surgical site infection (SSI), and maintain wound moisture during open abdominal, C-section, and thoracoscopic procedures.",
      specifications: {
        "Model Reference": "HAS #p12 — Disposable Incision Dilator A",
        "Design Configuration": "Type A — Fixed-Height Dual Elastic Ring Sheath",
        "Ring Diameter Sizes": "60/70mm, 80/90mm, 120/130mm, 180/190mm, 220/230mm, 270/280mm",
        "Applicable Incision Length": "2cm – 22cm",
        "Membrane Material": "Medical-Grade Biocompatible Polyurethane (TPU)",
        "Clinical Application": "C-Section, Laparotomy, Gynecological & Thoracic Surgery",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 5,
      isFeatured: false,
    },
    {
      name: "Incision Dilator B",
      slug: "incision-dilator-b",
      sku: "ELP-LAP-IDB-013",
      categoryId: categories["laparoscopic-access-consumables"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Type B roll-down variable-height wound retractor and incision protector that adapts to varying abdominal wall thicknesses.",
      description:
        "Adjustable variable-height wound protector and retractor — Model B (#p13). Features a flip-over / roll-down outer ring that allows surgeons to tension the TPU retraction sleeve precisely to any abdominal wall depth (including high-BMI patients), isolating incision edges from bacterial contamination and tumor cell seeding.",
      specifications: {
        "Model Reference": "HAS #p13 — Disposable Incision Dilator B",
        "Design Configuration": "Type B — Roll-Down Variable-Height Dual Ring",
        "Ring Diameter Sizes": "70/60mm, 90/80mm, 150/140mm, 200/190mm, 250/240mm",
        "Height Adjustment": "360° Roll-Up Outer Ring for Variable Wall Thickness",
        "Membrane Material": "High-Strength Tear-Resistant Medical TPU",
        "Clinical Function": "Atraumatic Retraction, SSI & Tumor Seeding Prevention",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 5,
      isFeatured: false,
    },
    {
      name: "Laparoscopic Endo Bag",
      slug: "laparoscopic-endo-bag",
      sku: "ELP-LAP-EBG-015",
      categoryId: categories["laparoscopic-access-consumables"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Self-opening Nitinol memory-wire laparoscopic specimen retrieval bag (S / M / L / XL) for leak-proof extraction of resected tissue.",
      description:
        "Disposable endoscopic specimen retrieval pouch (#p15) deployed through a standard 10mm trocar port. Features a self-expanding Nitinol memory-wire mouth that stays open hands-free inside the peritoneal cavity for effortless placement of gallbladder, appendix, lymph nodes, or ovarian cysts, paired with a leak-proof rip-stop TPU bag.",
      specifications: {
        "Model Reference": "HAS #p15 — Laparoscopic Endo Bag",
        "Available Sizes / Volumes": "Small (100ml), Medium (250ml), Large (450ml), XL (800ml)",
        "Bag Dimensions": "60×100mm (S), 85×130mm (M), 100×160mm (L), 130×200mm (XL)",
        "Introducer Shaft": "10mm Trocar Port Compatible",
        "Opening Mechanism": "Self-Expanding Nitinol Memory Alloy Ring",
        "Pouch Material": "Transparent Rip-Stop Leak-Proof Medical TPU",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1583912267670-6575ad3736df?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Immediate Dispatch",
      minOrderQuantity: 10,
      isFeatured: false,
    },
    {
      name: "Suction Irrigation",
      slug: "suction-irrigation",
      sku: "ELP-LAP-SIR-016",
      categoryId: categories["laparoscopic-access-consumables"].id,
      specialtyId: specialties["general-laparoscopic-surgery"].id,
      shortDescription:
        "Disposable laparoscopic suction-irrigation set with 5mm×330mm anti-clogging probe and ergonomic trumpet-valve handpiece.",
      description:
        "Single-use laparoscopic suction and irrigation cannula set (#p16) designed to evacuated blood, smoke, and surgical fluid while irrigating the peritoneal cavity to maintain clear optical visualization. Features color-coded one-hand trumpet valves, a blunt fenestrated distal probe tip that prevents omental suction trauma, and kink-resistant dual PVC tubing.",
      specifications: {
        "Model Reference": "HAS #p16 — Disposable Suction Irrigation Set",
        "Probe Dimensions": "5mm Diameter × 330mm Working Length (10mm optional)",
        "Tubing Length": "2.8m Dual-Lumen Non-Kink Medical PVC Tubing",
        "Valve Control": "Color-Coded Ergonomic Trumpet-Valve Handpiece",
        "Distal Tip": "Blunt Fenestrated Tip with Lateral Anti-Clog Ports",
        "Spike Connector": "Universal Dual IV Bag Irrigation Spike & Suction Adapter",
        "Sterilization": "Ethylene Oxide (EO) Sterile, Single-Use",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Immediate Dispatch",
      minOrderQuantity: 10,
      isFeatured: false,
    },
  ];

  const seededProducts = {};
  for (const prod of productsData) {
    seededProducts[prod.sku] = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: prod,
      create: prod,
    });
  }
  console.log("✅ All 16 HAS Medical Stapler & Laparoscopic products seeded");

  // 6. Seed Sample Hospital Quote Inquiries (RFQs) for these exact products
  const sampleQuotes = [
    {
      reference: "ELP-20261029-4812",
      customerName: "Dr. Adewale Ogunleye",
      customerPhone: "+2348034567890",
      customerEmail: "procurement@luth.gov.ng",
      hospitalClinic: "Lagos University Teaching Hospital (LUTH)",
      location: "Idi-Araba, Lagos",
      priority: "URGENT",
      status: "NEW",
      customerNotes:
        "Urgent theatre restock for laparoscopic gastrointestinal unit — need 60mm Endo Cutter Staplers with 3.5mm/4.8mm reloads and 12mm Trocars.",
      assignedToId: supervisingManager.id,
      items: [
        {
          productId: seededProducts["ELP-END-ECS-002"].id,
          productName: seededProducts["ELP-END-ECS-002"].name,
          productSku: "ELP-END-ECS-002",
          quantity: 10,
        },
        {
          productId: seededProducts["ELP-LAP-TRC-010"].id,
          productName: seededProducts["ELP-LAP-TRC-010"].name,
          productSku: "ELP-LAP-TRC-010",
          quantity: 25,
        },
      ],
    },
    {
      reference: "ELP-20261029-7390",
      customerName: "Matron Ngozi Eze",
      customerPhone: "+2348098765432",
      customerEmail: "supply@reddingtonhospital.com",
      hospitalClinic: "Reddington Multi-Specialist Hospital",
      location: "Victoria Island, Lagos",
      priority: "URGENT",
      status: "QUOTED",
      customerNotes:
        "Requesting proforma invoice for Powered Endoscopic Linear Staplers (#p11) and 29mm Circular Staplers (#p4).",
      assignedToId: supervisingManager.id,
      items: [
        {
          productId: seededProducts["ELP-END-PEL-011"].id,
          productName: seededProducts["ELP-END-PEL-011"].name,
          productSku: "ELP-END-PEL-011",
          quantity: 6,
        },
        {
          productId: seededProducts["ELP-OPN-DCS-004"].id,
          productName: seededProducts["ELP-OPN-DCS-004"].name,
          productSku: "ELP-OPN-DCS-004",
          quantity: 8,
        },
      ],
    },
    {
      reference: "ELP-20261028-1104",
      customerName: "Dr. Ibrahim Danjuma",
      customerPhone: "+2348023334455",
      customerEmail: "surgery@nha.gov.ng",
      hospitalClinic: "National Hospital Abuja",
      location: "Central Business District, Abuja",
      priority: "STANDARD",
      status: "FULFILLED",
      customerNotes:
        "Monthly order for PPH Hemorrhoids Stapler kits (34mm), 35W Skin Staplers with Removers, and Incision Dilator A.",
      assignedToId: supervisingManager.id,
      items: [
        {
          productId: seededProducts["ELP-SPC-PPH-005"].id,
          productName: seededProducts["ELP-SPC-PPH-005"].name,
          productSku: "ELP-SPC-PPH-005",
          quantity: 12,
        },
        {
          productId: seededProducts["ELP-CLS-SSR-008"].id,
          productName: seededProducts["ELP-CLS-SSR-008"].name,
          productSku: "ELP-CLS-SSR-008",
          quantity: 50,
        },
        {
          productId: seededProducts["ELP-LAP-IDA-012"].id,
          productName: seededProducts["ELP-LAP-IDA-012"].name,
          productSku: "ELP-LAP-IDA-012",
          quantity: 20,
        },
      ],
    },
  ];

  for (const q of sampleQuotes) {
    const { items, ...quoteData } = q;
    await prisma.quoteInquiry.create({
      data: {
        ...quoteData,
        items: {
          create: items,
        },
      },
    });
  }
  console.log("✅ Sample hospital quote inquiries (RFQs) seeded");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
