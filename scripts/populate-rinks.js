// scripts/populate-rinks.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rinkData = [
  // Southern California Rinks
  {
    id: "socal-skating-center",
    name: "SoCal Skating Center",
    timezone: "America/Los_Angeles",
    address: "1234 Ice Rink Drive, Los Angeles, CA 90210",
    maxCapacity: 50
  },
  {
    id: "anaheim-ice",
    name: "Anaheim Ice",
    timezone: "America/Los_Angeles", 
    address: "300 West Lincoln Avenue, Anaheim, CA 92805",
    maxCapacity: 45
  },
  {
    id: "culver-city-ice-rink",
    name: "Culver City Ice Rink",
    timezone: "America/Los_Angeles",
    address: "4545 Sepulveda Blvd, Culver City, CA 90230",
    maxCapacity: 40
  },
  {
    id: "valencia-ice-station",
    name: "Valencia Ice Station",
    timezone: "America/Los_Angeles",
    address: "24950 Pico Canyon Rd, Stevenson Ranch, CA 91381",
    maxCapacity: 35
  },
  
  // Novi, Michigan
  {
    id: "novi-ice-arena",
    name: "Novi Ice Arena",
    timezone: "America/Detroit",
    address: "42400 Nick Lidstrom Dr, Novi, MI 48375",
    maxCapacity: 60
  },
  
  // London, UK
  {
    id: "london-ice-centre",
    name: "London Ice Centre",
    timezone: "Europe/London",
    address: "2 Herne Hill Rd, London SE24 0AU, United Kingdom",
    maxCapacity: 30
  },
  
  // Montreal, Canada
  {
    id: "complexe-sportif-claude-robillard",
    name: "Complexe Sportif Claude-Robillard",
    timezone: "America/Toronto",
    address: "1000 Rue Émile-Journault, Montréal, QC H2M 2E7, Canada",
    maxCapacity: 55
  }
];

async function populateRinks() {
  console.log("🏒 Starting rink population...");
  
  try {
    for (const rink of rinkData) {
      const existingRink = await prisma.rink.findUnique({
        where: { id: rink.id }
      });
      
      if (existingRink) {
        console.log(`⚠️  Rink "${rink.name}" already exists, updating...`);
        await prisma.rink.update({
          where: { id: rink.id },
          data: {
            name: rink.name,
            timezone: rink.timezone,
            address: rink.address,
            maxCapacity: rink.maxCapacity,
            updatedAt: new Date()
          }
        });
      } else {
        console.log(`✅ Creating rink: ${rink.name}`);
        await prisma.rink.create({
          data: {
            ...rink,
            updatedAt: new Date()
          }
        });
      }
    }
    
    console.log("🎉 Rink population completed successfully!");
    console.log(`📊 Total rinks: ${rinkData.length}`);
    
    // Display all rinks
    const allRinks = await prisma.rink.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log("\n🏒 All Rinks:");
    allRinks.forEach(rink => {
      console.log(`  • ${rink.name} (${rink.timezone})`);
    });
    
  } catch (error) {
    console.error("❌ Error populating rinks:", error);
  } finally {
    await prisma.$disconnect();
  }
}

populateRinks();