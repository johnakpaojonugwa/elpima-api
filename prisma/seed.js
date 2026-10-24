import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Elpima Surgicals database seeding...");

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
      quoteDisclaimer: "Prices are confirmed upon official quotation request via WhatsApp and may vary based on quantity and specifications.",
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

  // 3. Seed Surgical Categories
  const categoriesData = [
    {
      name: "Laparoscopy & Minimally Invasive",
      slug: "laparoscopy-minimally-invasive",
      description: "Telescopes, trocars, graspers, clip appliers, and insufflation sets",
      displayOrder: 1,
    },
    {
      name: "Orthopedic Implants & Power Tools",
      slug: "orthopedic-implants-power-tools",
      description: "Titanium bone plates, cannulated screws, external fixators, and bone drills",
      displayOrder: 2,
    },
    {
      name: "General Surgical Instruments",
      slug: "general-surgical-instruments",
      description: "Forceps, retractors, needle holders, dissecting scissors, and clamps",
      displayOrder: 3,
    },
    {
      name: "Electrosurgery & Diathermy",
      slug: "electrosurgery-diathermy",
      description: "Monopolar/bipolar generators, pencils, non-stick forceps, and return electrodes",
      displayOrder: 4,
    },
    {
      name: "Anesthesia & Theater Equipment",
      slug: "anesthesia-theater-equipment",
      description: "Patient monitors, anesthesia workstations, suction units, and OT tables",
      displayOrder: 5,
    },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Surgical categories seeded");

  // 4. Seed Specialties
  const specialtiesData = [
    { name: "General Surgery", slug: "general-surgery" },
    { name: "Orthopedic Surgery", slug: "orthopedic-surgery" },
    { name: "Laparoscopy & Bariatric", slug: "laparoscopy-bariatric" },
    { name: "Neurosurgery & Spine", slug: "neurosurgery-spine" },
    { name: "Obstetrics & Gynecology", slug: "obstetrics-gynecology" },
  ];

  const specialties = {};
  for (const spec of specialtiesData) {
    specialties[spec.slug] = await prisma.specialty.upsert({
      where: { slug: spec.slug },
      update: {},
      create: spec,
    });
  }
  console.log("✅ Surgical specialties seeded");

  // 5. Seed High-Precision Surgical Products (No Public Prices!)
  const productsData = [
    {
      name: "HD Laparoscopic 30° Rigid Optical Telescope (10mm x 300mm)",
      slug: "hd-laparoscopic-30-optical-telescope-10mm",
      sku: "ELP-LAP-TEL-3010",
      categoryId: categories["laparoscopy-minimally-invasive"].id,
      specialtyId: specialties["laparoscopy-bariatric"].id,
      shortDescription: "Ultra-high definition optical laparoscope with sapphire lens and autoclavable laser-welded body.",
      description: "Engineered for superior optical resolution and contrast in minimally invasive abdominal surgeries. Features distortion-free rod lenses, anti-fogging coating, and scratch-resistant sapphire distal windows.",
      specifications: {
        "Optical Angle": "30 Degrees",
        "Diameter": "10mm",
        "Working Length": "300mm",
        "Optics Type": "Hopkins II Rod Lens System",
        "Material": "Medical Grade Stainless Steel & Sapphire Glass",
        "Sterilization": "Steam Autoclavable (134°C / 273°F), Plasma, Gas",
      },
      compliance: ["ISO 13485", "CE Class IIa", "FDA Registered"],
      images: [
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock — Dispatched within 24 hours",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Titanium Locking Proximal Humerus Plate & Screw Set",
      slug: "titanium-locking-proximal-humerus-plate-screw-set",
      sku: "ELP-ORT-PHP-TI01",
      categoryId: categories["orthopedic-implants-power-tools"].id,
      specialtyId: specialties["orthopedic-surgery"].id,
      shortDescription: "Anatomically pre-contoured locking plate for proximal humerus multi-fragment fractures.",
      description: "Manufactured from pure Grade 4 biocompatible Titanium (Ti-6Al-4V). Features low-profile plate borders to minimize subacromial impingement, convergent/divergent screw trajectories for high pull-out resistance, and suture holes for tuberosity fixation.",
      specifications: {
        "Material": "Titanium Ti-6Al-4V ELI (ASTM F136)",
        "Profile": "Anatomical Pre-contoured Low-Profile",
        "Screws Accommodated": "3.5mm Locking & Cortex Screws",
        "Holes": "3-hole to 8-hole options",
        "Biocompatibility": "Implant Grade, High Osteointegration",
      },
      compliance: ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "Immediate Availability",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Mayo Dissecting Scissors Curved (Tungsten Carbide Inserts)",
      slug: "mayo-dissecting-scissors-curved-tungsten-carbide",
      sku: "ELP-GEN-SCI-MC17",
      categoryId: categories["general-surgical-instruments"].id,
      specialtyId: specialties["general-surgery"].id,
      shortDescription: "Heavy-duty surgical dissecting scissors with gold-plated rings and TC cutting edges.",
      description: "Designed for cutting dense tissue, fascial sheaths, and surgical sutures. Features welded Tungsten Carbide cutting edges that retain razor sharpness 5x longer than standard surgical stainless steel.",
      specifications: {
        "Length": "17cm (6.75 inches)",
        "Blade Profile": "Curved, Blunt/Blunt Beveled Tips",
        "Edge Type": "Tungsten Carbide (TC) Gold Handle",
        "Finish": "Satin / Matte Anti-Glare",
        "Reusable": "Yes, Autoclavable up to 1000 cycles",
      },
      compliance: ["ISO 9001", "ISO 13485", "CE Certified"],
      images: [
        "https://images.unsplash.com/photo-1583912267670-6575ad3736df?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock",
      minOrderQuantity: 2,
      isFeatured: false,
    },
    {
      name: "Orthopedic Surgical Power Bone Drill & Sagittal Saw System",
      slug: "orthopedic-power-bone-drill-sagittal-saw-system",
      sku: "ELP-ORT-PWR-DRILL02",
      categoryId: categories["orthopedic-implants-power-tools"].id,
      specialtyId: specialties["orthopedic-surgery"].id,
      shortDescription: "Multi-functional brushless orthopedic surgical handpiece with dual battery packs and autoclavable casing.",
      description: "High-torque, low-noise cannulated surgical drill and sagittal saw designed for trauma, joint replacement, and sports medicine procedures. Features variable speed trigger, quick-coupling chucks, and rapid sterilization casing.",
      specifications: {
        "Speed": "0 - 1,200 RPM (Cannulated Drill); 0 - 15,000 OPM (Saw)",
        "Cannulation Diameter": "4.2mm (supports K-wires and guide pins)",
        "Motor": "Brushless Medical Grade DC Motor",
        "Battery": "Dual Ni-MH 14.4V Rechargeable Batteries with Quick Charger",
        "Sterilization": "Handpiece autoclavable at 134°C (batteries non-autoclavable)",
      },
      compliance: ["ISO 13485", "CE Mark", "IEC 60601-1 Medical Electrical Safety"],
      images: [
        "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "2-3 business days",
      minOrderQuantity: 1,
      isFeatured: true,
    },
    {
      name: "Non-Stick Bipolar Bayonet Forceps (Titanium & Silver Alloy)",
      slug: "non-stick-bipolar-bayonet-forceps-titanium",
      sku: "ELP-ELE-BIP-FORC20",
      categoryId: categories["electrosurgery-diathermy"].id,
      specialtyId: specialties["neurosurgery-spine"].id,
      shortDescription: "Precision non-stick bayonet electrosurgical forceps for microsurgery and neurosurgery.",
      description: "Features thermally conductive silver alloy tips that dissipate heat immediately, preventing tissue eschar and coagulum sticking during delicate neural or vascular coagulation. Bayonet shape keeps surgeon's sightline completely unobstructed.",
      specifications: {
        "Length": "20cm Bayonet",
        "Tip Size": "1.0mm Micro Fine Tip",
        "Tip Technology": "Solid Silver Noble Alloy (Permanent Non-Stick)",
        "Insulation": "High-dielectric polymer coating tested up to 2000V",
        "Connector": "Standard European / US 2-Pin Bipolar",
      },
      compliance: ["ISO 13485", "CE 0123"],
      images: [
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      ],
      inStock: true,
      leadTime: "In Stock",
      minOrderQuantity: 1,
      isFeatured: true,
    },
  ];

  for (const prod of productsData) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: prod,
    });
  }
  console.log("✅ High-precision surgical products seeded");

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
