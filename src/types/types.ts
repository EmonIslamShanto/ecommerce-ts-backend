import { NextFunction, Request, Response } from "express";

export interface NewUserRequestBody{
    name: string;
    email: string;
    photo: string;
    gender: string;
    _id: string;
    dob: Date;

}

export interface NewProductRequestBody{
    name: string;
    price: number;
    description: string;
    stock: number;
    category: string;
}


export type ControllerType = (
    req: Request<any>, 
    res: Response, 
    next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>



export type SearchRequestQuery = {
    search?: string;
    category?: string;
    price?: string;
    page?: string;
    sort?: string;
}

export interface BaseQuery {
    name? : {
        $regex: string;
        $options: string;
    };
    price?: {
        $lte: number;
    };
    category?: string;
}


export type invalidateCacheType = {
    product?: boolean;
    user?: boolean;
    order?: boolean;
    admin?: boolean;
    userId?: string;
    orderId?: string;
    productId?: string | string[];
}

export type OrderItemType = {
    name: string;
    quantity: number;
    price: number;
    productId: string;
    photo: string;
}

export type ShippingInfoType ={
    address: string;
    city: string;
    state: string;
    phone: string;
    postalCode: number;
    country: string;
}

export interface NewOrderRequestBody {

    shippingInfo: ShippingInfoType;
    user: string;
    subtotal: number;
    tax: number;
    shippingCharge: number;
    discount: number;
    total: number;
    orderItems: OrderItemType[];
}