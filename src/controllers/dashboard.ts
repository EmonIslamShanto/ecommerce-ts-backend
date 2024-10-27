import { start } from "repl";
import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { Order } from "../models/order.js";
import { calculatePercentage } from "../utils/features.js";

export const getDashboardStats = TryCatch(async (req, res, next) => {
    let stats = {};
    const key = "admin-stats";
    if (myCache.has(key)) {
        stats = JSON.parse(myCache.get(key) as string);
    }
    else {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);

        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today,
        }
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0),
        }


        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lt: thisMonth.end
            }
        })

        const lastMonthProductsPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lt: lastMonth.end
            }
        })

        const thisMonthUsersPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lt: thisMonth.end
            }
        })

        const lastMonthUsersPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lt: lastMonth.end
            }
        })


        const thisMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lt: thisMonth.end
            }
        })

        const lastMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lt: lastMonth.end
            }
        })

        const lastSixMonthsOrdersPromise = Order.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lt: today
            }
        })

        const latestTransactionsPromies = Order.find({}).select(["total", "discount", "status", "orderItems"]).sort({ createdAt: -1 }).limit(5);

        const [thisMonthProducts, lastMonthProducts, thisMonthUsers, lastMonthUsers, thisMonthOrders, lastMonthOrders, productCount, userCount, allOrders, lastSixMonthsOrders, categories, maleUsersCount, latestTransactions] = await Promise.all([
            thisMonthProductsPromise,
            lastMonthProductsPromise,
            thisMonthUsersPromise,
            lastMonthUsersPromise,
            thisMonthOrdersPromise,
            lastMonthOrdersPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find().select("total"),
            lastSixMonthsOrdersPromise,
            Product.distinct("category"),
            User.countDocuments({ gender: "male" }),
            latestTransactionsPromies,
        ])

        const thisMonthRevenue = thisMonthOrders.reduce(
            (total, order) => total + (order.total || 0), 0
        );

        const lastMonthRevenue = lastMonthOrders.reduce(
            (total, order) => total + (order.total || 0), 0
        );

        const revenue = allOrders.reduce(
            (total, order) => total + (order.total || 0), 0
        );

        const revenueChangePercentage = calculatePercentage(thisMonthRevenue, lastMonthRevenue);

        const userChangePercentage = calculatePercentage(thisMonthUsers.length, lastMonthUsers.length);

        const orderChangePercentage = calculatePercentage(thisMonthOrders.length, lastMonthOrders.length);

        const productChangePercentage = calculatePercentage(thisMonthProducts.length, lastMonthProducts.length);

        const orderMonthsCount = new Array(6).fill(0);
        const orderMonthsRevenue = new Array(6).fill(0);

        lastSixMonthsOrders.forEach((order) => {
            const creationDate = order.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

            if (monthDiff < 6) {
                orderMonthsCount[5 - monthDiff] += 1;
                orderMonthsRevenue[5 - monthDiff] += order.total;
            }

        })

        const categoriesCountPromise = categories.map((category) => Product.countDocuments({ category }));

        const categoriesCount = await Promise.all(categoriesCountPromise);

        const categoryCount: Record<string, number>[] = [];

        categories.forEach((category, index) => {
            categoryCount.push({
                [category]: Math.round((categoriesCount[index] / productCount) * 100),
            })
        })

        const genderRatio = {
            male: maleUsersCount,
            female: userCount - maleUsersCount,
        };

        const modifiedLatestTransactions = latestTransactions.map((i) => ({
            _id: i._id,
            total: i.total,
            discount: i.discount,
            status: i.status,
            quantity: i.orderItems.length,
        }))

        stats = {
            categoryCount,
            genderRatio,
            latestTransactions: modifiedLatestTransactions,
            revenue: {
                totalRevenue: revenue,
                thisMonth: thisMonthRevenue,
                lastMonth: lastMonthRevenue,
                change: revenueChangePercentage,
            },
            users: {
                totalUsers: userCount,
                thisMonth: thisMonthUsers.length,
                lastMonth: lastMonthUsers.length,
                change: userChangePercentage,
            },
            orders: {
                totalOrders: allOrders.length,
                thisMonth: thisMonthOrders.length,
                lastMonth: lastMonthOrders.length,
                change: orderChangePercentage,
            },
            products: {
                totalProducts: productCount,
                thisMonth: thisMonthProducts.length,
                lastMonth: lastMonthProducts.length,
                change: productChangePercentage,
            },
            chart: {
                order: orderMonthsCount,
                revenue: orderMonthsRevenue,
            }
        }

        myCache.set(key, JSON.stringify(stats));

    }

    return res.status(200).json({
        success: true,
        stats,
    })
});
export const getPieCharts = TryCatch(async (req, res, next) => {

    let charts;
    const key = "admin-pie-charts";
    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    }
    else {
        const [processingOrder, shippedOrder, deliveredOrder, categories, productCount, productInStock, allOrders, allUsers, costomerUsers, adminUsers] = await Promise.all([
            Order.countDocuments({ status: "Processing" }),
            Order.countDocuments({ status: "Shipped" }),
            Order.countDocuments({ status: "Delivered" }),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({ stock: { $gt: 0 } }),
            Order.find({}).select(["total", "discount", "tax", "shippingCharge"]),
            User.find({}).select(["dob"]),
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "admin" }),
        ])

        const categoriesCountPromise = categories.map((category) => Product.countDocuments({ category }));

        const categoriesCount = await Promise.all(categoriesCountPromise);

        const productCatergories: Record<string, number>[] = [];

        categories.forEach((category, index) => {
            productCatergories.push({
                [category]: Math.round((categoriesCount[index] / productCount) * 100),
            })
        })

        const stockAvailable = {
            inStock: productInStock,
            outOfStock: productCount - productInStock,
        }

        const totalRevenue = allOrders.reduce(
            (total, order) => total + (order.total || 0), 0
        );

        const totalDiscount = allOrders.reduce(
            (total, order) => total + (order.discount || 0), 0
        );

        const totalTax = allOrders.reduce(
            (total, order) => total + (order.tax || 0), 0
        );

        const totalShipping = allOrders.reduce(
            (total, order) => total + (order.shippingCharge || 0), 0
        );


        const netmargin = totalRevenue - totalDiscount - totalTax - totalShipping;

        const revenueDistribution = {
            totalRevenue,
            totalDiscount,
            totalTax,
            totalShipping,
            netmargin,
        }

        const ageGroup = {
            teen: allUsers.filter((user) => user.age < 20).length,
            adult: allUsers.filter((user) => user.age >= 20 && user.age < 40).length,
            older: allUsers.filter((user) => user.age >= 40).length,
        }

        const users = {
            customer: costomerUsers,
            admin: adminUsers,
        }

        charts = {
            orderStatus: {
                processing: processingOrder,
                shipped: shippedOrder,
                delivered: deliveredOrder,
            },
            productCatergories,
            stockAvailable,
            revenueDistribution,
            users,
            ageGroup,
        }

        myCache.set(key, JSON.stringify(charts));
    }

    return res.status(200).json({
        success: true,
        charts,
    })
});
export const getBarCharts = TryCatch(async (req, res, next) => {

    let charts;
    const key = "admin-bar-charts";

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    }
    else {

        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(today.getMonth() - 12);

        const sixMonthsProductsPromise = Product.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lt: today
            }
        }).select(["createdAt"]);

        const twelveMonthsOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lt: today
            }
        }).select(["createdAt"]);

        const sixMonthsUsersPromise = User.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lt: today
            }
        }).select(["createdAt"]);

        const [products, orders, users] = await Promise.all([
            sixMonthsProductsPromise,
            twelveMonthsOrdersPromise,
            sixMonthsUsersPromise
        ])

        const productCount = new Array(6).fill(0);
        const userCount = new Array(6).fill(0);
        const orderCount = new Array(12).fill(0);

        products.forEach((product) => {
            const creationDate = product.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 6) {
                productCount[5 - monthDiff] += 1;
            }
        })
        users.forEach((user) => {
            const creationDate = user.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 6) {
                userCount[5 - monthDiff] += 1;
            }
        })
        orders.forEach((order) => {
            const creationDate = order.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 12) {
                orderCount[11 - monthDiff] += 1;
            }
        })

        charts = {
            product: productCount,
            user: userCount,
            order: orderCount,
        }


        myCache.set(key, JSON.stringify(charts));
    }

    return res.status(200).json({
        success: true,
        charts,
    })
});
export const getLineCharts = TryCatch(async (req, res, next) => {

    let charts;
    const key = "admin-line-charts";

    if (myCache.has(key)) {
        charts = JSON.parse(myCache.get(key) as string);
    }
    else {
        const today = new Date();

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(today.getMonth() - 12);

        const baseQuery = {
            createdAt: {
                $gte: twelveMonthsAgo,
                $lt: today
            }
        }

        const [ orders, products, users] = await Promise.all([
            Order.find(baseQuery).select(["createdAt", "discount", "total"]),
            Product.find(baseQuery).select(["createdAt"]),
            User.find(baseQuery).select(["createdAt"])
        ])

        const productCount = new Array(12).fill(0);
        const userCount = new Array(12).fill(0);
        const discount = new Array(12).fill(0);
        const revenue = new Array(12).fill(0);

        products.forEach((product) => {
            const creationDate = product.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 12) {
                productCount[11 - monthDiff] += 1;
            }
        })
        users.forEach((user) => {
            const creationDate = user.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 12) {
                userCount[11 - monthDiff] += 1;
            }
        })
        orders.forEach((order) => {
            const creationDate = order.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 12) {
                discount[11 - monthDiff] += order.discount;
            }
        })
        orders.forEach((order) => {
            const creationDate = order.createdAt;
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 12) {
                revenue[11 - monthDiff] += order.total;
            }
        })

        charts = {
            product: productCount,
            user: userCount,
            discount,
            revenue,
        }
    }

    return res.status(200).json({
        success: true,
        charts,
    })
});