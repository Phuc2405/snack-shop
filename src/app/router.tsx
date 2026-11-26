import { createBrowserRouter } from 'react-router-dom';
import { RootLayout, ShopLayout } from './layouts';
import { lazyPage } from './lazyPage';
import HomePage from '@/pages/HomePage';
import { NotFoundPage, RouteError } from '@/pages/NotFoundPage';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { DEMO } from '@/lib/demo';
import { DemoAdminNotice } from '@/pages/admin/DemoAdminNotice';

// Trang chủ (menu) nằm trong bundle đầu để hiện nhanh nhất; các trang khác tách chunk theo route.
// Khách không bao giờ tải code trang quản lý.
const CheckoutPage = lazyPage(() => import('@/pages/CheckoutPage'));
const OrdersPage = lazyPage(() => import('@/pages/OrdersPage'));
const OrderPage = lazyPage(() => import('@/pages/OrderPage'));
const LoginPage = lazyPage(() => import('@/pages/admin/LoginPage'));
const DashboardPage = lazyPage(() => import('@/pages/admin/DashboardPage'));
const ProductsPage = lazyPage(() => import('@/pages/admin/ProductsPage'));
const SettingsPage = lazyPage(() => import('@/pages/admin/SettingsPage'));
const ReportPage = lazyPage(() => import('@/pages/admin/ReportPage'));

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ShopLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'checkout', element: <CheckoutPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: 'admin/login', element: DEMO ? <DemoAdminNotice /> : <LoginPage /> },
      {
        path: 'admin',
        element: DEMO ? <DemoAdminNotice /> : <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'report', element: <ReportPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
