import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json({
        pets: [],
        breeds: [],
        geneMarkers: [],
        diseases: [],
        breedingPairs: [],
      });
    }

    const keyword = q.trim();

    const [pets, breeds, geneMarkers, diseases, breedingPairs] = await Promise.all([
      prisma.pet.findMany({
        where: {
          name: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          avatarUrl: true,
        },
        take: 10,
      }),

      prisma.pet.findMany({
        where: {
          breed: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          avatarUrl: true,
        },
        take: 10,
      }),

      prisma.geneticMarker.findMany({
        where: {
          markerName: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          markerName: true,
          geneName: true,
          disease: true,
          species: true,
        },
        take: 10,
      }),

      prisma.geneticMarker.findMany({
        where: {
          disease: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          markerName: true,
          geneName: true,
          disease: true,
          species: true,
        },
        take: 10,
      }),

      prisma.breedingPair.findMany({
        where: {
          name: {
            contains: keyword,
          },
        },
        include: {
          male: {
            select: { id: true, name: true, breed: true },
          },
          female: {
            select: { id: true, name: true, breed: true },
          },
        },
        take: 10,
      }),
    ]);

    const seenBreedIds = new Set<string>();
    const uniqueBreeds = breeds.filter((pet) => {
      if (seenBreedIds.has(pet.id)) return false;
      seenBreedIds.add(pet.id);
      return true;
    });

    const uniquePets = pets.filter((pet) => !seenBreedIds.has(pet.id));

    const seenGeneMarkerIds = new Set<string>();
    const uniqueGeneMarkers = geneMarkers.filter((marker) => {
      if (seenGeneMarkerIds.has(marker.id)) return false;
      seenGeneMarkerIds.add(marker.id);
      return true;
    });

    const uniqueDiseases = diseases.filter((marker) => !seenGeneMarkerIds.has(marker.id));

    res.json({
      pets: uniquePets,
      breeds: uniqueBreeds,
      geneMarkers: uniqueGeneMarkers,
      diseases: uniqueDiseases,
      breedingPairs,
    });
  } catch (error) {
    console.error('搜索失败:', error);
    console.error('错误详情:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: '搜索失败',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
