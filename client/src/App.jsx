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
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await api.get('/dashboard')
      setMetrics(res.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="card"><p>Cargando...</p></div>

  return (
    <div className="card">
      <h2>Resumen del Sistema</h2>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="number">{metrics?.totalProducts || 0}</div>
          <div className="label">Total Productos</div>
        </div>
        <div className="dashboard-card">
          <div className="number">{metrics?.totalStock || 0}</div>
          <div className="label">Stock Total</div>
        </div>
        <div className="dashboard-card">
          <div className="number">{metrics?.totalAvailable || 0}</div>
          <div className="label">Disponible Total</div>
        </div>
        <div className="dashboard-card warning">
          <div className="number">{metrics?.productsWithLowStock || 0}</div>
          <div className="label">Stock Bajo</div>
        </div>
        <div className="dashboard-card danger">
          <div className="number">{metrics?.productsWithoutStock || 0}</div>
          <div className="label">Sin Stock</div>
        </div>
        <div className="dashboard-card">
          <div className="number">{metrics?.pendingOrders || 0}</div>
          <div className="label">Pedidos Pendientes</div>
        </div>
        <div className="dashboard-card">
          <div className="number">{metrics?.pendingProduction || 0}</div>
          <div className="label">Producción Pendiente</div>
        </div>
      </div>
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
  const [searchName, setSearchName] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadAnalysis()
    return () => { mountedRef.current = false }
  }, [selectedSku, refreshTrigger, filterType, sortBy])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      let url = '/analysis'
      const params = []
      if (selectedSku) url = `/analysis/${selectedSku}`
      if (filterType) params.push(`filter=${filterType}`)
      if (sortBy) params.push(`sortBy=${sortBy}`)
      if (params.length > 0) url += (url.includes('?') ? '&' : '?') + params.join('&')
      
      const res = await api.get(url)
      if (mountedRef.current) {
        const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : [])
        if (searchName) {
          setAnalysis(data.filter(p => p.name.toLowerCase().includes(searchName.toLowerCase())))
        } else {
          setAnalysis(data)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      if (mountedRef.current) setAnalysis([])
    }
    if (mountedRef.current) setLoading(false)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const getBadgeClass = (value, stockMin = 0) => {
    if (value === 0) return 'badge-warning'
    if (value > 0) {
      if (stockMin > 0 && value <= stockMin) return 'badge-warning'
      return 'badge-success'
    }
    return 'badge-danger'
  }

  const exportToExcel = () => {
    let csv = 'SKU,Nombre,Stock,Producción,Pedidos,Disponible,Stock Mínimo\n'
    analysis.forEach(item => {
      csv += `${item.sku},"${item.name}",${item.totals.totalStock},${item.totals.totalProduction},${item.totals.totalOrders},${item.totals.totalAvailable},${item.stockMin || 0}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analisis_stock_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const numericSizes = sizes.filter(s => s.type === 'numeric')
  const alphabeticSizes = sizes.filter(s => s.type === 'alphabetic')

  return (
    <div className="card" id="analysis">
      <h2>Análisis de Stock</h2>
      <div className="filters-row">
        <input 
          type="text" 
          placeholder="Buscar por nombre..." 
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          style={{flex: 2}}
        />
        <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} style={{flex: 1}}>
          <option value="">Todos los productos</option>
          {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{flex: 1}}>
          <option value="">Sin filtro</option>
          <option value="lowStock">Stock bajo</option>
          <option value="noStock">Sin stock</option>
          <option value="negative">Stock negativo</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{flex: 1}}>
          <option value="">Sin ordenar</option>
          <option value="name">Ordenar por nombre</option>
          <option value="stock">Ordenar por stock</option>
          <option value="available">Ordenar por disponible</option>
        </select>
        <button onClick={exportToExcel} className="btn btn-export">Exportar Excel</button>
      </div>
      {loading ? <p>Cargando...</p> : analysis.length === 0 ? <p>No hay datos para mostrar.</p> : analysis.map(item => (
        <div key={item.sku}>
          <h3 style={{marginTop: '1rem', color: '#3498db'}}>
            {item.sku} - {item.name}
            {item.stockMin > 0 && item.totals.totalAvailable <= item.stockMin && (
              <span className="alert-low-stock" style={{marginLeft: '0.5rem'}}>Stock bajo</span>
            )}
            {item.totals.totalStock === 0 && (
              <span className="alert-no-stock" style={{marginLeft: '0.5rem'}}>Sin stock</span>
            )}
          </h3>
          {numericSizes.length > 0 && (
            <>
              <h4 style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>Talles Numéricos</h4>
              <table>
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('size')}>Talle {sortField === 'size' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="sortable" onClick={() => handleSort('stock')}>Stock {sortField === 'stock' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="sortable" onClick={() => handleSort('production')}>Producción {sortField === 'production' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="sortable" onClick={() => handleSort('orders')}>Pedidos {sortField === 'orders' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="sortable" onClick={() => handleSort('available')}>Disponible {sortField === 'available' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.analysis.filter(a => numericSizes.some(s => s.code === a.size)).map(a => (
                    <tr key={a.size}>
                      <td><strong>{a.size}</strong></td>
                      <td>{a.stock}</td>
                      <td>{a.production}</td>
                      <td>{a.orders}</td>
                      <td><span className={`badge ${getBadgeClass(a.available, item.stockMin)}`}>{a.available}</span></td>
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
                      <td><span className={`badge ${getBadgeClass(a.available, item.stockMin)}`}>{a.available}</span></td>
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
  const [stockMin, setStockMin] = useState(0)
  const [category, setCategory] = useState('General')
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
        await api.put(`/products/${editing}`, { name, description, stockMin, category })
        showMessage('Producto actualizado')
      } else {
        await api.post('/products', { sku, name, description, stockMin, category })
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
    setStockMin(p.stockMin || 0)
    setCategory(p.category || 'General')
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
    setStockMin(0)
    setCategory('General')
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
        <div className="form-group">
          <label>Stock Mínimo (alerta)</label>
          <input type="number" min="0" value={stockMin} onChange={(e) => setStockMin(parseInt(e.target.value) || 0)} placeholder="Cantidad mínima" />
        </div>
        <div className="form-group">
          <label>Categoría</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Remeras, Pantalones" list="categories" />
          <datalist id="categories">
            <option value="Remeras" />
            <option value="Pantalones" />
            <option value="Camperas" />
            <option value="Buzos" />
            <option value="General" />
          </datalist>
        </div>
        <button type="submit" className="btn btn-success">{editing ? 'Actualizar' : 'Agregar'}</button>
        {editing && <button type="button" onClick={resetForm} className="btn" style={{marginLeft: '0.5rem'}}>Cancelar</button>}
      </form>
      <h3 style={{marginTop: '2rem'}}>Productos ({products.length})</h3>
      <table>
        <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Stock Mín</th><th>Acciones</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p._id || p.sku}>
              <td><strong>{p.sku}</strong></td>
              <td>{p.name}</td>
              <td>{p.category || 'General'}</td>
              <td>{p.stockMin || 0}</td>
              <td>
                <button onClick={() => handleEdit(p)} className="btn" style={{padding: '0.25rem 0.5rem', marginRight: '0.5rem'}}>Editar</button>
                <button onClick={() => handleDelete(p.sku)} className="btn btn-danger" style={{padding: '0.25rem 0.5rem'}}>Eliminar</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan="5" style={{textAlign: 'center'}}>No hay productos</td></tr>}
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
  const [productionList, setProductionList] = useState([])
  const [message, setMessage] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const allSizes = [...NUMERIC_SIZES, ...ALPHABETIC_SIZES]

  useEffect(() => {
    if (selectedSku) {
      loadProduction()
      loadProductionList()
    }
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

  const loadProductionList = async () => {
    try {
      const res = await api.get(`/production/${selectedSku}`)
      let filtered = res.data
      
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        filtered = filtered.filter(p => new Date(p.date) >= from)
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        filtered = filtered.filter(p => new Date(p.date) <= to)
      }
      
      setProductionList(filtered)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  useEffect(() => {
    if (selectedSku) loadProductionList()
  }, [dateFrom, dateTo])

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
      setProductionData({})
      loadProductionList()
    } catch (err) { showMessage('Error al guardar', 'error') }
  }

  const addToStock = async (prod) => {
    try {
      await api.put(`/production/${prod._id}/add-to-stock`)
      showMessage('Agregado al stock')
      loadProductionList()
    } catch (err) { showMessage('Error al agregar', 'error') }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR')
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
          
          {productionList.length > 0 && (
            <>
              <h3 style={{marginTop: '1.5rem'}}>Filtros por fecha</h3>
              <div className="filters-row">
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Desde"
                />
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
              <h3 style={{marginTop: '1rem'}}>Producción Registrada ({productionList.length})</h3>
              <table>
                <thead><tr><th>Talle</th><th>Cantidad</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {productionList.map((p) => (
                    <tr key={p._id}>
                      <td>{p.size}</td>
                      <td>{p.quantity}</td>
                      <td>{formatDate(p.date)}</td>
                      <td>
                        <span className={`badge ${p.addedToStock ? 'badge-success' : 'badge-warning'}`}>
                          {p.addedToStock ? 'En Stock' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        {!p.addedToStock && (
                          <button 
                            onClick={() => addToStock(p)} 
                            className="btn btn-success"
                            style={{padding: '0.25rem 0.5rem'}}
                          >
                            Agregar a Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
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
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const allSizes = [...NUMERIC_SIZES, ...ALPHABETIC_SIZES]

  useEffect(() => {
    if (selectedSku) loadOrders()
  }, [selectedSku])

  useEffect(() => {
    if (selectedSku) loadOrders()
  }, [filterClient, filterStatus])

  const loadOrders = async () => {
    try {
      const res = await api.get(`/orders/${selectedSku}`)
      let filteredOrders = res.data
      
      if (filterClient) {
        filteredOrders = filteredOrders.filter(o => 
          o.clientName.toLowerCase().includes(filterClient.toLowerCase())
        )
      }
      if (filterStatus) {
        filteredOrders = filteredOrders.filter(o => o.status === filterStatus)
      }
      
      setOrders(filteredOrders)
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

  const toggleOrderStatus = async (order) => {
    try {
      const newStatus = order.status === 'pendiente' ? 'entregado' : 'pendiente'
      await api.put(`/orders/${order._id}`, { status: newStatus })
      showMessage(newStatus === 'entregado' ? 'Pedido entregado' : 'Pedido marcado como pendiente')
      loadOrders()
    } catch (err) { showMessage('Error al actualizar', 'error') }
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
              <h3 style={{marginTop: '1.5rem'}}>Filtros</h3>
              <div className="filters-row">
                <input 
                  type="text" 
                  placeholder="Buscar por cliente..." 
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="entregado">Entregados</option>
                </select>
              </div>
              <h3 style={{marginTop: '1rem'}}>Pedidos ({orders.length})</h3>
              <table>
                <thead><tr><th>Cliente</th><th>Talle</th><th>Cantidad</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td>{o.clientName}</td>
                      <td>{o.size}</td>
                      <td>{o.quantity}</td>
                      <td>
                        <span className={`badge ${o.status === 'pendiente' ? 'badge-warning' : 'badge-success'}`}>
                          {o.status === 'pendiente' ? 'Pendiente' : 'Entregado'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => toggleOrderStatus(o)} 
                          className={`btn ${o.status === 'pendiente' ? 'btn-success' : ''}`}
                          style={{padding: '0.25rem 0.5rem'}}
                        >
                          {o.status === 'pendiente' ? 'Marcar Entregado' : 'Marcar Pendiente'}
                        </button>
                      </td>
                    </tr>
                  ))}
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
