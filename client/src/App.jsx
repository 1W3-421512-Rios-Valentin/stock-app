import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import api from './api'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'

const NUMERIC_SIZES = ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52']
const ALPHABETIC_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <MainLayout onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analysis" element={<AnalysisViewWrapper />} />
              <Route path="/products" element={<ProductsViewWrapper />} />
              <Route path="/stock" element={<StockViewWrapper />} />
              <Route path="/production" element={<ProductionViewWrapper />} />
              <Route path="/orders" element={<OrdersViewWrapper />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

function MainLayout({ children, onLogout }) {
  const { user } = useAuth()
  return (
    <div className="app">
      <header>
        <h1>Stock Indumentaria</h1>
        <nav>
          <Link to="/analysis">Análisis</Link>
          <Link to="/products">Productos</Link>
          <Link to="/stock">Stock</Link>
          <Link to="/production">Producción</Link>
          <Link to="/orders">Pedidos</Link>
        </nav>
        <div className="user-info">
          <span>{user?.username}</span>
          <button onClick={onLogout} className="btn btn-danger">Cerrar Sesión</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="card">
      <h2>Bienvenido</h2>
      <p>Seleccioná una opción del menú para comenzar.</p>
    </div>
  )
}

function AnalysisViewWrapper() {
  const [products, setProducts] = useState([])
  const [sizes, setSizes] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    loadSizes()
    loadProducts()
  }, [])

  const loadSizes = async () => {
    try {
      const res = await api.get('/sizes')
      setSizes(res.data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const loadProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return <AnalysisView products={products} sizes={sizes} refreshTrigger={refreshTrigger} />
}

function AnalysisView({ products, sizes, refreshTrigger }) {
  const [analysis, setAnalysis] = useState([])
  const [selectedSku, setSelectedSku] = useState('')
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadAnalysis()
    return () => { mountedRef.current = false }
  }, [selectedSku, refreshTrigger])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      let res
      if (selectedSku) {
        res = await api.get(`/analysis/${selectedSku}`)
        if (mountedRef.current) {
          setAnalysis(res.data ? [res.data] : [])
        }
      } else {
        res = await api.get('/analysis')
        if (mountedRef.current) {
          setAnalysis(Array.isArray(res.data) ? res.data : [])
        }
      }
    } catch (err) {
      console.error('Error:', err)
      if (mountedRef.current) setAnalysis([])
    }
    if (mountedRef.current) setLoading(false)
  }

  const getBadgeClass = (value) => {
    if (value === 0) return 'badge-warning'
    if (value > 0) return 'badge-success'
    return 'badge-danger'
  }

  const numericSizes = sizes.filter(s => s.type === 'numeric')
  const alphabeticSizes = sizes.filter(s => s.type === 'alphabetic')

  return (
    <div className="card" id="analysis">
      <h2>Análisis de Stock</h2>
      <div className="form-group">
        <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
          <option value="">Todos los productos</option>
          {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>)}
        </select>
      </div>
      {loading ? <p>Cargando...</p> : analysis.length === 0 ? <p>No hay datos para mostrar.</p> : analysis.map(item => (
        <div key={item.sku}>
          <h3 style={{marginTop: '1rem', color: '#3498db'}}>{item.sku} - {item.name}</h3>
          {numericSizes.length > 0 && (
            <>
              <h4 style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>Talles Numéricos</h4>
              <table>
                <thead>
                  <tr><th>Talle</th><th>Stock</th><th>Producción</th><th>Pedidos</th><th>Disponible</th></tr>
                </thead>
                <tbody>
                  {item.analysis.filter(a => numericSizes.some(s => s.code === a.size)).map(a => (
                    <tr key={a.size}>
                      <td><strong>{a.size}</strong></td>
                      <td>{a.stock}</td>
                      <td>{a.production}</td>
                      <td>{a.orders}</td>
                      <td><span className={`badge ${getBadgeClass(a.available)}`}>{a.available}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {alphabeticSizes.length > 0 && (
            <>
              <h4 style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>Talles Alfabéticos</h4>
              <table>
                <thead>
                  <tr><th>Talle</th><th>Stock</th><th>Producción</th><th>Pedidos</th><th>Disponible</th></tr>
                </thead>
                <tbody>
                  {item.analysis.filter(a => alphabeticSizes.some(s => s.code === a.size)).map(a => (
                    <tr key={a.size}>
                      <td><strong>{a.size}</strong></td>
                      <td>{a.stock}</td>
                      <td>{a.production}</td>
                      <td>{a.orders}</td>
                      <td><span className={`badge ${getBadgeClass(a.available)}`}>{a.available}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <div className="summary">
            <div className="summary-item"><div className="value">{item.totals.totalStock}</div><div className="label">Stock Actual</div></div>
            <div className="summary-item"><div className="value">{item.totals.totalProduction}</div><div className="label">Producción</div></div>
            <div className="summary-item"><div className="value">{item.totals.totalOrders}</div><div className="label">Pedidos</div></div>
            <div className="summary-item"><div className="value" style={{color: item.totals.totalAvailable < 0 ? '#e74c3c' : '#27ae60'}}>{item.totals.totalAvailable}</div><div className="label">Disponible</div></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductsViewWrapper() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const showMessage = () => {}

  return <ProductsView showMessage={showMessage} onRefresh={() => setRefreshTrigger(t => t + 1)} />
}

function ProductsView({ onRefresh, showMessage }) {
  const [products, setProducts] = useState([])
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sku || !name) {
      showMessage('SKU y nombre son requeridos', 'error')
      return
    }
    try {
      if (editing) {
        await api.put(`/products/${editing}`, { name, description })
        showMessage('Producto actualizado')
      } else {
        await api.post('/products', { sku, name, description })
        showMessage('Producto agregado')
      }
      resetForm()
      loadProducts()
      onRefresh()
    } catch (err) {
      showMessage(err.response?.data?.error || 'Error al guardar', 'error')
    }
  }

  const handleEdit = (p) => {
    setEditing(p.sku)
    setSku(p.sku)
    setName(p.name)
    setDescription(p.description || '')
  }

  const handleDelete = async (sku) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await api.delete(`/products/${sku}`)
      showMessage('Producto eliminado')
      loadProducts()
      onRefresh()
    } catch (err) {
      showMessage(err.response?.data?.error || 'Error al eliminar', 'error')
    }
  }

  const resetForm = () => {
    setEditing(null)
    setSku('')
    setName('')
    setDescription('')
  }

  return (
    <div className="card" id="products">
      <h2>{editing ? 'Editar Producto' : 'Agregar Producto'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>SKU *</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ej: REM-001" disabled={editing} />
        </div>
        <div className="form-group">
          <label>Nombre *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Remera Básica" />
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional" />
        </div>
        <button type="submit" className="btn btn-success">{editing ? 'Actualizar' : 'Agregar'}</button>
        {editing && <button type="button" onClick={resetForm} className="btn" style={{marginLeft: '0.5rem'}}>Cancelar</button>}
      </form>
      <h3 style={{marginTop: '2rem'}}>Productos ({products.length})</h3>
      <table>
        <thead><tr><th>SKU</th><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p._id || p.sku}>
              <td><strong>{p.sku}</strong></td>
              <td>{p.name}</td>
              <td>{p.description || '-'}</td>
              <td>
                <button onClick={() => handleEdit(p)} className="btn" style={{padding: '0.25rem 0.5rem', marginRight: '0.5rem'}}>Editar</button>
                <button onClick={() => handleDelete(p.sku)} className="btn btn-danger" style={{padding: '0.25rem 0.5rem'}}>Eliminar</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan="4" style={{textAlign: 'center'}}>No hay productos</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function StockViewWrapper() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(console.error)
  }, [])

  return <StockView products={products} />
}

function StockView({ products }) {
  const [selectedSku, setSelectedSku] = useState('')
  const [stockData, setStockData] = useState({})
  const [message, setMessage] = useState(null)
  const allSizes = [...NUMERIC_SIZES, ...ALPHABETIC_SIZES]

  useEffect(() => {
    if (selectedSku) loadStock()
  }, [selectedSku])

  const loadStock = async () => {
    try {
      const res = await api.get(`/stock/${selectedSku}`)
      const data = {}
      res.data.forEach(s => { data[s.size] = s.quantity })
      setStockData(data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSubmit = async () => {
    if (!selectedSku) {
      showMessage('Seleccioná un producto', 'error')
      return
    }
    const items = Object.entries(stockData)
      .map(([size, quantity]) => ({ sku: selectedSku, size, quantity: parseInt(quantity) || 0 }))
      .filter(i => i.quantity > 0)
    
    if (items.length === 0) {
      showMessage('Ingresá al menos un valor', 'error')
      return
    }
    
    try {
      await api.post('/stock', { items })
      showMessage('Stock actualizado')
    } catch (err) {
      showMessage('Error al guardar', 'error')
    }
  }

  return (
    <div className="card" id="stock">
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <h2>Stock Actual</h2>
      <div className="form-group">
        <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
          <option value="">Seleccionar producto</option>
          {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>)}
        </select>
      </div>
      {selectedSku && (
        <>
          <div className="grid-sizes">
            {allSizes.map(size => (
              <div key={size} className="size-input">
                <label>{size}</label>
                <input type="number" min="0" value={stockData[size] || ''} onChange={(e) => setStockData({...stockData, [size]: e.target.value})} />
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} className="btn btn-success">Guardar Stock</button>
        </>
      )}
    </div>
  )
}

function ProductionViewWrapper() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(console.error)
  }, [])

  return <ProductionView products={products} />
}

function ProductionView({ products }) {
  const [selectedSku, setSelectedSku] = useState('')
  const [productionData, setProductionData] = useState({})
  const [message, setMessage] = useState(null)
  const allSizes = [...NUMERIC_SIZES, ...ALPHABETIC_SIZES]

  useEffect(() => {
    if (selectedSku) loadProduction()
  }, [selectedSku])

  const loadProduction = async () => {
    try {
      const res = await api.get(`/production/${selectedSku}`)
      const data = {}
      res.data.forEach(p => { data[p.size] = p.quantity })
      setProductionData(data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSubmit = async () => {
    if (!selectedSku) { showMessage('Seleccioná un producto', 'error'); return }
    const items = Object.entries(productionData)
      .map(([size, quantity]) => ({ sku: selectedSku, size, quantity: parseInt(quantity) || 0 }))
      .filter(i => i.quantity > 0)
    
    if (items.length === 0) { showMessage('Ingresá al menos un valor', 'error'); return }
    
    try {
      await api.post('/production', { items })
      showMessage('Producción registrada')
    } catch (err) { showMessage('Error al guardar', 'error') }
  }

  return (
    <div className="card" id="production">
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <h2>Producción</h2>
      <div className="form-group">
        <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
          <option value="">Seleccionar producto</option>
          {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>)}
        </select>
      </div>
      {selectedSku && (
        <>
          <div className="grid-sizes">
            {allSizes.map(size => (
              <div key={size} className="size-input">
                <label>{size}</label>
                <input type="number" min="0" value={productionData[size] || ''} onChange={(e) => setProductionData({...productionData, [size]: e.target.value})} />
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} className="btn btn-success">Guardar Producción</button>
        </>
      )}
    </div>
  )
}

function OrdersViewWrapper() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(console.error)
  }, [])

  return <OrdersView products={products} />
}

function OrdersView({ products }) {
  const [selectedSku, setSelectedSku] = useState('')
  const [clientName, setClientName] = useState('')
  const [ordersData, setOrdersData] = useState({})
  const [orders, setOrders] = useState([])
  const [message, setMessage] = useState(null)
  const allSizes = [...NUMERIC_SIZES, ...ALPHABETIC_SIZES]

  useEffect(() => {
    if (selectedSku) loadOrders()
  }, [selectedSku])

  const loadOrders = async () => {
    try {
      const res = await api.get(`/orders/${selectedSku}`)
      setOrders(res.data)
      const data = {}
      res.data.forEach(o => { data[o.size] = (data[o.size] || 0) + o.quantity })
      setOrdersData(data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSubmit = async () => {
    if (!selectedSku) { showMessage('Seleccioná un producto', 'error'); return }
    const items = Object.entries(ordersData)
      .map(([size, quantity]) => ({ sku: selectedSku, size, quantity: parseInt(quantity) || 0, clientName: clientName || 'General' }))
      .filter(i => i.quantity > 0)
    
    if (items.length === 0) { showMessage('Ingresá al menos un valor', 'error'); return }
    
    try {
      await api.post('/orders', { items })
      showMessage('Pedido registrado')
      setOrdersData({})
      setClientName('')
      loadOrders()
    } catch (err) { showMessage('Error al guardar', 'error') }
  }

  return (
    <div className="card" id="orders">
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <h2>Pedidos de Clientes</h2>
      <div className="form-group">
        <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
          <option value="">Seleccionar producto</option>
          {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>)}
        </select>
      </div>
      {selectedSku && (
        <>
          <div className="form-group">
            <label>Cliente (opcional)</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div className="grid-sizes">
            {allSizes.map(size => (
              <div key={size} className="size-input">
                <label>{size}</label>
                <input type="number" min="0" value={ordersData[size] || ''} onChange={(e) => setOrdersData({...ordersData, [size]: e.target.value})} />
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} className="btn btn-success">Registrar Pedido</button>
          {orders.length > 0 && (
            <>
              <h3 style={{marginTop: '1.5rem'}}>Pedidos ({orders.length})</h3>
              <table>
                <thead><tr><th>Cliente</th><th>Talle</th><th>Cantidad</th></tr></thead>
                <tbody>
                  {orders.map((o, i) => <tr key={i}><td>{o.clientName}</td><td>{o.size}</td><td>{o.quantity}</td></tr>)}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
