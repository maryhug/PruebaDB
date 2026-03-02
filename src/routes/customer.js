import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => res.json({ message: 'Courses routes working!' }));
router.post('/', (req, res) => res.status(201).json({ message: 'POST courses' }));
router.get('/:id', (req, res) => res.json({ message: `GET course ${req.params.id}` }));
router.put('/:id', (req, res) => res.json({ message: `PUT course ${req.params.id}` }));
router.delete('/:id', (req, res) => res.json({ message: `DELETE course ${req.params.id}` }));

export default router;
