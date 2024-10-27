import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";

export const newOrder = TryCatch(async (req: Request<{}, {}, NewOrderRequestBody>, res: Response, next: NextFunction) => {

    const { shippingInfo, orderItems, user, subtotal, tax, shippingCharge, discount, total } = req.body;

    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total) {
        return next(new ErrorHandler("Please fill all the fields", 400));
    }

    const order = await Order.create({ shippingInfo, orderItems, user, subtotal, tax, shippingCharge, discount, total });

    await reduceStock(orderItems);

    invalidateCache({
        product: true,
        order: true,
        admin: true,
        userId: user,
        productId: order.orderItems.map(item => String(item.productId))
    });

    return res.status(201).json({
        success: true,
        message: "Order placed successfully",
    });
})

export const myOrders = TryCatch(async (req: Request, res: Response, next: NextFunction) => {

    const { id: user } = req.query;
    const key = `my-orders-${user}`;
    let orders = [];

    if (myCache.has(key)) {
        orders = JSON.parse(myCache.get(key) as string);
    }
    else {
        orders = await Order.find({ user });
        if (orders.length === 0) {
            return next(new ErrorHandler("You have no orders", 404));
        }
        myCache.set(key, JSON.stringify(orders));
    }


    return res.status(200).json({
        success: true,
        orders,
    });

});


export const allOrders = TryCatch(async (req: Request, res: Response, next: NextFunction) => {

    const key = `all-orders`;
    let orders = [];

    if (myCache.has(key)) {
        orders = JSON.parse(myCache.get(key) as string);
    }
    else {
        orders = await Order.find().populate("user", "name");
        if (orders.length === 0) {
            return next(new ErrorHandler("No orders found", 404));
        }
        myCache.set(key, JSON.stringify(orders));
    }


    return res.status(200).json({
        success: true,
        orders,
    });

});
export const getSingleOrder = TryCatch(async (req: Request, res: Response, next: NextFunction) => {

    const id = req.params.id;
    const key = `order-${id}`;
    let order;

    if (myCache.has(key)) {
        order = JSON.parse(myCache.get(key) as string);
    }
    else {
        order = await Order.findById(id).populate("user", "_id name");
        if (!order) {
            return next(new ErrorHandler("Order not found", 404));
        }
        myCache.set(key, JSON.stringify(order));
    }


    return res.status(200).json({
        success: true,
        order,
    });

});

export const processOrder = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
        return next(new ErrorHandler("Order not found", 404));
    }

    if (order.status === "Processing") {
        order.status = "Shipped";
    } else if (order.status === "Shipped") {
        order.status = "Delivered";
    }

    await order.save();

    try {
        invalidateCache({ product: false, order: true, admin: true, userId: order.user.toString(), orderId: String(order._id) });
    } catch (error) {
        return next(new ErrorHandler("Cache invalidation failed", 500));
    }


    return res.status(200).json({
        success: true,
        message: "Order processed successfully",
    });


});


export const deleteOrder = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
        return next(new ErrorHandler("Order not found", 404));
    }

    await order.deleteOne();

    invalidateCache({ product: false, order: true, admin: true, userId: order.user, orderId: String(order._id) });

    return res.status(200).json({
        success: true,
        message: "Order deleted successfully",
    });


});