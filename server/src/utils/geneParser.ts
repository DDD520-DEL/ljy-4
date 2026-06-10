import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import prisma from '../lib/prisma.js';

interface ParsedGeneData {
  markers: {
    markerName: string;
    geneName?: string;
    genotype: string;
    zygosity?: string;
    result?: string;
  }[];
  rawText?: string;
}

export async function parseGeneReportPdf(filePath: string): Promise<ParsedGeneData> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const markers = extractMarkersFromText(text);

    return {
      markers,
      rawText: text,
    };
  } catch (error) {
    console.error('PDF解析失败:', error);
    return { markers: [], rawText: '' };
  }
}

export async function parseGeneReportText(filePath: string): Promise<ParsedGeneData> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    const markers = extractMarkersFromText(text);

    return {
      markers,
      rawText: text,
    };
  } catch (error) {
    console.error('文本解析失败:', error);
    return { markers: [], rawText: '' };
  }
}

function extractMarkersFromText(text: string): ParsedGeneData['markers'] {
  const markers: ParsedGeneData['markers'] = [];

  const knownMarkers = [
    'MDR1', 'MDR1Δ33', 'PRA', 'PRA-prcd', 'DM', 'vWD', 'vWD1',
    'PKD', 'PKD1', 'HCM', 'Glycogenosis', 'GM1', 'MPS_VI',
    'CCD', 'HUU', 'IC', 'PRA_ftcd', 'PRA_rdAc',
  ];

  for (const markerName of knownMarkers) {
    const escapedName = markerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`${escapedName}[^\\n]*?([NMNM][/\\-][NMNM]|正常|携带者|患病|阳性|阴性|clear|carrier|affected)`, 'i'),
      new RegExp(`(${escapedName})[^\\n]{0,30}?(基因型|结果):?\\s*([A-Za-z][/\\-][A-Za-z]|\\S+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let genotype = '未检测';
        let zygosity: string | undefined;
        let result: string | undefined;

        const matchedText = match[0];

        if (matchedText.match(/(正常|clear|阴性|N\/N)/i)) {
          genotype = 'N/N';
          zygosity = 'homozygous';
          result = '正常';
        } else if (matchedText.match(/(携带者|carrier|N\/M|N\/m)/i)) {
          genotype = 'N/M';
          zygosity = 'heterozygous';
          result = '携带者';
        } else if (matchedText.match(/(患病|affected|M\/M|m\/m|阳性)/i)) {
          genotype = 'M/M';
          zygosity = 'homozygous';
          result = '患病';
        }

        if (genotype !== '未检测') {
          markers.push({
            markerName,
            genotype,
            zygosity,
            result,
          });
          break;
        }
      }
    }
  }

  return markers;
}

export async function saveParsedReport(
  petId: string,
  reportId: string,
  parsedData: ParsedGeneData
): Promise<void> {
  const species = (await prisma.pet.findUnique({ where: { id: petId } }))?.species;
  if (!species) return;

  const allMarkers = await prisma.geneticMarker.findMany({ where: { species } });
  const markerNameMap = new Map<string, string>();

  for (const marker of allMarkers) {
    markerNameMap.set(marker.markerName.toLowerCase(), marker.id);
    if (marker.geneName) {
      markerNameMap.set(marker.geneName.toLowerCase(), marker.id);
    }
  }

  for (const parsedMarker of parsedData.markers) {
    let markerId = markerNameMap.get(parsedMarker.markerName.toLowerCase());

    if (!markerId && parsedMarker.geneName) {
      markerId = markerNameMap.get(parsedMarker.geneName.toLowerCase());
    }

    if (markerId) {
      await prisma.geneMarkerData.upsert({
        where: {
          petId_markerId: {
            petId,
            markerId,
          },
        },
        update: {
          genotype: parsedMarker.genotype,
          zygosity: parsedMarker.zygosity || null,
          source: 'test_report',
          testedAt: new Date(),
        },
        create: {
          petId,
          markerId,
          genotype: parsedMarker.genotype,
          zygosity: parsedMarker.zygosity || null,
          source: 'test_report',
          testedAt: new Date(),
        },
      });
    }
  }

  await prisma.geneReport.update({
    where: { id: reportId },
    data: {
      status: 'parsed',
      parsedData: JSON.stringify(parsedData),
      parsedAt: new Date(),
    },
  });
}

export function generateMockGeneReport(species: string, breed: string): ParsedGeneData {
  const dogMarkers = [
    { markerName: 'MDR1Δ33', geneName: 'ABCB1' },
    { markerName: 'PRA-prcd', geneName: 'PRCD' },
    { markerName: 'DM', geneName: 'SOD1' },
    { markerName: 'vWD1', geneName: 'VWF' },
    { markerName: 'CCD', geneName: 'COL4A5' },
    { markerName: 'HUU', geneName: 'HAO1' },
  ];

  const catMarkers = [
    { markerName: 'PKD1', geneName: 'PKD1' },
    { markerName: 'PRA_rdAc', geneName: 'CEP290' },
    { markerName: 'HCM', geneName: 'MYBPC3' },
    { markerName: 'GM1', geneName: 'GLB1' },
  ];

  const markerList = species === 'cat' ? catMarkers : dogMarkers;

  const markers = markerList.map((m, idx) => {
    const random = Math.random();
    let genotype: string;
    let zygosity: string;
    let result: string;

    if (random < 0.7) {
      genotype = 'N/N';
      zygosity = 'homozygous';
      result = '正常/清晰';
    } else if (random < 0.95) {
      genotype = 'N/M';
      zygosity = 'heterozygous';
      result = '携带者';
    } else {
      genotype = 'M/M';
      zygosity = 'homozygous';
      result = '患病/受影响';
    }

    return {
      markerName: m.markerName,
      geneName: m.geneName,
      genotype,
      zygosity,
      result,
    };
  });

  return {
    markers,
    rawText: `模拟基因检测报告 - ${breed}(${species})\n检测时间: ${new Date().toLocaleDateString()}\n检测机构: PetGene Lab\n检测位点: ${markers.length}个`,
  };
}
