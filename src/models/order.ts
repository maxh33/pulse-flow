import mongoose from 'mongoose';

export interface OrderData {
  orderId: string;
  status: string;
  timestamp: Date;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

const orderSchema = new mongoose.Schema<OrderData>({
  orderId: { type: String, required: true, unique: true },
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  items: [{
    productId: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }]
});

export const OrderModel = mongoose.model<OrderData>('Order', orderSchema);
