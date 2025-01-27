// src/services/orderService.ts
import { kafka } from '../config/kafka.config'; // Ensure the path is correct and the module exists
import { OrderData, OrderModel } from '../models/order';
import * as metrics from '../monitoring/metrics';

export class OrderService {
  async createOrder(orderData: OrderData) {
    try {
      // Store in MongoDB
      const order = await OrderModel.create(orderData);
      
      // Publish to Kafka
      await kafka.producer().send({
        topic: 'orders',
        messages: [{ value: JSON.stringify(order) }]
      });
      
      // Track metric
      metrics.orderCounter.inc();
      
      return order;
    } catch (error) {
      metrics.errorCounter.inc();
      throw error;
    }
  }
}