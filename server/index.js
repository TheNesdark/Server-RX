const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DICOM_DIR || path.join(__dirname, 'dicom_files');

fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());

// Mockup de datos de estudios médicos
const mockStudies = [
  {
    id: 1,
    patientName: "Juan Pérez",
    studyDate: "2025-11-01",
    studyType: "Tomografía Computarizada",
    dicomFile: "3.dicm"
  },
  {
    id: 2,
    patientName: "María García",
    studyDate: "2025-11-05",
    studyType: "Resonancia Magnética",
    dicomFile: "2.dcm"
  }
];

// Endpoint para obtener la lista de estudios
app.get('/studies', (req, res) => {
  res.json(mockStudies);
});

// Endpoint para obtener un estudio específico por ID
app.get('/studies/:id', (req, res) => {
  const studyId = parseInt(req.params.id);
  const study = mockStudies.find(s => s.id === studyId);
  
  if (!study) {
    return res.status(404).json({ error: 'Estudio no encontrado' });
  }
  
  res.json(study);
});

app.get('/files/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(DATA_DIR, name);
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).send('File not found');
    res.setHeader('Content-Type', 'application/dicom');
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    res.sendFile(filePath);
  });
});

// Health
app.get('/health', (req, res) => res.json({ ok: true, dir: DATA_DIR }));

app.listen(PORT, () => {
  console.log(`DICOM server running on http://localhost:${PORT}`);
  console.log(`Serving files from ${DATA_DIR}`);
});