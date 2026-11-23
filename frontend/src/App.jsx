import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';

// Pages are split into their own files and downloaded the first time they are
// opened, so the login screen does not wait for the charts and every other page.
// After a new deploy, an open tab may ask for a page file that no longer exists:
// reload once to get the new version instead of showing an error.
const page = (load) =>
  lazy(() =>
    load().then((mod) => {
      try {
        sessionStorage.removeItem('mf-reloaded'); // a page loaded, so a future failure may reload again
      } catch {
        /* ignore */
      }
      return mod;
    }).catch((err) => {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem('mf-reloaded') === '1';
        sessionStorage.setItem('mf-reloaded', '1');
      } catch {
        /* storage blocked: fall through to the error */
      }
      if (!reloaded) {
        window.location.reload();
        return new Promise(() => {}); // wait for the reload
      }
      throw err;
    })
  );

const Overview = page(() => import('./pages/Overview'));
const Products = page(() => import('./pages/Products'));
const Sell = page(() => import('./pages/Sell'));
const Orders = page(() => import('./pages/Orders'));
const Sales = page(() => import('./pages/Sales'));
const Customers = page(() => import('./pages/Customers'));
const Payments = page(() => import('./pages/Payments'));
const Restock = page(() => import('./pages/Restock'));
const Suppliers = page(() => import('./pages/Suppliers'));
const Help = page(() => import('./pages/Help'));
const Upgrade = page(() => import('./pages/Upgrade'));
const Settings = page(() => import('./pages/Settings'));
const Staff = page(() => import('./pages/Staff'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="overview" element={<Overview />} />
          <Route path="products" element={<Products />} />
          <Route path="sell" element={<Sell />} />
          <Route path="orders" element={<Orders />} />
          <Route path="sales" element={<Sales />} />
          <Route path="customers" element={<Customers />} />
          <Route path="payments" element={<Payments />} />
          <Route path="restock" element={<Restock />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/help" element={<Help />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="settings" element={<Settings />} />
          <Route path="staff" element={<Staff />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
