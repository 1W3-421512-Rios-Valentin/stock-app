const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

console.log('Iniciando servidor...')
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'stock-app-secret-key-2024';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

let isConnected = false

console.log('Conectando a MongoDB Atlas...')
console.log('URI:', process.env.MONGODB_URI)

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('Conectado a MongoDB Atlas!')
    isConnected = true
  })
  .catch(err => {
    console.error('Error MongoDB:', err.message)
    console.error('Code:', err.code)
  });

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

app.use((req, res, next) => {
  if (!isConnected) {
    return res.status(503).json({ error: 'Base de datos conectando, esperar...' })
  }
  next()
})

const User = require('./models/User');

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Usuario debe tener al menos 3 caracteres' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Contraseña debe tener al menos 6 caracteres' })
    }
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ error: 'Usuario ya existe' })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ username, password: hashedPassword })
    await user.save()
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, username: user.username })
  } catch (err) {
    console.error('Error register:', err)
    res.status(500).json({ error: err.message })
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
    }
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, username: user.username })
  } catch (err) {
    console.error('Error login:', err)
    res.status(500).json({ error: err.message })
  }
});

const Size = require('./models/Size');
const Product = require('./models/Product');
const Stock = require('./models/Stock');
const Production = require('./models/Production');
const Order = require('./models/Order');

app.get('/api/sizes', authMiddleware, async (req, res) => {
  try {
    const sizes = await Size.find().sort({ order: 1 });
    res.json(sizes);
  } catch (err) {
    console.error('Error sizes:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { sku, name, description, stockMin, category } = req.body;
    const product = new Product({ sku, name, description, stockMin: stockMin || 0, category: category || 'General' });
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('Error post product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Error get products:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:sku', authMiddleware, async (req, res) => {
  try {
    const { name, description, stockMin, category } = req.body;
    const product = await Product.findOneAndUpdate(
      { sku: req.params.sku },
      { name, description, stockMin: stockMin || 0, category: category || 'General' },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error put product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:sku', authMiddleware, async (req, res) => {
  try {
    const { sku } = req.params;
    console.log('Eliminando producto:', sku);
    const product = await Product.findOneAndDelete({ sku });
    if (!product) {
      console.log('Producto no encontrado');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await Stock.deleteMany({ sku });
    await Production.deleteMany({ sku });
    await Order.deleteMany({ sku });
    console.log('Producto eliminado');
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error('Error delete product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock', authMiddleware, async (req, res) => {
  try {
    const result = await Stock.bulkWrite(req.body.items.map(item => ({
      updateOne: {
        filter: { sku: item.sku, size: item.size },
        update: { $set: { quantity: item.quantity, updatedAt: new Date() } },
        upsert: true
      }
    })));
    res.json({ success: true, modified: result.modifiedCount, upserted: result.upsertedCount });
  } catch (err) {
    console.error('Error stock:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock/:sku', authMiddleware, async (req, res) => {
  try {
    const stock = await Stock.find({ sku: req.params.sku });
    res.json(stock);
  } catch (err) {
    console.error('Error get stock:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock', authMiddleware, async (req, res) => {
  try {
    const stock = await Stock.find();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production', authMiddleware, async (req, res) => {
  try {
    const result = await Production.bulkWrite(req.body.items.map(item => ({
      updateOne: {
        filter: { sku: item.sku, size: item.size },
        update: { $set: { quantity: item.quantity, date: new Date() } },
        upsert: true
      }
    })));
    res.json({ success: true, modified: result.modifiedCount, upserted: result.upsertedCount });
  } catch (err) {
    console.error('Error production:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/production/:sku', authMiddleware, async (req, res) => {
  try {
    const production = await Production.find({ sku: req.params.sku });
    res.json(production);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/production', authMiddleware, async (req, res) => {
  try {
    const production = await Production.find();
    res.json(production);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/production/:id/add-to-stock', authMiddleware, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production) {
      return res.status(404).json({ error: 'Producción no encontrada' });
    }
    const stock = await Stock.findOne({ sku: production.sku, size: production.size });
    if (stock) {
      stock.quantity += production.quantity;
      await stock.save();
    } else {
      await Stock.create({ sku: production.sku, size: production.size, quantity: production.quantity });
    }
    production.addedToStock = true;
    await production.save();
    res.json(production);
  } catch (err) {
    console.error('Error add to stock:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const result = await Order.bulkWrite(req.body.items.map(item => ({
      updateOne: {
        filter: { sku: item.sku, size: item.size, clientId: item.clientId || 'general' },
        update: { $inc: { quantity: item.quantity }, $set: { clientName: item.clientName || 'General' } },
        upsert: true
      }
    })));
    res.json({ success: true, modified: result.modifiedCount, upserted: result.upsertedCount });
  } catch (err) {
    console.error('Error orders:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:sku', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ sku: req.params.sku });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(order);
  } catch (err) {
    console.error('Error update order:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analysis', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    const sizes = await Size.find().sort({ order: 1 });
    const allStock = await Stock.find();
    const allProduction = await Production.find();
    const allOrders = await Order.find();

    const { filter, sortBy } = req.query;

    const results = products.map(product => {
      const stockData = allStock.filter(s => s.sku === product.sku);
      const productionData = allProduction.filter(p => p.sku === product.sku);
      const ordersData = allOrders.filter(o => o.sku === product.sku);

      const analysis = sizes.map(size => {
        const stock = stockData.find(s => s.size === size.code)?.quantity || 0;
        const production = productionData.find(p => p.size === size.code && !p.addedToStock)?.quantity || 0;
        const pendingOrders = ordersData.filter(o => o.size === size.code && o.status === 'pendiente').reduce((sum, o) => sum + o.quantity, 0);
        const deliveredOrders = ordersData.filter(o => o.size === size.code && o.status === 'entregado').reduce((sum, o) => sum + o.quantity, 0);
        const available = stock + production - pendingOrders - deliveredOrders;

        return {
          size: size.code,
          stock,
          production,
          orders: pendingOrders + deliveredOrders,
          available: available >= 0 ? available : 0,
          deficit: available < 0 ? Math.abs(available) : 0
        };
      });

      const totals = {
        totalStock: analysis.reduce((sum, a) => sum + a.stock, 0),
        totalProduction: analysis.reduce((sum, a) => sum + a.production, 0),
        totalOrders: analysis.reduce((sum, a) => sum + a.orders, 0),
        totalAvailable: analysis.reduce((sum, a) => sum + a.available, 0)
      };

      return { 
        sku: product.sku, 
        name: product.name, 
        stockMin: product.stockMin || 0,
        category: product.category || 'General',
        analysis, 
        totals 
      };
    });

    let filteredResults = results;
    
    if (filter === 'lowStock') {
      filteredResults = results.filter(p => p.totals.totalAvailable <= p.stockMin && p.stockMin > 0);
    } else if (filter === 'noStock') {
      filteredResults = results.filter(p => p.totals.totalStock === 0);
    } else if (filter === 'negative') {
      filteredResults = results.filter(p => p.totals.totalAvailable < 0);
    }

    if (sortBy === 'name') {
      filteredResults.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stock') {
      filteredResults.sort((a, b) => b.totals.totalStock - a.totals.totalStock);
    } else if (sortBy === 'available') {
      filteredResults.sort((a, b) => a.totals.totalAvailable - b.totals.totalAvailable);
    }

    res.json(filteredResults);
  } catch (err) {
    console.error('Error analysis:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analysis/:sku', authMiddleware, async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ sku });
    if (!product) {
      return res.status(404).json({ error: 'SKU no encontrado' });
    }

    const sizes = await Size.find().sort({ order: 1 });
    const stockData = await Stock.find({ sku });
    const productionData = await Production.find({ sku });
    const ordersData = await Order.find({ sku });

    const analysis = sizes.map(size => {
      const stock = stockData.find(s => s.size === size.code)?.quantity || 0;
      const production = productionData.find(p => p.size === size.code && !p.addedToStock)?.quantity || 0;
      const pendingOrders = ordersData.filter(o => o.size === size.code && o.status === 'pendiente').reduce((sum, o) => sum + o.quantity, 0);
      const deliveredOrders = ordersData.filter(o => o.size === size.code && o.status === 'entregado').reduce((sum, o) => sum + o.quantity, 0);
      const available = stock + production - pendingOrders - deliveredOrders;

      return {
        size: size.code,
        stock,
        production,
        orders: pendingOrders + deliveredOrders,
        available: available >= 0 ? available : 0,
        deficit: available < 0 ? Math.abs(available) : 0
      };
    });

    const totals = {
      totalStock: analysis.reduce((sum, a) => sum + a.stock, 0),
      totalProduction: analysis.reduce((sum, a) => sum + a.production, 0),
      totalOrders: analysis.reduce((sum, a) => sum + a.orders, 0),
      totalAvailable: analysis.reduce((sum, a) => sum + a.available, 0)
    };

    res.json({ 
      sku, 
      name: product.name, 
      stockMin: product.stockMin || 0,
      category: product.category || 'General',
      analysis, 
      totals 
    });
  } catch (err) {
    console.error('Error analysis single:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
console.log('Iniciando Express en puerto', PORT)
app.listen(PORT, () => console.log(`Server corriendo en http://localhost:${PORT}`));
