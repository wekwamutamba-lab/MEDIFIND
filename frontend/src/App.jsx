import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Find from './pages/Find';
import Overview from './pages/Overview';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/find" element={<Find />} />
        <Route element={<Layout />}>
          <Route path="overview" element={<Overview />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="sales" element={<Sales />} />
          <Route path="customers" element={<Customers />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
