/* global use, db */
// MongoDB Playground for pulse-flow orders

use('pulse-flow');

// Clear existing data
db.orders.drop();

// Insert sample orders
db.orders.insertMany([
  {
    orderId: "ORD001",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        productId: "PROD001",
        quantity: 2,
        price: 29.99
      }
    ]
  },
  {
    orderId: "ORD002",
    status: "processing",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        productId: "PROD002",
        quantity: 1,
        price: 49.99
      }
    ]
  }
]);

// Test Queries
// Find all orders
db.orders.find();

// Count by status 
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);

// Calculate total value
db.orders.aggregate([
  {
    $addFields: {
      totalValue: {
        $sum: {
          $map: {
            input: "$items",
            as: "item",
            in: { $multiply: ["$$item.price", "$$item.quantity"] }
          }
        }
      }
    }
  }
]);