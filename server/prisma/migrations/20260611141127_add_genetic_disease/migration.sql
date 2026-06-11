-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "gender" TEXT NOT NULL,
    "birthDate" DATETIME,
    "color" TEXT,
    "weight" REAL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "isBreeding" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownedBy" TEXT
);

-- CreateTable
CREATE TABLE "ParentRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    CONSTRAINT "ParentRelation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentRelation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "parsedData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" DATETIME,
    "appointmentId" TEXT,
    CONSTRAINT "GeneReport_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneReport_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "GeneTestAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneticMarker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "markerName" TEXT NOT NULL,
    "geneName" TEXT NOT NULL,
    "chromosome" TEXT,
    "position" INTEGER,
    "variant" TEXT NOT NULL,
    "disease" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "inheritance" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneMarkerData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "markerId" TEXT NOT NULL,
    "genotype" TEXT NOT NULL,
    "allele1" TEXT,
    "allele2" TEXT,
    "zygosity" TEXT,
    "source" TEXT,
    "testedAt" DATETIME,
    CONSTRAINT "GeneMarkerData_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneMarkerData_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "GeneticMarker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "disease" TEXT NOT NULL,
    "riskScore" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "parent1Id" TEXT,
    "parent2Id" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskPrediction_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BreedingPair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maleId" TEXT NOT NULL,
    "femaleId" TEXT NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "inbreedingCoefficient" REAL,
    "riskAssessment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BreedingPair_maleId_fkey" FOREIGN KEY ("maleId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BreedingPair_femaleId_fkey" FOREIGN KEY ("femaleId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeightRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeightRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LitterRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "breedingPairId" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "aliveCount" INTEGER NOT NULL,
    "deadCount" INTEGER NOT NULL,
    "notes" TEXT,
    "healthComparison" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LitterRecord_breedingPairId_fkey" FOREIGN KEY ("breedingPairId") REFERENCES "BreedingPair" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PuppyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "litterRecordId" TEXT NOT NULL,
    "petId" TEXT,
    "name" TEXT,
    "gender" TEXT NOT NULL,
    "birthWeight" REAL,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'alive',
    "healthStatus" TEXT NOT NULL DEFAULT 'normal',
    "healthNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PuppyRecord_litterRecordId_fkey" FOREIGN KEY ("litterRecordId") REFERENCES "LitterRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PuppyRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PetTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "fromOwnerName" TEXT NOT NULL,
    "fromOwnerContact" TEXT,
    "toOwnerName" TEXT NOT NULL,
    "toOwnerContact" TEXT,
    "transferDate" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PetTransfer_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BreedingAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BreedingAlert_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneTestAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "expectedDate" DATETIME NOT NULL,
    "testItems" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "GeneTestAppointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VaccineRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccinationDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "institution" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VaccineRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PetDailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "mood" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PetDailyLog_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "origin" TEXT,
    "avgLifespan" TEXT,
    "commonDiseases" TEXT,
    "carePoints" TEXT,
    "description" TEXT,
    "avatarUrl" TEXT,
    "sizeCategory" TEXT,
    "temperament" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reminder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "examDate" DATETIME NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "conclusion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HealthReport_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneticDisease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "inheritance" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "affectedBreeds" TEXT NOT NULL,
    "references" TEXT,
    "description" TEXT,
    "riskLevel" TEXT,
    "prevalence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentRelation_parentId_childId_relationType_key" ON "ParentRelation"("parentId", "childId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "GeneMarkerData_petId_markerId_key" ON "GeneMarkerData"("petId", "markerId");

-- CreateIndex
CREATE INDEX "BreedingAlert_isRead_idx" ON "BreedingAlert"("isRead");

-- CreateIndex
CREATE INDEX "BreedingAlert_petId_idx" ON "BreedingAlert"("petId");

-- CreateIndex
CREATE INDEX "BreedingAlert_alertType_idx" ON "BreedingAlert"("alertType");

-- CreateIndex
CREATE INDEX "GeneTestAppointment_petId_idx" ON "GeneTestAppointment"("petId");

-- CreateIndex
CREATE INDEX "GeneTestAppointment_status_idx" ON "GeneTestAppointment"("status");

-- CreateIndex
CREATE INDEX "VaccineRecord_petId_idx" ON "VaccineRecord"("petId");

-- CreateIndex
CREATE INDEX "VaccineRecord_vaccinationDate_idx" ON "VaccineRecord"("vaccinationDate");

-- CreateIndex
CREATE INDEX "VaccineRecord_expiryDate_idx" ON "VaccineRecord"("expiryDate");

-- CreateIndex
CREATE INDEX "PetDailyLog_petId_idx" ON "PetDailyLog"("petId");

-- CreateIndex
CREATE INDEX "PetDailyLog_createdAt_idx" ON "PetDailyLog"("createdAt");

-- CreateIndex
CREATE INDEX "Breed_species_idx" ON "Breed"("species");

-- CreateIndex
CREATE UNIQUE INDEX "Breed_name_species_key" ON "Breed"("name", "species");

-- CreateIndex
CREATE INDEX "Reminder_petId_idx" ON "Reminder"("petId");

-- CreateIndex
CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");

-- CreateIndex
CREATE INDEX "Reminder_isCompleted_idx" ON "Reminder"("isCompleted");

-- CreateIndex
CREATE INDEX "HealthReport_petId_idx" ON "HealthReport"("petId");

-- CreateIndex
CREATE INDEX "HealthReport_examDate_idx" ON "HealthReport"("examDate");

-- CreateIndex
CREATE INDEX "GeneticDisease_species_idx" ON "GeneticDisease"("species");

-- CreateIndex
CREATE INDEX "GeneticDisease_inheritance_idx" ON "GeneticDisease"("inheritance");

-- CreateIndex
CREATE UNIQUE INDEX "GeneticDisease_name_species_key" ON "GeneticDisease"("name", "species");
