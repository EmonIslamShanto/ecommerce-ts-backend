import  express  from "express";
import { createProduct, deleteProduct, getAllCatergories, getAdminProducts, getLatestProducts, getSingleProduct, updateProduct, getAllProducts  } from "../controllers/product.js";
import { upload } from "../middlewares/multer.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();

app.post('/new', adminOnly, upload, createProduct)
app.get('/latest', getLatestProducts)
app.get('/search', getAllProducts)
app.get('/categories', getAllCatergories)
app.get('/admin-products',adminOnly, getAdminProducts)
app.route('/:id').get(getSingleProduct).put(adminOnly,upload,updateProduct).delete(adminOnly, deleteProduct)

export default app;