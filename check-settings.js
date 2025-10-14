const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
      console.log('No settings found in database');
      return;
    }
    
    console.log('Current operational settings:');
    console.log(JSON.stringify(settings.operational, null, 2));
    
    // Check for invalid time values
    if (settings.operational && settings.operational.days) {
      Object.entries(settings.operational.days).forEach(([day, config]) => {
        if (config.active) {
          const startTime = config.startTime;
          const endTime = config.endTime;
          
          if (!startTime || !endTime || !startTime.match(/^\d{2}:\d{2}$/) || !endTime.match(/^\d{2}:\d{2}$/)) {
            console.error(`Invalid time format for ${day}: startTime="${startTime}", endTime="${endTime}"`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error checking settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSettings();
