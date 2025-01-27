import { Router } from 'express';
import { OrderService } from '../services/order.service';
import { OrderModel } from '../models/order';



const router = Router();
const orderService = new OrderService();

router.post('/', async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/', async (req, res) => {
  try {
    const orders = await OrderModel.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});



export { router as orderRoutes };
