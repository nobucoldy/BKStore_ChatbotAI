import { Router } from 'express';
import categoryRoutes from './category.routes';
import brandRoutes from './brand.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import branchRoutes from './branch.routes';
import knowledgeRoutes from './knowledge.routes';
import chatRoutes from './chat.routes';
import reviewRoutes from './review.routes';
import inventoryRoutes from './inventory.routes';
import authRoutes from './auth.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/brands', brandRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/branches', branchRoutes);
apiRouter.use('/knowledge', knowledgeRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/inventory', inventoryRoutes);

export default apiRouter;

