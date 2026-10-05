import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { SeederService } from './seeder.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seederService = app.get(SeederService);
    const result = await seederService.seed();
    console.log('\n==========================================');
    console.log('✅ DHRUTO DB SEED COMPLETED SUCCESSFULLY');
    console.log('==========================================');
    console.log(JSON.stringify(result.stats, null, 2));
    console.log('==========================================\n');
  } catch (error) {
    console.error('\n❌ SEED EXECUTION FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
