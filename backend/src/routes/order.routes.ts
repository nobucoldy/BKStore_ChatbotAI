import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/order.schema';

const router = Router();

router.get('/', orderController.getOrders);
router.get('/my-orders', requireAuth, orderController.getMyOrders);
router.post('/', optionalAuth, validateBody(createOrderSchema), orderController.createOrder);
router.get('/:orderCode', orderController.getOrder);
router.patch('/:orderCode/status', validateBody(updateOrderStatusSchema), orderController.updateOrderStatus);

export default router;
