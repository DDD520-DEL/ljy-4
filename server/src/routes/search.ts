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

    const [nameMatchedPets, breedMatchedPets, geneMarkers, diseaseMatchedMarkers, breedingPairs] = await Promise.all([
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

    const nameMatchedPetIds = new Set(nameMatchedPets.map((pet) => pet.id));
    const filteredBreedMatchedPets = breedMatchedPets.filter(
      (pet) => !nameMatchedPetIds.has(pet.id)
    );

    const geneMarkerIds = new Set(geneMarkers.map((marker) => marker.id));
    const filteredDiseaseMatchedMarkers = diseaseMatchedMarkers.filter(
      (marker) => !geneMarkerIds.has(marker.id)
    );

    res.json({
      pets: nameMatchedPets,
      breeds: filteredBreedMatchedPets,
      geneMarkers,
      diseases: filteredDiseaseMatchedMarkers,
      breedingPairs,
    });
  } catch (error) {
    console.error('搜索失败:', error);
    console.error('错误详情:', JSON.stringify(error, null, 2));
    res.status(500).json({
      error: '搜索失败',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
