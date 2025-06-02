import express from 'express';
import { 
  getBrands, 
  getBrandById, 
  createBrand, 
  updateBrand, 
  deleteBrand,
  getInteractiveDecisionPathway
} from '../controllers/brandController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Protected routes
router.use(protect);

router.route('/')
  .get(getBrands)
  .post(createBrand);

router.route('/:id')
  .get(getBrandById)
  .put(updateBrand)
  .delete(deleteBrand);

// Interactive Decision Pathway route
router.get('/:id/pathway', getInteractiveDecisionPathway);

export default router;
