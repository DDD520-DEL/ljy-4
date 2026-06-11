import prisma from '../lib/prisma.js';
import { calculateInbreedingCoefficient } from './inbreeding.js';
import { getPetGeneticMarkers, calculateIndividualRisk } from './geneticRisk.js';

export const INBREEDING_THRESHOLD_WARNING = 0.0625;
export const INBREEDING_THRESHOLD_DANGER = 0.125;

export interface AlertDetails {
  inbreedingCoefficient?: number;
  threshold?: number;
  markerId?: string;
  markerName?: string;
  geneName?: string;
  disease?: string;
  riskLevel?: string;
  riskScore?: number;
  genotype?: string;
  explanation?: string;
}

function parseDetails(details: string | null): AlertDetails | null {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function serializeDetails(details: AlertDetails): string {
  return JSON.stringify(details);
}

export async function checkAndCreateInbreedingAlerts(): Promise<number> {
  const breedingPets = await prisma.pet.findMany({
    where: {
      isBreeding: true,
      status: 'active',
    },
  });

  let createdCount = 0;

  for (const pet of breedingPets) {
    try {
      const coefficient = await calculateInbreedingCoefficient(pet.id);

      if (coefficient >= INBREEDING_THRESHOLD_WARNING) {
        const existingAlert = await prisma.breedingAlert.findFirst({
          where: {
            petId: pet.id,
            alertType: 'inbreeding_threshold',
            isRead: false,
          },
        });

        if (!existingAlert) {
          const severity = coefficient >= INBREEDING_THRESHOLD_DANGER ? 'danger' : 'warning';
          const percentage = (coefficient * 100).toFixed(2);

          await prisma.breedingAlert.create({
            data: {
              petId: pet.id,
              alertType: 'inbreeding_threshold',
              severity,
              title: `${pet.name} 近交系数超标`,
              message: `近交系数为 ${percentage}%，${
                severity === 'danger' ? '属于高风险范围，强烈不建议繁殖' : '超出安全阈值，建议谨慎考虑繁殖'
              }`,
              details: serializeDetails({
                inbreedingCoefficient: coefficient,
                threshold:
                  severity === 'danger' ? INBREEDING_THRESHOLD_DANGER : INBREEDING_THRESHOLD_WARNING,
              }),
              isRead: false,
            },
          });

          createdCount++;
        }
      }
    } catch (error) {
      console.error(`检查宠物 ${pet.name} 近交系数失败:`, error);
    }
  }

  return createdCount;
}

export async function checkAndCreateGeneticRiskAlerts(): Promise<number> {
  const breedingPets = await prisma.pet.findMany({
    where: {
      isBreeding: true,
      status: 'active',
    },
    include: {
      geneMarkers: true,
    },
  });

  let createdCount = 0;

  for (const pet of breedingPets) {
    try {
      const markers = await getPetGeneticMarkers(pet.id);

      for (const marker of markers) {
        if (marker.genotype === '未检测') continue;

        const risk = calculateIndividualRisk(marker);

        if (risk.riskLevel === 'high') {
          const existingAlert = await prisma.breedingAlert.findFirst({
            where: {
              petId: pet.id,
              alertType: 'genetic_high_risk',
              sourceId: marker.id,
              isRead: false,
            },
          });

          if (!existingAlert) {
            await prisma.breedingAlert.create({
              data: {
                petId: pet.id,
                alertType: 'genetic_high_risk',
                severity: 'danger',
                title: `${pet.name} 检测到高风险遗传标记`,
                message: `标记 ${marker.markerName} (${marker.disease}) 存在高风险，基因型: ${marker.genotype}`,
                details: serializeDetails({
                  markerId: marker.id,
                  markerName: marker.markerName,
                  geneName: marker.geneName,
                  disease: marker.disease,
                  riskLevel: risk.riskLevel,
                  riskScore: risk.riskScore,
                  genotype: marker.genotype,
                  explanation: risk.explanation,
                }),
                sourceId: marker.id,
                isRead: false,
              },
            });

            createdCount++;
          }
        }
      }
    } catch (error) {
      console.error(`检查宠物 ${pet.name} 遗传风险失败:`, error);
    }
  }

  return createdCount;
}

export async function runFullAlertScan(): Promise<{
  inbreedingAlerts: number;
  geneticAlerts: number;
  total: number;
}> {
  const [inbreedingAlerts, geneticAlerts] = await Promise.all([
    checkAndCreateInbreedingAlerts(),
    checkAndCreateGeneticRiskAlerts(),
  ]);

  return {
    inbreedingAlerts,
    geneticAlerts,
    total: inbreedingAlerts + geneticAlerts,
  };
}

export async function checkPetAlerts(petId: string): Promise<{
  inbreedingAlerts: number;
  geneticAlerts: number;
  total: number;
}> {
  let inbreedingAlerts = 0;
  let geneticAlerts = 0;

  try {
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return { inbreedingAlerts: 0, geneticAlerts: 0, total: 0 };

    if (pet.isBreeding) {
      const coefficient = await calculateInbreedingCoefficient(petId);
      if (coefficient >= INBREEDING_THRESHOLD_WARNING) {
        const existingAlert = await prisma.breedingAlert.findFirst({
          where: {
            petId,
            alertType: 'inbreeding_threshold',
            isRead: false,
          },
        });

        if (!existingAlert) {
          const severity = coefficient >= INBREEDING_THRESHOLD_DANGER ? 'danger' : 'warning';
          const percentage = (coefficient * 100).toFixed(2);

          await prisma.breedingAlert.create({
            data: {
              petId,
              alertType: 'inbreeding_threshold',
              severity,
              title: `${pet.name} 近交系数超标`,
              message: `近交系数为 ${percentage}%，${
                severity === 'danger' ? '属于高风险范围，强烈不建议繁殖' : '超出安全阈值，建议谨慎考虑繁殖'
              }`,
              details: serializeDetails({
                inbreedingCoefficient: coefficient,
                threshold:
                  severity === 'danger' ? INBREEDING_THRESHOLD_DANGER : INBREEDING_THRESHOLD_WARNING,
              }),
              isRead: false,
            },
          });
          inbreedingAlerts++;
        }
      }

      const markers = await getPetGeneticMarkers(petId);
      for (const marker of markers) {
        if (marker.genotype === '未检测') continue;
        const risk = calculateIndividualRisk(marker);

        if (risk.riskLevel === 'high') {
          const existingAlert = await prisma.breedingAlert.findFirst({
            where: {
              petId,
              alertType: 'genetic_high_risk',
              sourceId: marker.id,
              isRead: false,
            },
          });

          if (!existingAlert) {
            await prisma.breedingAlert.create({
              data: {
                petId,
                alertType: 'genetic_high_risk',
                severity: 'danger',
                title: `${pet.name} 检测到高风险遗传标记`,
                message: `标记 ${marker.markerName} (${marker.disease}) 存在高风险，基因型: ${marker.genotype}`,
                details: serializeDetails({
                  markerId: marker.id,
                  markerName: marker.markerName,
                  geneName: marker.geneName,
                  disease: marker.disease,
                  riskLevel: risk.riskLevel,
                  riskScore: risk.riskScore,
                  genotype: marker.genotype,
                  explanation: risk.explanation,
                }),
                sourceId: marker.id,
                isRead: false,
              },
            });
            geneticAlerts++;
          }
        }
      }
    }
  } catch (error) {
    console.error(`检查宠物 ${petId} 警告失败:`, error);
  }

  return {
    inbreedingAlerts,
    geneticAlerts,
    total: inbreedingAlerts + geneticAlerts,
  };
}

export { parseDetails, serializeDetails };
