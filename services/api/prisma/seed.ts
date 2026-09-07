import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { validateGeoJSON } from '../src/utils/geographyValidation';

const prisma = new PrismaClient();

interface GeoImportConfig {
  filePath: string;
  defaultState: string;
  defaultCity: string;
  version: string;
}

// Configuration-driven geography imports list.
// New datasets can be added here without modifying the import engine.
const GEOGRAPHY_IMPORTS: GeoImportConfig[] = [
  {
    filePath: path.join(__dirname, '../../../wards_indore.geojson'),
    defaultState: 'Madhya Pradesh',
    defaultCity: 'Indore',
    version: '2026-08-30',
  },
];

async function main() {
  console.log('Starting data-driven geography seeding...');

  // Cache to optimize database lookups and prevent unique constraint violations
  const stateCache: { [name: string]: string } = {};
  const cityCache: { [name: string]: string } = {};
  const zoneCache: { [key: string]: string } = {};

  for (const importConfig of GEOGRAPHY_IMPORTS) {
    console.log(`Processing dataset: ${importConfig.filePath}`);

    if (!fs.existsSync(importConfig.filePath)) {
      console.warn(`WARNING: File not found at ${importConfig.filePath}. Skipping.`);
      continue;
    }

    const fileContent = fs.readFileSync(importConfig.filePath, 'utf-8');
    const geojson = JSON.parse(fileContent);
    const validation = validateGeoJSON(geojson);
    if (!validation.valid) throw new Error(`Invalid geography dataset: ${validation.errors.slice(0, 10).join('; ')}`);
    const checksum = crypto.createHash('sha256').update(fileContent).digest('hex');
    const dataset = await prisma.geographyDataset.upsert({ where: { source_version: { source: importConfig.filePath, version: importConfig.version } }, update: { checksum, status: 'VALIDATING' }, create: { source: importConfig.filePath, version: importConfig.version, checksum, status: 'VALIDATING' } });

    console.log(`Loaded ${geojson.features.length} features. Importing...`);

    let importedWardsCount = 0;

    for (const feature of validation.collection.features) {
      // GeoJSON properties are external data; narrow them before using them as identifiers.
      const props = (feature.properties || {}) as Record<string, any>;
      const geometry = feature.geometry as any;

      if (!geometry || !geometry.coordinates) {
        continue;
      }

      // Dynamic attribute extraction with generic fallbacks
      const stateName = props.state || props.state_name || importConfig.defaultState;
      const cityName = props.townname || props.city_name || props.city || importConfig.defaultCity;
      
      const wardName =
        props.ward_lgd_name ||
        props.ward_name ||
        props.name ||
        (props.sourcewardcode ? `Ward ${props.sourcewardcode}` : `Ward LGD ${props.ward_lgd_code || props.objectid}`);

      // Dynamic Zone assignment fallback grouping (e.g. groups every 5 sourcewardcodes into a zone)
      let zoneName = props.zone_name || props.zone;
      if (!zoneName && props.sourcewardcode) {
        const wardNumber = parseInt(props.sourcewardcode, 10);
        if (!isNaN(wardNumber)) {
          zoneName = `Zone ${Math.ceil(wardNumber / 5)}`;
        }
      }
      if (!zoneName) {
        zoneName = 'General Zone';
      }

      // Ensure State exists
      let stateId = stateCache[stateName];
      if (!stateId) {
        const stateRecord = await prisma.state.upsert({
          where: { name: stateName },
          update: {},
          create: { name: stateName },
        });
        stateId = stateRecord.id;
        stateCache[stateName] = stateId;
      }

      // Ensure City exists
      let cityId = cityCache[cityName];
      if (!cityId) {
        const cityRecord = await prisma.city.upsert({
          where: { name: cityName },
          update: { stateId },
          create: { name: cityName, stateId },
        });
        cityId = cityRecord.id;
        cityCache[cityName] = cityId;
      }

      // Ensure Zone exists
      const zoneCacheKey = `${zoneName}_${cityId}`;
      let zoneId = zoneCache[zoneCacheKey];
      if (!zoneId) {
        const zoneRecord = await prisma.zone.upsert({ where: { name_cityId: { name: zoneName, cityId } }, update: {}, create: { name: zoneName, cityId } });
        zoneId = zoneRecord.id;
        zoneCache[zoneCacheKey] = zoneId;
      }

      // Create Ward boundary shape
      await prisma.ward.upsert({ where: { name_zoneId: { name: wardName, zoneId } }, update: { boundary: geometry, datasetId: dataset.id, sourceCode: String(props.sourcewardcode || props.ward_lgd_code || '') }, create: {
          name: wardName,
          zoneId: zoneId,
          boundary: geometry,
          datasetId: dataset.id,
          sourceCode: String(props.sourcewardcode || props.ward_lgd_code || ''),
        }
      });

      importedWardsCount++;
    }

    await prisma.geographyDataset.update({ where: { id: dataset.id }, data: { status: 'ACTIVE', importedAt: new Date() } });
    console.log(`Completed dataset: imported ${importedWardsCount} wards successfully.`);
  }

  // 3. Seed default departments for Indore city
  const indoreCity = await prisma.city.findFirst({
    where: { name: 'Indore' },
  });

  if (indoreCity) {
    console.log('Seeding municipal departments for Indore...');
    await prisma.department.deleteMany();

    const departmentsData = [
      {
        name: 'Public Works Department',
        handledCategories: ['POTHOLE'],
        defaultSlaHours: 48,
        warningThresholdHours: 12,
      },
      {
        name: 'Sanitation Department',
        handledCategories: ['GARBAGE', 'SEWAGE'],
        defaultSlaHours: 24,
        warningThresholdHours: 4,
      },
      {
        name: 'Electricity Department',
        handledCategories: ['STREETLIGHT'],
        defaultSlaHours: 12,
        warningThresholdHours: 2,
      },
      {
        name: 'Water Works Department',
        handledCategories: ['WATER_LEAK'],
        defaultSlaHours: 24,
        warningThresholdHours: 4,
      },
      {
        name: 'General Administration',
        handledCategories: ['OTHERS'],
        defaultSlaHours: 72,
        warningThresholdHours: 12,
      },
    ];

    for (const dept of departmentsData) {
      const created = await prisma.department.create({
        data: {
          name: dept.name,
          cityId: indoreCity.id,
          handledCategories: dept.handledCategories,
          defaultSlaHours: dept.defaultSlaHours,
          warningThresholdHours: dept.warningThresholdHours,
        },
      });
      for (const category of dept.handledCategories) {
        const key = category === 'OTHERS' ? 'OTHER' : category;
        const cat = await prisma.category.upsert({ where: { key }, update: { active: true }, create: { key, name: key.replace(/_/g, ' ') } });
        const existing = await prisma.routingRule.findFirst({ where: { categoryId: cat.id, cityId: indoreCity.id, departmentId: created.id, wardId: null, active: true } });
        if (!existing) await prisma.routingRule.create({ data: { categoryId: cat.id, cityId: indoreCity.id, departmentId: created.id, priority: 0 } });
      }
    }
    console.log('Departments seeded successfully.');
  }

  console.log('Seeding finished successfully! Database is fully updated.');
}

main()
  .catch((error) => {
    console.error('Seeding process failed with error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
