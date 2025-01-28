import { Router } from 'express';
import { OrderService } from '../services/order.service';
import { OrderModel } from '../models/order';



const router = Router();
const orderService = new OrderService();

router.post('/', async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const orders = await OrderModel.find();
    res.json(orders);
  } catch (error) {
    next(error);
  }
});



export { router as orderRoutes };
